import { createServer } from 'node:http';
import { createBackupHandler } from './http.mjs';
import { createBackupRunner } from './dumpPipeline.mjs';
import { runBackup } from '../../worker/backupRun.mjs';
import { sendPipelineFailureAlert } from '../../lib/monitoring/pipelineAlerts';

const env = process.env;
if (!env.CRON_SECRET) throw new Error('CRON_SECRET is required');

const runner = createBackupRunner(env);

const server = createServer(
  createBackupHandler(
    () => runBackup(runner),
    env.CRON_SECRET,
    async (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown backup error';
      await sendPipelineFailureAlert({ jobName: 'cloudflare-backup', errorMessage: message });
    },
  ),
);

server.listen(Number(env.PORT ?? 8080), '0.0.0.0');
