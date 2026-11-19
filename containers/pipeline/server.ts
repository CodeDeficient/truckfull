import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { assemblePipelineFromEnv } from '../../lib/pipeline/pipelineEntrypoint';
import { createIngestionStage, createSyncStage } from '../../lib/pipeline/stageFactory';
import { buildScriptInvalidator } from '../../lib/events/scriptInvalidation';
import { sendPipelineFailureAlert } from '../../lib/monitoring/pipelineAlerts';
import { createPipelineHandler } from './http.mjs';

const env = process.env;
if (!env.CRON_SECRET) throw new Error('CRON_SECRET is required');

const invalidate = buildScriptInvalidator(env);
const run = assemblePipelineFromEnv({
  env,
  signals: process,
  invalidate,
  alertFailure: (jobName, message) => sendPipelineFailureAlert({ jobName, errorMessage: message }),
  createRedis: (url, token) => new Redis({ url, token }),
  createSupabase: (url, key) => {
    if (!url || !key) throw new Error('Supabase URL and key are required');
    return createClient(url, key);
  },
  createIngestionStage: () => createIngestionStage(),
  createSyncStage: (staging, prod) => createSyncStage({ staging, prod, invalidate }),
});

const server = createServer(
  createPipelineHandler(run, env.CRON_SECRET, async (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown pipeline error';
    await sendPipelineFailureAlert({ jobName: 'cloudflare-pipeline', errorMessage: message });
  }),
);

server.listen(Number(env.PORT ?? 8080), '0.0.0.0');
