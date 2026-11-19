import { describe, it, expect } from '@jest/globals';
import { runProductionSyncStage } from '@/lib/pipeline/productionSync';
import type { SyncResult } from '@/lib/events/externalEventSync';

function okResult(synced: number): SyncResult {
  return {
    synced,
    errors: 0,
    dryRun: false,
    duration_ms: 1,
    lastSyncedAt: new Date(0).toISOString(),
  };
}

function failedResult(errors: number): SyncResult {
  return {
    synced: 0,
    errors,
    dryRun: false,
    duration_ms: 1,
    lastSyncedAt: new Date(0).toISOString(),
  };
}

const clients = {
  staging: {} as never,
  prod: {} as never,
};

describe('runProductionSyncStage', () => {
  it('processes sources in order and reports the aggregated result', async () => {
    const calls: string[] = [];
    const result = await runProductionSyncStage({
      ...clients,
      sources: ['a', 'b', 'c'],
      async syncSource(source) {
        calls.push(source);
        return okResult(2);
      },
    });

    expect(calls).toEqual(['a', 'b', 'c']);
    expect(result.synced).toBe(6);
    expect(result.totalErrors).toBe(0);
    expect(result.processedSources).toEqual(['a', 'b', 'c']);
  });

  it('skips sources recorded by a previous interrupted run without calling sync', async () => {
    const calls: string[] = [];
    const result = await runProductionSyncStage({
      ...clients,
      sources: ['done', 'pending'],
      skipSources: new Set(['done']),
      async syncSource(source) {
        calls.push(source);
        return okResult(1);
      },
    });

    expect(calls).toEqual(['pending']);
    expect(result.skippedSources).toEqual(['done']);
    expect(result.synced).toBe(1);
  });

  it('checkpoints only clean sources so failed ones are retried', async () => {
    const completed: string[] = [];
    const result = await runProductionSyncStage({
      ...clients,
      sources: ['good', 'bad'],
      async syncSource(source) {
        return source === 'good' ? okResult(1) : failedResult(2);
      },
      onSourceCompleted: (source) => {
        completed.push(source);
      },
    });

    expect(completed).toEqual(['good']);
    expect(result.totalErrors).toBe(2);
  });

  it('counts a queue persistence failure as a single error', async () => {
    const result = await runProductionSyncStage({
      ...clients,
      sources: ['idle'],
      async syncSource() {
        return { ...okResult(0), queuePersistenceError: true };
      },
    });

    expect(result.totalErrors).toBe(1);
  });

  it('records a thrown sync as an error instead of aborting the stage', async () => {
    const result = await runProductionSyncStage({
      ...clients,
      sources: ['boom', 'after'],
      async syncSource(source) {
        if (source === 'boom') throw new Error('network down');
        return okResult(1);
      },
    });

    expect(result.totalErrors).toBe(1);
    expect(result.processedSources).toEqual(['boom', 'after']);
    expect(result.synced).toBe(1);
  });
});
