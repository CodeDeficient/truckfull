import { describe, expect, it } from '@jest/globals';
import { createShutdownController } from '@/lib/pipeline/gracefulShutdown';
import { runResumablePipeline } from '@/lib/pipeline/orchestrator';
import type { CheckpointStore, PipelineCheckpoint } from '@/lib/pipeline/checkpointStore';
import type { PipelineLockStore } from '@/lib/pipeline/pipelineLock';

interface LeaseFixture {
  readonly lockStore: PipelineLockStore;
  readonly checkpoints: CheckpointStore;
  owner(): string | null;
  steal(nextOwner: string): void;
}

function createLeaseFixture(): LeaseFixture {
  let owner: string | null = null;
  let checkpoint: PipelineCheckpoint | null = null;

  return {
    owner: () => owner,
    steal(nextOwner) {
      owner = nextOwner;
    },
    lockStore: {
      async set(_key, value) {
        if (owner) return null;
        owner = value;
        return 'OK';
      },
      async eval(_script, _keys, args) {
        return owner === args[0] ? 1 : 0;
      },
    },
    checkpoints: {
      async load() {
        return checkpoint;
      },
      async save(value) {
        checkpoint = value;
      },
      async clear() {
        checkpoint = null;
      },
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

describe('pipeline lease safety', () => {
  it('refuses to complete when the lease is lost during the last sync source', async () => {
    const fixture = createLeaseFixture();

    const result = await runResumablePipeline({
      lockStore: fixture.lockStore,
      checkpoints: fixture.checkpoints,
      shutdown: createShutdownController(),
      async runIngestionStage() {
        return { success: true, errors: 0 };
      },
      async runSyncStage() {
        fixture.steal('another-run');
        return { totalErrors: 0 };
      },
    });

    expect(result.outcome).toBe('failed');
    expect(result.message).toContain('lock was lost');
  });

  it('does not clear the checkpoint when ownership changes before completion', async () => {
    const fixture = createLeaseFixture();
    let cleared = false;

    const checkpoints: CheckpointStore = {
      ...fixture.checkpoints,
      async clearIfOwned(lock) {
        const existed = await fixture.checkpoints.clearIfOwned(lock);
        cleared = existed;
        return existed;
      },
    };

    const result = await runResumablePipeline({
      lockStore: fixture.lockStore,
      checkpoints,
      shutdown: createShutdownController(),
      async runIngestionStage() {
        return { success: true, errors: 0 };
      },
      async runSyncStage() {
        fixture.steal('replacement-run');
        return { totalErrors: 0 };
      },
    });

    expect(result.outcome).toBe('failed');
    expect(cleared).toBe(false);
    expect(fixture.owner()).toBe('replacement-run');
  });
});
