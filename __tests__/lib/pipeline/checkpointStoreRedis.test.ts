import { describe, it, expect } from '@jest/globals';
import {
  createCheckpoint,
  createRedisCheckpointStore,
  recordCityCompleted,
} from '@/lib/pipeline/checkpointStore';

interface FakeRedis {
  values: Map<string, unknown>;
  client: {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown, options?: { ex?: number }): Promise<'OK'>;
    del(key: string): Promise<number>;
    eval(script: string, keys: string[], args: string[]): Promise<unknown>;
  };
}

function createFakeRedis(): FakeRedis {
  const values = new Map<string, unknown>();
  return {
    values,
    client: {
      async get<T>(key: string): Promise<T | null> {
        return (values.get(key) as T | undefined) ?? null;
      },
      async set(key: string, value: unknown): Promise<'OK'> {
        values.set(key, value);
        return 'OK';
      },
      async del(key: string): Promise<number> {
        return values.delete(key) ? 1 : 0;
      },
      async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
        const [lockKey, checkpointKey] = keys;
        if (values.get(lockKey) !== args[0]) return 0;
        if (script.includes("'del'")) {
          values.delete(checkpointKey);
          return 1;
        }
        values.set(checkpointKey, JSON.parse(args[1]));
        return 1;
      },
    },
  };
}

const lock = { key: 'pipeline:lock:v1', token: 'owner-token' };

describe('createRedisCheckpointStore', () => {
  it('round-trips a checkpoint', async () => {
    const { client } = createFakeRedis();
    const store = createRedisCheckpointStore(client);
    const checkpoint = recordCityCompleted(createCheckpoint('run-1', 1000), 'augusta', 1100);

    await store.save(checkpoint);
    const loaded = await store.load();

    expect(loaded).toEqual(checkpoint);
  });

  it('returns null when nothing has been saved', async () => {
    const { client } = createFakeRedis();
    const store = createRedisCheckpointStore(client);

    await expect(store.load()).resolves.toBeNull();
  });

  it('clears the stored checkpoint', async () => {
    const { client, values } = createFakeRedis();
    const store = createRedisCheckpointStore(client);
    await store.save(createCheckpoint('run-1', 1000));

    await store.clear();

    expect(values.size).toBe(0);
    await expect(store.load()).resolves.toBeNull();
  });

  it('refuses a corrupt checkpoint instead of starting another run', async () => {
    const { client, values } = createFakeRedis();
    const store = createRedisCheckpointStore(client);
    values.set('pipeline:checkpoint:v1', 'corrupted');

    await expect(store.load()).rejects.toThrow('Invalid pipeline checkpoint');
  });

  it('refuses malformed progress that could skip unfinished work', async () => {
    const { client, values } = createFakeRedis();
    const store = createRedisCheckpointStore(client);
    values.set('pipeline:checkpoint:v1', {
      ...createCheckpoint('run-1', 1000),
      completedCities: 'all cities',
    });

    await expect(store.load()).rejects.toThrow('Invalid pipeline checkpoint');
  });

  it('writes a checkpoint only while holding the lock', async () => {
    const { client, values } = createFakeRedis();
    const store = createRedisCheckpointStore(client);
    values.set('pipeline:lock:v1', 'different-owner');

    const saved = await store.saveIfOwned(createCheckpoint('run-1', 1000), lock);

    expect(saved).toBe(false);
    expect(values.has('pipeline:checkpoint:v1')).toBe(false);
  });

  it('saves and clears while holding the lock', async () => {
    const { client, values } = createFakeRedis();
    const store = createRedisCheckpointStore(client);
    values.set('pipeline:lock:v1', 'owner-token');

    await expect(store.saveIfOwned(createCheckpoint('run-1', 1000), lock)).resolves.toBe(true);
    await expect(store.clearIfOwned(lock)).resolves.toBe(true);
    expect(values.has('pipeline:checkpoint:v1')).toBe(false);
  });

  it('clears successfully while holding the lock even if no checkpoint remains', async () => {
    const { client, values } = createFakeRedis();
    const store = createRedisCheckpointStore(client);
    values.set('pipeline:lock:v1', 'owner-token');

    await expect(store.clearIfOwned(lock)).resolves.toBe(true);
  });

  it('refuses to clear a checkpoint owned by another run', async () => {
    const { client, values } = createFakeRedis();
    const store = createRedisCheckpointStore(client);
    const checkpoint = createCheckpoint('other-run', 1000);
    values.set('pipeline:checkpoint:v1', checkpoint);
    values.set('pipeline:lock:v1', 'different-owner');

    await expect(store.clearIfOwned(lock)).resolves.toBe(false);
    expect(values.get('pipeline:checkpoint:v1')).toEqual(checkpoint);
  });
});
