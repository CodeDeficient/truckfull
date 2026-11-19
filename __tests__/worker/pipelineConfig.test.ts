import { describe, expect, it } from '@jest/globals';
import { buildPipelineContainerEnv } from '../../worker/pipelineConfig.mjs';

const env = {
  STAGING_SUPABASE_URL: 'https://staging.example',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'staging-key',
  PROD_SUPABASE_URL: 'https://production.example',
  PROD_SUPABASE_SERVICE_ROLE_KEY: 'production-key',
  UPSTASH_REDIS_REST_URL: 'https://redis.example',
  UPSTASH_REDIS_REST_TOKEN: 'redis-token',
  CRON_SECRET: 'cron-token',
  TRUCKFULL_EDGE_SECRET: 'edge-token',
  EXA_API_KEY: 'exa-token',
  NEXT_PUBLIC_APP_URL: 'https://app.example',
};

describe('buildPipelineContainerEnv', () => {
  it('maps staging credentials for ingestion without exposing production as the default client', () => {
    expect(buildPipelineContainerEnv(env)).toMatchObject({
      STAGING_SUPABASE_URL: 'https://staging.example',
      STAGING_SUPABASE_SERVICE_ROLE_KEY: 'staging-key',
      NEXT_PUBLIC_SUPABASE_URL: 'https://staging.example',
      SUPABASE_SERVICE_ROLE_KEY: 'staging-key',
      PROD_SUPABASE_URL: 'https://production.example',
      PROD_SUPABASE_SERVICE_ROLE_KEY: 'production-key',
      EXA_API_KEY: 'exa-token',
      NEXT_PUBLIC_APP_URL: 'https://app.example',
    });
  });

  it('rejects missing credentials before starting a container', () => {
    expect(() =>
      buildPipelineContainerEnv({ ...env, STAGING_SUPABASE_SERVICE_ROLE_KEY: '' }),
    ).toThrow('STAGING_SUPABASE_SERVICE_ROLE_KEY');
  });

  it('requires cache invalidation credentials before a production sync is possible', () => {
    expect(() => buildPipelineContainerEnv({ ...env, TRUCKFULL_EDGE_SECRET: '' })).toThrow(
      'TRUCKFULL_EDGE_SECRET',
    );
    expect(() => buildPipelineContainerEnv({ ...env, NEXT_PUBLIC_APP_URL: '' })).toThrow(
      'NEXT_PUBLIC_APP_URL',
    );
  });

  it('rejects using the same project as the staging source and production target', () => {
    expect(() =>
      buildPipelineContainerEnv({ ...env, PROD_SUPABASE_URL: env.STAGING_SUPABASE_URL }),
    ).toThrow('Staging and production Supabase URLs must differ');
  });

  it('forwards the OpenCode Go key used by the relevance classifier', () => {
    expect(buildPipelineContainerEnv({ ...env, OPENCODE_GO_API_KEY: 'go-token' })).toMatchObject({
      OPENCODE_GO_API_KEY: 'go-token',
    });
  });

  it('does not forward unrelated Worker bindings', () => {
    expect(
      buildPipelineContainerEnv({ ...env, UNRELATED_SECRET: 'never-forward' }),
    ).not.toHaveProperty('UNRELATED_SECRET');
  });
});
