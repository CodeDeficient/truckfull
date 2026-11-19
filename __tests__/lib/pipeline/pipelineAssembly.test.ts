import { describe, it, expect } from '@jest/globals';
import { assemblePipelineFromEnv } from '@/lib/pipeline/pipelineEntrypoint';
import type { UpstashPipelineClient } from '@/lib/pipeline/upstashStores';

function createFakeRedis(): UpstashPipelineClient {
  const values = new Map<string, unknown>();
  return {
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

const completeEnv = {
  UPSTASH_REDIS_REST_URL: 'https://redis.example',
  UPSTASH_REDIS_REST_TOKEN: 'token',
  STAGING_SUPABASE_URL: 'https://staging.example',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'staging-key',
  PROD_SUPABASE_URL: 'https://prod.example',
  PROD_SUPABASE_SERVICE_ROLE_KEY: 'prod-key',
};

describe('assemblePipelineFromEnv', () => {
  it('throws a listing of every missing variable', () => {
    expect(() =>
      assemblePipelineFromEnv({
        env: {},
        createRedis: () => createFakeRedis(),
        createSupabase: () => ({} as never),
      }),
    ).toThrow(/UPSTASH_REDIS_REST_URL.*PROD_SUPABASE_URL/s);
  });

  it('builds a runner that completes both stages', async () => {
    const seen: string[] = [];
    const run = assemblePipelineFromEnv({
      env: completeEnv,
      createRedis: () => createFakeRedis(),
      createSupabase: () => ({} as never),
      createIngestionStage: () => async () => {
        seen.push('ingestion');
        return { success: true, errors: 0 };
      },
      createSyncStage: () => async () => {
        seen.push('sync');
        return { totalErrors: 0 };
      },
      signals: { on: () => undefined, removeListener: () => undefined },
    });

    const result = await run();

    expect(seen).toEqual(['ingestion', 'sync']);
    expect(result.outcome).toBe('completed');
  });

  it('creates the staging and production clients from the configured URLs', () => {
    const created: string[] = [];
    assemblePipelineFromEnv({
      env: completeEnv,
      createRedis: () => createFakeRedis(),
      createSupabase: (url) => {
        created.push(url ?? '');
        return {} as never;
      },
      createIngestionStage: () => async () => ({ success: true, errors: 0 }),
      createSyncStage: () => async () => ({ totalErrors: 0 }),
      signals: { on: () => undefined, removeListener: () => undefined },
    });

    expect(created).toEqual(['https://staging.example', 'https://prod.example']);
  });
});
