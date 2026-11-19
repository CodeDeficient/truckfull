import {
  runResumablePipeline,
  type IngestionStageFn,
  type SyncStageFn,
} from './orchestrator';
import type { PipelineRunResult } from './orchestrator';
import {
  createShutdownController,
  installShutdownSignals,
  type SignalSource,
} from './gracefulShutdown';
import {
  createUpstashCheckpointStore,
  createUpstashLockStore,
  type UpstashPipelineClient,
} from './upstashStores';
import type { EventCacheInvalidator } from '@/lib/events/eventCacheTargets';

export interface PipelineRuntimeOptions {
  readonly redis: UpstashPipelineClient;
  readonly signals: SignalSource;
  readonly runIngestionStage: IngestionStageFn;
  readonly runSyncStage: SyncStageFn;
  readonly invalidate?: EventCacheInvalidator;
  readonly alertFailure?: (jobName: string, message: string) => Promise<unknown>;
  readonly now?: () => number;
  readonly lockTtlSeconds?: number;
  readonly maxCheckpointAgeMs?: number;
  readonly signalsToHandle?: readonly string[];
}

export interface PipelineRuntime {
  run(): Promise<PipelineRunResult>;
}

export function createPipelineRuntime(options: PipelineRuntimeOptions): PipelineRuntime {
  return {
    async run(): Promise<PipelineRunResult> {
      const shutdown = createShutdownController();
      const uninstall = installShutdownSignals(
        shutdown,
        options.signals,
        options.signalsToHandle,
      );
      try {
        return await runResumablePipeline({
          lockStore: createUpstashLockStore(options.redis),
          checkpoints: createUpstashCheckpointStore(options.redis),
          shutdown,
          runIngestionStage: options.runIngestionStage,
          runSyncStage: options.runSyncStage,
          invalidate: options.invalidate,
          alertFailure: options.alertFailure,
          now: options.now,
          lockTtlSeconds: options.lockTtlSeconds,
          maxCheckpointAgeMs: options.maxCheckpointAgeMs,
        });
      } finally {
        uninstall();
      }
    },
  };
}
