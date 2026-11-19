import { describe, it, expect } from '@jest/globals';
import {
  createUpstashCheckpointStore,
  createUpstashLockStore,
  type UpstashPipelineClient,
} from '@/lib/pipeline/upstashStores';
import { acquirePipelineLock } from '@/lib/pipeline/pipelineLock';
import { createCheckpoint } from '@/lib/pipeline/checkpointStore';

interface FakeUpstash extends UpstashPipelineClient {
  values: Map<string, unknown>;
}

function createFakeUpstash(): FakeUpstash {
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

describe('createUpstashLockStore', () => {
  it('grants the lock to one caller and rejects a second', async () => {
    const client = createFakeUpstash();
    const store = createUpstashLockStore(client);

    const first = await acquirePipelineLock({ store, key: 'k', ttlSeconds: 60 });
    const second = await acquirePipelineLock({ store, key: 'k', ttlSeconds: 60 });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    await first!.release();
  });
});

describe('createUpstashCheckpointStore', () => {
  it('saves and loads a checkpoint through the Upstash client', async () => {
    const client = createFakeUpstash();
    const store = createUpstashCheckpointStore(client);
    const checkpoint = createCheckpoint('run-1', 1000);

    await store.save(checkpoint);

    await expect(store.load()).resolves.toEqual(checkpoint);
  });

  it('writes only while the lease is owned', async () => {
    const client = createFakeUpstash();
    const store = createUpstashCheckpointStore(client);
    client.values.set('pipeline:lock:v1', 'someone-else');

    const saved = await store.saveIfOwned(createCheckpoint('run-1', 1000), {
      key: 'pipeline:lock:v1',
      token: 'owner',
    });

    expect(saved).toBe(false);
  });
});
