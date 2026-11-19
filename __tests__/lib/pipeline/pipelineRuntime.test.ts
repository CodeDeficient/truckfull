import { describe, it, expect } from '@jest/globals';
import {
  createRunId,
  createCheckpoint,
  markCompleted,
  markIngestionComplete,
  markPartial,
  planResume,
  recordCityCompleted,
  recordSyncSourceCompleted,
} from '@/lib/pipeline/checkpointStore';
import {
  createPipelineLockToken,
  acquirePipelineLock,
  type PipelineLockStore,
} from '@/lib/pipeline/pipelineLock';
import {
  createShutdownController,
  delayWithAbort,
  installShutdownSignals,
  type SignalSource,
} from '@/lib/pipeline/gracefulShutdown';

describe('checkpointStore state transitions', () => {
  it('creates a running checkpoint with no progress', () => {
    const checkpoint = createCheckpoint('run-1', 1000);

    expect(checkpoint).toMatchObject({
      runId: 'run-1',
      status: 'running',
      startedAt: 1000,
      updatedAt: 1000,
      completedCities: [],
      syncCompletedSources: [],
      ingestionComplete: false,
    });
  });

  it('appends completed cities once and refreshes updatedAt', () => {
    const first = recordCityCompleted(createCheckpoint('run-1', 1000), 'augusta', 1100);
    const second = recordCityCompleted(first, 'augusta', 1200);
    const third = recordCityCompleted(second, 'savannah', 1300);

    expect(third.completedCities).toEqual(['augusta', 'savannah']);
    expect(second.updatedAt).toBe(1200);
    expect(third.updatedAt).toBe(1300);
  });

  it('tracks completed sync sources independently of cities', () => {
    const checkpoint = recordSyncSourceCompleted(
      createCheckpoint('run-1', 1000),
      'savannah_eproval',
      1100,
    );

    expect(checkpoint.syncCompletedSources).toEqual(['savannah_eproval']);
    expect(checkpoint.completedCities).toEqual([]);
  });

  it('marks ingestion complete and partial status with an error note', () => {
    const done = markIngestionComplete(createCheckpoint('run-1', 1000), 1100);
    expect(done.ingestionComplete).toBe(true);

    const partial = markPartial(done, 1200, 'Shutdown requested');
    expect(partial.status).toBe('partial');
    expect(partial.lastError).toBe('Shutdown requested');
    expect(partial.ingestionComplete).toBe(true);
  });
});

describe('planResume', () => {
  it('returns null without a checkpoint', () => {
    expect(planResume(null, 1000, 5000)).toBeNull();
  });

  it('returns null for completed checkpoints', () => {
    const completed = markCompleted(createCheckpoint('run-1', 1000), 1100);
    expect(planResume(completed, 1200, 5000)).toBeNull();
  });

  it('returns null for stale checkpoints', () => {
    const checkpoint = recordCityCompleted(createCheckpoint('run-1', 1000), 'augusta', 1000);
    expect(planResume(checkpoint, 9000, 5000)).toBeNull();
  });

  it('exposes completed cities and sources for a fresh partial checkpoint', () => {
    let checkpoint = recordCityCompleted(createCheckpoint('run-1', 1000), 'augusta', 1100);
    checkpoint = markIngestionComplete(checkpoint, 1100);
    checkpoint = recordSyncSourceCompleted(checkpoint, 'savannah_eproval', 1200);
    checkpoint = markPartial(checkpoint, 1300, 'Shutdown requested');

    const plan = planResume(checkpoint, 1400, 5000);

    expect(plan).not.toBeNull();
    expect(plan!.runId).toBe('run-1');
    expect([...plan!.skipCities]).toEqual(['augusta']);
    expect([...plan!.skipSyncSources]).toEqual(['savannah_eproval']);
    expect(plan!.ingestionComplete).toBe(true);
  });
});

describe('createRunId', () => {
  it('embeds the timestamp and stays unique across calls', () => {
    const first = createRunId(0);
    const second = createRunId(0);

    expect(first.startsWith('1970-01-01T00:00:00.000Z-')).toBe(true);
    expect(first).not.toBe(second);
  });
});

function createInMemoryLockStore(): PipelineLockStore & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    async set(key, value, options) {
      if (options.nx && values.has(key)) return null;
      values.set(key, value);
      return 'OK';
    },
    async eval(script, keys, args) {
      const [key] = keys;
      const [token] = args;
      if (values.get(key) !== token) return 0;
      if (script.includes('del')) {
        values.delete(key);
        return 1;
      }
      return 1;
    },
  };
}

describe('pipelineLock', () => {
  it('generates distinct tokens', () => {
    expect(createPipelineLockToken()).not.toBe(createPipelineLockToken());
  });

  it('only grants one holder for the same key', async () => {
    const store = createInMemoryLockStore();
    const first = await acquirePipelineLock({ store, key: 'lock', ttlSeconds: 60 });
    const second = await acquirePipelineLock({ store, key: 'lock', ttlSeconds: 60 });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    await first!.release();
  });

  it('releases only for the owning token', async () => {
    const store = createInMemoryLockStore();
    const lock = await acquirePipelineLock({ store, key: 'lock', ttlSeconds: 60 });
    store.values.set('lock', 'someone-else');

    const released = await lock!.release();

    expect(released).toBe(false);
    expect(lock!.isHeld()).toBe(false);
  });

  it('drops local ownership when renewal fails', async () => {
    const store = createInMemoryLockStore();
    const lock = await acquirePipelineLock({ store, key: 'lock', ttlSeconds: 60 });
    store.values.set('lock', 'someone-else');

    const renewed = await lock!.renew();

    expect(renewed).toBe(false);
    expect(lock!.isHeld()).toBe(false);
  });

  it('renews a held lease while a stage has not checkpointed', async () => {
    let renewals = 0;
    const values = new Map<string, string>();
    const store: PipelineLockStore = {
      async set(key, value) {
        values.set(key, value);
        return 'OK';
      },
      async eval(script, keys, args) {
        if (values.get(keys[0]) !== args[0]) return 0;
        if (script.includes('expire')) renewals += 1;
        if (script.includes('del')) values.delete(keys[0]);
        return 1;
      },
    };
    const lock = await acquirePipelineLock({ store, key: 'slow-stage', ttlSeconds: 1 });

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(renewals).toBeGreaterThan(0);
    expect(lock!.isHeld()).toBe(true);
    await lock!.release();
  });
});

describe('shutdown controller', () => {
  it('resolves the shutdown promise with the reason once', async () => {
    const shutdown = createShutdownController();
    shutdown.requestShutdown('SIGTERM');
    shutdown.requestShutdown('SIGINT');

    expect(shutdown.requested).toBe(true);
    expect(shutdown.reason).toBe('SIGTERM');
    await expect(shutdown.whenShutdownRequested()).resolves.toBe('SIGTERM');
    expect(shutdown.signal.aborted).toBe(true);
  });

  it('installs and removes signal listeners', () => {
    const listeners = new Map<string, () => void>();
    const source: SignalSource = {
      on(event, listener) {
        listeners.set(event, listener);
      },
      removeListener(event) {
        listeners.delete(event);
      },
    };
    const shutdown = createShutdownController();

    const uninstall = installShutdownSignals(shutdown, source, ['SIGTERM']);
    listeners.get('SIGTERM')?.();
    expect(shutdown.reason).toBe('SIGTERM');

    uninstall();
    expect(listeners.has('SIGTERM')).toBe(false);
  });

  it('resolves delayWithAbort early when aborted', async () => {
    const controller = new AbortController();
    const delay = delayWithAbort(60_000, controller.signal);
    controller.abort();

    await expect(delay).resolves.toBe(false);
  });
});
