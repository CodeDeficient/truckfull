import { randomHex } from './secureRandom';

export interface CheckpointLock {
  readonly key: string;
  readonly token: string;
}

export type CheckpointStatus = 'running' | 'partial' | 'completed';

export interface PipelineCheckpoint {
  readonly runId: string;
  readonly status: CheckpointStatus;
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly completedCities: readonly string[];
  readonly syncCompletedSources: readonly string[];
  readonly ingestionComplete: boolean;
  readonly lastError?: string;
}

export interface CheckpointStore {
  load(): Promise<PipelineCheckpoint | null>;
  save(checkpoint: PipelineCheckpoint): Promise<void>;
  clear(): Promise<void>;
  saveIfOwned(checkpoint: PipelineCheckpoint, lock: CheckpointLock): Promise<boolean>;
  clearIfOwned(lock: CheckpointLock): Promise<boolean>;
}

export interface ResumePlan {
  readonly runId: string;
  readonly skipCities: ReadonlySet<string>;
  readonly skipSyncSources: ReadonlySet<string>;
  readonly ingestionComplete: boolean;
}

export function createRunId(now: number): string {
  const suffix = randomHex(4);
  return `${new Date(now).toISOString()}-${suffix}`;
}

export function createCheckpoint(runId: string, now: number): PipelineCheckpoint {
  return {
    runId,
    status: 'running',
    startedAt: now,
    updatedAt: now,
    completedCities: [],
    syncCompletedSources: [],
    ingestionComplete: false,
  };
}

export function recordCityCompleted(
  checkpoint: PipelineCheckpoint,
  cityKey: string,
  now: number,
): PipelineCheckpoint {
  if (checkpoint.completedCities.includes(cityKey)) {
    return { ...checkpoint, updatedAt: now };
  }
  return {
    ...checkpoint,
    updatedAt: now,
    completedCities: [...checkpoint.completedCities, cityKey],
  };
}

export function recordSyncSourceCompleted(
  checkpoint: PipelineCheckpoint,
  source: string,
  now: number,
): PipelineCheckpoint {
  if (checkpoint.syncCompletedSources.includes(source)) {
    return { ...checkpoint, updatedAt: now };
  }
  return {
    ...checkpoint,
    updatedAt: now,
    syncCompletedSources: [...checkpoint.syncCompletedSources, source],
  };
}

export function markIngestionComplete(
  checkpoint: PipelineCheckpoint,
  now: number,
): PipelineCheckpoint {
  return { ...checkpoint, ingestionComplete: true, updatedAt: now };
}

export function markPartial(
  checkpoint: PipelineCheckpoint,
  now: number,
  lastError?: string,
): PipelineCheckpoint {
  return { ...checkpoint, status: 'partial', updatedAt: now, lastError };
}

export function markCompleted(checkpoint: PipelineCheckpoint, now: number): PipelineCheckpoint {
  return { ...checkpoint, status: 'completed', updatedAt: now };
}

export function planResume(
  checkpoint: PipelineCheckpoint | null,
  now: number,
  maxAgeMs: number,
): ResumePlan | null {
  if (!checkpoint) return null;
  if (checkpoint.status === 'completed') return null;
  if (now - checkpoint.updatedAt > maxAgeMs) return null;

  return {
    runId: checkpoint.runId,
    skipCities: new Set(checkpoint.completedCities),
    skipSyncSources: new Set(checkpoint.syncCompletedSources),
    ingestionComplete: checkpoint.ingestionComplete,
  };
}

const CHECKPOINT_KEY = 'pipeline:checkpoint:v1';
const CHECKPOINT_TTL_SECONDS = 7 * 24 * 60 * 60;

interface RedisCheckpointClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}

const SAVE_IF_OWNED = "if redis.call('get', KEYS[1]) ~= ARGV[1] then return 0 end redis.call('set', KEYS[2], ARGV[2], 'EX', ARGV[3]) return 1";
const CLEAR_IF_OWNED = "if redis.call('get', KEYS[1]) ~= ARGV[1] then return 0 end redis.call('del', KEYS[2]) return 1";

function isPipelineCheckpoint(value: unknown): value is PipelineCheckpoint {
  if (!value || typeof value !== 'object') return false;
  const checkpoint = value as Record<string, unknown>;
  return (
    typeof checkpoint.runId === 'string' &&
    checkpoint.runId.length > 0 &&
    (checkpoint.status === 'running' ||
      checkpoint.status === 'partial' ||
      checkpoint.status === 'completed') &&
    typeof checkpoint.startedAt === 'number' &&
    Number.isFinite(checkpoint.startedAt) &&
    typeof checkpoint.updatedAt === 'number' &&
    Number.isFinite(checkpoint.updatedAt) &&
    Array.isArray(checkpoint.completedCities) &&
    checkpoint.completedCities.every((city: unknown) => typeof city === 'string') &&
    Array.isArray(checkpoint.syncCompletedSources) &&
    checkpoint.syncCompletedSources.every((source: unknown) => typeof source === 'string') &&
    typeof checkpoint.ingestionComplete === 'boolean' &&
    (checkpoint.lastError === undefined || typeof checkpoint.lastError === 'string')
  );
}

export function createRedisCheckpointStore(
  client: RedisCheckpointClient,
  key: string = CHECKPOINT_KEY,
): CheckpointStore {
  return {
    async load(): Promise<PipelineCheckpoint | null> {
      const stored = await client.get<unknown>(key);
      if (stored === null) return null;
      if (!isPipelineCheckpoint(stored)) throw new Error('Invalid pipeline checkpoint');
      return stored;
    },
    async save(checkpoint: PipelineCheckpoint): Promise<void> {
      await client.set(key, checkpoint, { ex: CHECKPOINT_TTL_SECONDS });
    },
    async clear(): Promise<void> {
      await client.del(key);
    },
    async saveIfOwned(checkpoint: PipelineCheckpoint, lock: CheckpointLock): Promise<boolean> {
      return Number(await client.eval(SAVE_IF_OWNED, [lock.key, key], [lock.token, JSON.stringify(checkpoint), String(CHECKPOINT_TTL_SECONDS)])) === 1;
    },
    async clearIfOwned(lock: CheckpointLock): Promise<boolean> {
      return (await client.eval(CLEAR_IF_OWNED, [lock.key, key], [lock.token])) !== 0;
    },
  };
}
