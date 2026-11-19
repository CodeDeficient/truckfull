import { describe, it, expect } from '@jest/globals';
import { createPipelineRuntime } from '@/lib/pipeline/pipelineRuntimeEntry';
import { createCheckpoint } from '@/lib/pipeline/checkpointStore';
import type { UpstashPipelineClient } from '@/lib/pipeline/upstashStores';
import type { SignalSource } from '@/lib/pipeline/gracefulShutdown';

function createFakeRedis(): UpstashPipelineClient & { values: Map<string, unknown> } {
  const values = new Map<string, unknown>();
  return {
    values,
    async set(key, value, options) {
      if (options?.nx && values.has(key)) return null;
      values.set(key, value);
      return 'OK';
    },
    async get<T>(key: string): Promise<T | null> {
      return (values.get(key) as T | undefined) ?? null;
    },
    async del(key) {
      return values.delete(key) ? 1 : 0;
    },
    async eval(script, keys, args) {
      const [lockKey, checkpointKey] = keys;
      if (values.get(lockKey) !== args[0]) return 0;
      if (script.includes('del')) {
        values.delete(checkpointKey);
        return 1;
      }
      values.set(checkpointKey, JSON.parse(args[1]));
      return 1;
    },
  };
}

function createSignalSource(): SignalSource & {
  fire(event: string): boolean;
  remaining(): number;
} {
  const listeners = new Map<string, () => void>();
  return {
    on(event, listener) {
      listeners.set(event, listener);
      return undefined;
    },
    removeListener(event) {
      listeners.delete(event);
      return undefined;
    },
    fire(event) {
      const listener = listeners.get(event);
      listener?.();
      return listener !== undefined;
    },
    remaining() {
      return listeners.size;
    },
  };
}

describe('createPipelineRuntime', () => {
  it('runs both stages and reports completion', async () => {
    const redis = createFakeRedis();
    const signals = createSignalSource();
    const runtime = createPipelineRuntime({
      redis,
      signals,
      runIngestionStage: async () => ({ success: true, errors: 0 }),
      runSyncStage: async () => ({ totalErrors: 0 }),
      now: () => 1000,
    });

    const result = await runtime.run();

    expect(result.outcome).toBe('completed');
  });

  it('removes signal listeners once the run finishes', async () => {
    const signals = createSignalSource();
    const runtime = createPipelineRuntime({
      redis: createFakeRedis(),
      signals,
      runIngestionStage: async () => ({ success: true, errors: 0 }),
      runSyncStage: async () => ({ totalErrors: 0 }),
    });

    await runtime.run();

    expect(signals.remaining()).toBe(0);
    expect(signals.fire('SIGTERM')).toBe(false);
  });

  it('stops at a city boundary when SIGTERM arrives', async () => {
    const signals = createSignalSource();
    const runtime = createPipelineRuntime({
      redis: createFakeRedis(),
      signals,
      async runIngestionStage(_invalidate, hooks) {
        signals.fire('SIGTERM');
        expect(hooks.shouldStop()).toBe(true);
        return { success: false, errors: 0, interrupted: true };
      },
      runSyncStage: async () => ({ totalErrors: 0 }),
    });

    const result = await runtime.run();

    expect(result.outcome).toBe('interrupted');
  });

  it('skips cities recorded by a previous run', async () => {
    const redis = createFakeRedis();
    redis.values.set('pipeline:checkpoint:v1', {
      ...createCheckpoint('run-old', 100),
      completedCities: ['augusta'],
    });
    let seen: readonly string[] = [];
    const runtime = createPipelineRuntime({
      redis,
      signals: createSignalSource(),
      now: () => 200,
      async runIngestionStage(_invalidate, hooks) {
        seen = [...hooks.skipCities];
        return { success: true, errors: 0 };
      },
      runSyncStage: async () => ({ totalErrors: 0 }),
    });

    await runtime.run();

    expect(seen).toEqual(['augusta']);
  });
});
