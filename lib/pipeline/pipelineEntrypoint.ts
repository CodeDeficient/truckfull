import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventCacheInvalidator } from '@/lib/events/eventCacheTargets';
import type { PipelineRunResult, IngestionStageFn, SyncStageFn } from './orchestrator';
import { createPipelineRuntime } from './pipelineRuntimeEntry';
import type { SignalSource } from './gracefulShutdown';
import type { UpstashPipelineClient } from './upstashStores';

export interface PipelineConfig {
  readonly ok: boolean;
  readonly missing: readonly string[];
  readonly upstashUrl?: string;
  readonly upstashToken?: string;
  readonly stagingUrl?: string;
  readonly stagingKey?: string;
  readonly prodUrl?: string;
  readonly prodKey?: string;
}

const REQUIRED_ENV = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'STAGING_SUPABASE_URL',
  'STAGING_SUPABASE_SERVICE_ROLE_KEY',
  'PROD_SUPABASE_URL',
  'PROD_SUPABASE_SERVICE_ROLE_KEY',
] as const;

export function readPipelineConfig(env: NodeJS.ProcessEnv): PipelineConfig {
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  return {
    ok: missing.length === 0,
    missing,
    upstashUrl: env.UPSTASH_REDIS_REST_URL,
    upstashToken: env.UPSTASH_REDIS_REST_TOKEN,
    stagingUrl: env.STAGING_SUPABASE_URL,
    stagingKey: env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
    prodUrl: env.PROD_SUPABASE_URL,
    prodKey: env.PROD_SUPABASE_SERVICE_ROLE_KEY,
  };
}

export interface PipelineEntrypointOptions {
  readonly redis: UpstashPipelineClient;
  readonly signals: SignalSource;
  readonly runIngestionStage: IngestionStageFn;
  readonly runSyncStage: SyncStageFn;
  readonly invalidate?: EventCacheInvalidator;
  readonly alertFailure?: (jobName: string, message: string) => Promise<unknown>;
  readonly now?: () => number;
}

export function createPipelineEntrypoint(
  options: PipelineEntrypointOptions,
): () => Promise<PipelineRunResult> {
  const runtime = createPipelineRuntime({
    redis: options.redis,
    signals: options.signals,
    runIngestionStage: options.runIngestionStage,
    runSyncStage: options.runSyncStage,
    invalidate: options.invalidate,
    alertFailure: options.alertFailure,
    now: options.now,
  });
  return () => runtime.run();
}

export interface PipelineAssemblyDeps {
  readonly env: NodeJS.ProcessEnv;
  readonly createRedis: (url: string, token: string) => UpstashPipelineClient;
  readonly createSupabase: (url: string | undefined, key: string | undefined) => SupabaseClient;
  readonly createIngestionStage: (
    staging: SupabaseClient,
    env: NodeJS.ProcessEnv,
  ) => IngestionStageFn;
  readonly createSyncStage: (
    staging: SupabaseClient,
    prod: SupabaseClient,
    env: NodeJS.ProcessEnv,
  ) => SyncStageFn;
  readonly invalidate?: EventCacheInvalidator;
  readonly signals: SignalSource;
  readonly alertFailure?: (jobName: string, message: string) => Promise<unknown>;
  readonly now?: () => number;
}

export function assemblePipelineFromEnv(
  deps: PipelineAssemblyDeps,
): () => Promise<PipelineRunResult> {
  const config = readPipelineConfig(deps.env);
  if (!config.ok) {
    throw new Error(
      `Pipeline is missing required environment variables: ${config.missing.join(', ')}`,
    );
  }

  const redis = deps.createRedis(config.upstashUrl!, config.upstashToken!);
  const staging = deps.createSupabase(config.stagingUrl, config.stagingKey);
  const prod = deps.createSupabase(config.prodUrl, config.prodKey);

  return createPipelineEntrypoint({
    redis,
    signals: deps.signals,
    runIngestionStage: deps.createIngestionStage(staging, deps.env),
    runSyncStage: deps.createSyncStage(staging, prod, deps.env),
    invalidate: deps.invalidate,
    alertFailure: deps.alertFailure,
    now: deps.now,
  });
}
