import { acquirePipelineLock, type PipelineLockStore } from './pipelineLock';
import {
  createCheckpoint,
  createRunId,
  markCompleted,
  markIngestionComplete,
  markPartial,
  planResume,
  recordCityCompleted,
  recordSyncSourceCompleted,
  type CheckpointStore,
  type PipelineCheckpoint,
} from './checkpointStore';
import { delayWithAbort, type ShutdownController } from './gracefulShutdown';
import type { EventCacheInvalidator } from '@/lib/events/eventCacheTargets';

export const PIPELINE_LOCK_KEY = 'pipeline:lock:v1';
export const DEFAULT_LOCK_TTL_SECONDS = 30 * 60;
export const DEFAULT_MAX_CHECKPOINT_AGE_MS = 20 * 60 * 60 * 1000;

export interface IngestionStageResult {
  readonly success: boolean;
  readonly errors: number;
  readonly interrupted?: boolean;
  readonly failedCities?: readonly string[];
  readonly stepErrors?: number;
}

export interface SyncStageResult {
  readonly totalErrors: number;
}

export interface IngestionCityOutcome {
  readonly errors: number;
  readonly error?: string;
}

export interface IngestionStageHooks {
  readonly skipCities: ReadonlySet<string>;
  readonly shouldStop: () => boolean;
  readonly onCityCompleted: (city: string, result: IngestionCityOutcome) => void | Promise<void>;
  readonly delay: (ms: number) => Promise<void>;
}

export type IngestionStageFn = (
  invalidate: EventCacheInvalidator | undefined,
  hooks: IngestionStageHooks,
) => Promise<IngestionStageResult>;

export type SyncStageFn = (options: {
  readonly skipSources: ReadonlySet<string>;
  readonly onSourceCompleted: (source: string) => void | Promise<void>;
}) => Promise<SyncStageResult>;

export interface PipelineOrchestratorDeps {
  readonly lockStore: PipelineLockStore;
  readonly checkpoints: CheckpointStore;
  readonly shutdown: ShutdownController;
  readonly runIngestionStage: IngestionStageFn;
  readonly runSyncStage: SyncStageFn;
  readonly invalidate?: EventCacheInvalidator;
  readonly alertFailure?: (jobName: string, message: string) => Promise<unknown>;
  readonly now?: () => number;
  readonly lockTtlSeconds?: number;
  readonly maxCheckpointAgeMs?: number;
  readonly onProgress?: (checkpoint: PipelineCheckpoint) => void | Promise<void>;
}

export type PipelineOutcome = 'completed' | 'interrupted' | 'failed' | 'locked';

export interface PipelineRunResult {
  readonly outcome: PipelineOutcome;
  readonly runId: string | null;
  readonly errors: number;
  readonly message?: string;
  readonly checkpoint: PipelineCheckpoint | null;
}

class LockLostError extends Error {
  constructor() {
    super('Pipeline lock was lost to another run');
    this.name = 'LockLostError';
  }
}

export async function runResumablePipeline(
  deps: PipelineOrchestratorDeps,
): Promise<PipelineRunResult> {
  const now = deps.now ?? (() => Date.now());
  const lockTtl = deps.lockTtlSeconds ?? DEFAULT_LOCK_TTL_SECONDS;
  const maxAge = deps.maxCheckpointAgeMs ?? DEFAULT_MAX_CHECKPOINT_AGE_MS;

  const lock = await acquirePipelineLock({
    store: deps.lockStore,
    key: PIPELINE_LOCK_KEY,
    ttlSeconds: lockTtl,
  });
  if (!lock) {
    return {
      outcome: 'locked',
      runId: null,
      errors: 0,
      message: 'Another pipeline run holds the lock',
      checkpoint: null,
    };
  }

  let checkpoint: PipelineCheckpoint | null = null;
  try {
    const existing = await deps.checkpoints.load();
    const plan = planResume(existing, now(), maxAge);
    const runId = plan?.runId ?? createRunId(now());
    checkpoint = plan ? { ...existing! } : createCheckpoint(runId, now());

    const ensureLease = async (): Promise<void> => {
      if (!lock.isHeld() || !(await lock.renew())) throw new LockLostError();
    };
    const persist = async (next: PipelineCheckpoint): Promise<void> => {
      if (!(await deps.checkpoints.saveIfOwned(next, lock))) throw new LockLostError();
      checkpoint = next;
      await deps.onProgress?.(next);
      await ensureLease();
    };

    return await executeStages(deps, checkpoint, plan, persist, ensureLease, () =>
      deps.checkpoints.clearIfOwned(lock),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown pipeline error';
    await deps.alertFailure?.('cloudflare-pipeline', message);
    return {
      outcome: 'failed',
      runId: checkpoint?.runId ?? null,
      errors: 1,
      message,
      checkpoint,
    };
  } finally {
    await lock.release().catch(() => false);
  }
}

async function executeStages(
  deps: PipelineOrchestratorDeps,
  initialCheckpoint: PipelineCheckpoint,
  plan: ReturnType<typeof planResume>,
  persist: (checkpoint: PipelineCheckpoint) => Promise<void>,
  ensureLease: () => Promise<void>,
  clearIfOwned: () => Promise<boolean>,
): Promise<PipelineRunResult> {
  const now = deps.now ?? (() => Date.now());
  let checkpoint = initialCheckpoint;

  if (!checkpoint.ingestionComplete) {
    const skipCities = plan?.skipCities ?? new Set<string>();
    const ingestion = await deps.runIngestionStage(deps.invalidate, {
      skipCities,
      shouldStop: () => deps.shutdown.requested,
      onCityCompleted: async (city, result) => {
        if (result.errors > 0 || result.error) return;
        checkpoint = recordCityCompleted(checkpoint, city, now());
        await persist(checkpoint);
      },
      delay: async (ms) => {
        await delayWithAbort(ms, deps.shutdown.signal);
      },
    });
    await ensureLease();

    if (ingestion.interrupted || deps.shutdown.requested) {
      return {
        outcome: 'interrupted',
        runId: checkpoint.runId,
        errors: ingestion.errors,
        message: 'Shutdown requested during ingestion',
        checkpoint: await savePartial(checkpoint, now(), persist),
      };
    }

    const stepErrors = ingestion.stepErrors ?? (ingestion.success ? 0 : ingestion.errors);
    if (stepErrors > 0) {
      const message = `Ingestion completed with ${ingestion.errors} errors`;
      checkpoint = markPartial(checkpoint, now(), message);
      await persist(checkpoint);
      await deps.alertFailure?.('cloudflare-pipeline-ingestion', message);
      return {
        outcome: 'failed',
        runId: checkpoint.runId,
        errors: ingestion.errors,
        message,
        checkpoint,
      };
    }

    const failedCities = ingestion.failedCities ?? [];
    if (failedCities.length > 0) {
      await deps.alertFailure?.(
        'cloudflare-pipeline-ingestion',
        `Ingestion skipped ${failedCities.length} failing cities: ${failedCities.join(', ')}`,
      );
    }

    checkpoint = markIngestionComplete(checkpoint, now());
    await persist(checkpoint);
  }

  const sync = await deps.runSyncStage({
    skipSources: new Set(checkpoint.syncCompletedSources),
    onSourceCompleted: async (source) => {
      checkpoint = recordSyncSourceCompleted(checkpoint, source, now());
      await persist(checkpoint);
    },
  });
  await ensureLease();

  if (deps.shutdown.requested) {
    return {
      outcome: 'interrupted',
      runId: checkpoint.runId,
      errors: sync.totalErrors,
      message: 'Shutdown requested during production sync',
      checkpoint: await savePartial(checkpoint, now(), persist),
    };
  }

  if (sync.totalErrors > 0) {
    const message = `Production sync completed with ${sync.totalErrors} errors`;
    checkpoint = markPartial(checkpoint, now(), message);
    await persist(checkpoint);
    await deps.alertFailure?.('cloudflare-pipeline-sync', message);
    return {
      outcome: 'failed',
      runId: checkpoint.runId,
      errors: sync.totalErrors,
      message,
      checkpoint,
    };
  }

  checkpoint = markCompleted(checkpoint, now());
  if (!(await clearIfOwned())) throw new LockLostError();
  return {
    outcome: 'completed',
    runId: checkpoint.runId,
    errors: 0,
    checkpoint,
  };
}

async function savePartial(
  checkpoint: PipelineCheckpoint,
  now: number,
  persist: (checkpoint: PipelineCheckpoint) => Promise<void>,
): Promise<PipelineCheckpoint> {
  const partial = markPartial(checkpoint, now, 'Shutdown requested');
  await persist(partial);
  return partial;
}
