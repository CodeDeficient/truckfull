import { describe, it, expect } from '@jest/globals';
import { createPipelineEntrypoint, readPipelineConfig } from '@/lib/pipeline/pipelineEntrypoint';
import type { UpstashPipelineClient } from '@/lib/pipeline/upstashStores';

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

describe('readPipelineConfig', () => {
  it('reports every missing required variable', () => {
    const result = readPipelineConfig({});

    expect(result.ok).toBe(false);
    expect(result.missing).toContain('UPSTASH_REDIS_REST_URL');
    expect(result.missing).toContain('UPSTASH_REDIS_REST_TOKEN');
  });

  it('requires production credentials for the sync stage', () => {
    const result = readPipelineConfig({
      UPSTASH_REDIS_REST_URL: 'https://redis.example',
      UPSTASH_REDIS_REST_TOKEN: 'token',
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toContain('PROD_SUPABASE_URL');
    expect(result.missing).toContain('PROD_SUPABASE_SERVICE_ROLE_KEY');
  });

  it('requires dedicated staging credentials, not the public app URL', () => {
    const result = readPipelineConfig({
      UPSTASH_REDIS_REST_URL: 'https://redis.example',
      UPSTASH_REDIS_REST_TOKEN: 'token',
      NEXT_PUBLIC_SUPABASE_URL: 'https://production.example',
      SUPABASE_SERVICE_ROLE_KEY: 'production-key',
      PROD_SUPABASE_URL: 'https://production.example',
      PROD_SUPABASE_SERVICE_ROLE_KEY: 'prod-key',
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toContain('STAGING_SUPABASE_URL');
    expect(result.missing).toContain('STAGING_SUPABASE_SERVICE_ROLE_KEY');
  });

  it('accepts a complete environment', () => {
    const result = readPipelineConfig({
      UPSTASH_REDIS_REST_URL: 'https://redis.example',
      UPSTASH_REDIS_REST_TOKEN: 'token',
      STAGING_SUPABASE_URL: 'https://staging.example',
      STAGING_SUPABASE_SERVICE_ROLE_KEY: 'staging-key',
      PROD_SUPABASE_URL: 'https://prod.example',
      PROD_SUPABASE_SERVICE_ROLE_KEY: 'prod-key',
    });

    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.stagingUrl).toBe('https://staging.example');
  });
});

describe('createPipelineEntrypoint', () => {
  it('runs ingestion and sync through the composed runtime', async () => {
    const calls: string[] = [];
    const run = createPipelineEntrypoint({
      redis: createFakeRedis(),
      signals: { on: () => undefined, removeListener: () => undefined },
      async runIngestionStage() {
        calls.push('ingestion');
        return { success: true, errors: 0 };
      },
      async runSyncStage() {
        calls.push('sync');
        return { totalErrors: 0 };
      },
    });

    const result = await run();

    expect(calls).toEqual(['ingestion', 'sync']);
    expect(result.outcome).toBe('completed');
  });
});
