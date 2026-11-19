import { describe, expect, it } from '@jest/globals';
import { createShutdownController } from '@/lib/pipeline/gracefulShutdown';
import { runResumablePipeline } from '@/lib/pipeline/orchestrator';
import { createCheckpoint, markIngestionComplete, recordCityCompleted } from '@/lib/pipeline/checkpointStore';
import type { PipelineCheckpoint, CheckpointStore } from '@/lib/pipeline/checkpointStore';
import type { PipelineLockStore } from '@/lib/pipeline/pipelineLock';

function createStores(initial: PipelineCheckpoint | null = null): {
  locks: PipelineLockStore;
  checkpoints: CheckpointStore;
} {
  let owner: string | null = null;
  let checkpoint = initial;
  return {
    locks: {
      async set(_key, value) {
        if (owner) return null;
        owner = value;
        return 'OK';
      },
      async eval(script, _keys, args) {
        if (owner !== args[0]) return 0;
        if (script.includes('del')) owner = null;
        return 1;
      },
    },
    checkpoints: {
      async load() { return checkpoint; },
      async save(value) { checkpoint = value; },
      async clear() { checkpoint = null; },
      async saveIfOwned(value, lock) {
        if (owner !== lock.token) return false;
        checkpoint = value;
        return true;
      },
      async clearIfOwned(lock) {
        if (owner !== lock.token) return false;
        checkpoint = null;
        return true;
      },
    },
  };
}

describe('resumable pipeline', () => {
  it('resumes after completed cities and runs only pending work', async () => {
    const previous = recordCityCompleted(createCheckpoint('run-1', 100), 'augusta', 200);
    const { locks, checkpoints } = createStores(previous);
    const cities: string[] = [];
    const result = await runResumablePipeline({
      lockStore: locks,
      checkpoints,
      shutdown: createShutdownController(),
      now: () => 300,
      async runIngestionStage(_invalidate, hooks) {
        cities.push(...hooks.skipCities);
        await hooks.onCityCompleted('savannah', { errors: 0 });
        return { success: true, errors: 0 };
      },
      async runSyncStage() { return { totalErrors: 0 }; },
    });
    expect(result.outcome).toBe('completed');
    expect(result.runId).toBe('run-1');
    expect(cities).toEqual(['augusta']);
    expect(await checkpoints.load()).toBeNull();
  });

  it('does not record a failed city as completed so it is retried later', async () => {
    const { locks, checkpoints } = createStores();
    let saved: PipelineCheckpoint | null = null;
    const result = await runResumablePipeline({
      lockStore: locks,
      checkpoints: {
        ...checkpoints,
        async saveIfOwned(value, lock) {
          saved = value;
          return checkpoints.saveIfOwned(value, lock);
        },
      },
      shutdown: createShutdownController(),
      now: () => 300,
      async runIngestionStage(_invalidate, hooks) {
        await hooks.onCityCompleted('good', { errors: 0 });
        await hooks.onCityCompleted('bad', { errors: 1, error: 'provider down' });
        return { success: false, errors: 1 };
      },
      async runSyncStage() { return { totalErrors: 0 }; },
    });
    expect(result.outcome).toBe('failed');
    expect(saved?.completedCities).toEqual(['good']);
  });

  it('syncs and alerts when only individual cities failed', async () => {
    const { locks, checkpoints } = createStores();
    const alerts: string[] = [];
    let synced = false;
    const result = await runResumablePipeline({
      lockStore: locks,
      checkpoints,
      shutdown: createShutdownController(),
      now: () => 300,
      async alertFailure(_job, message) {
        alerts.push(message);
      },
      async runIngestionStage(_invalidate, hooks) {
        await hooks.onCityCompleted('good', { errors: 0 });
        await hooks.onCityCompleted('bad', { errors: 1, error: 'provider down' });
        return { success: false, errors: 1, failedCities: ['bad'], stepErrors: 0 };
      },
      async runSyncStage() {
        synced = true;
        return { totalErrors: 0 };
      },
    });
    expect(result.outcome).toBe('completed');
    expect(synced).toBe(true);
    expect(alerts).toEqual(['Ingestion skipped 1 failing cities: bad']);
  });

  it('stops before sync when a post-ingestion step failed', async () => {
    const { locks, checkpoints } = createStores();
    let synced = false;
    const result = await runResumablePipeline({
      lockStore: locks,
      checkpoints,
      shutdown: createShutdownController(),
      now: () => 300,
      async runIngestionStage() {
        return { success: false, errors: 1, failedCities: [], stepErrors: 1 };
      },
      async runSyncStage() {
        synced = true;
        return { totalErrors: 0 };
      },
    });
    expect(result.outcome).toBe('failed');
    expect(synced).toBe(false);
  });

  it.each([
    ['resumes', 'an hour old', 60 * 60 * 1000, ['augusta']],
    ['starts fresh', 'a day old', 24 * 60 * 60 * 1000, []],
  ])('%s from a checkpoint %s with the default age limit', async (_verb, _age, ageMs, skipped) => {
    const start = 1_000_000_000;
    const previous = recordCityCompleted(createCheckpoint('run-1', start), 'augusta', start);
    const { locks, checkpoints } = createStores(previous);
    const cities: string[] = [];
    await runResumablePipeline({
      lockStore: locks,
      checkpoints,
      shutdown: createShutdownController(),
      now: () => start + ageMs,
      async runIngestionStage(_invalidate, hooks) {
        cities.push(...hooks.skipCities);
        return { success: true, errors: 0 };
      },
      async runSyncStage() {
        return { totalErrors: 0 };
      },
    });
    expect(cities).toEqual(skipped);
  });

  it('resumes sync without re-running a completed ingestion stage', async () => {
    const previous = markIngestionComplete(createCheckpoint('run-1', 100), 200);
    const { locks, checkpoints } = createStores(previous);
    const result = await runResumablePipeline({
      lockStore: locks,
      checkpoints,
      shutdown: createShutdownController(),
      now: () => 300,
      async runIngestionStage() { throw new Error('ingestion repeated'); },
      async runSyncStage() { return { totalErrors: 0 }; },
    });
    expect(result.outcome).toBe('completed');
  });
});
