import { Container, getContainer } from '@cloudflare/containers';
import { validateBackupRequest } from './backupRequest.mjs';
import { createR2BridgeHandler } from './backupR2.mjs';
import { buildBackupContainerEnv } from './backupConfig.mjs';
import { BATCH_SHUTDOWN_STATE_KEY, expireBatchContainer } from './batchIdleShutdown.mjs';

export { ContainerProxy } from '@cloudflare/containers';

export class BackupContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '5m';
  enableInternet = true;

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = buildBackupContainerEnv(env);
  }

  async onActivityExpired() {
    await expireBatchContainer(this, 6 * 60 * 60 * 1000);
  }

  async onStart() {
    await this.ctx.storage.delete(BATCH_SHUTDOWN_STATE_KEY);
  }
}

BackupContainer.outboundByHost = {
  'r2.bridge': (request, env) => createR2BridgeHandler(env.BACKUP_BUCKET)(request),
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const status = validateBackupRequest(
      request.method,
      url.pathname,
      request.headers.get('authorization'),
      env,
    );
    if (status !== 200) return new Response(null, { status });
    const container = getContainer(env.BACKUP_CONTAINER, 'primary');
    return container.fetch(`https://container${url.pathname}`, {
      method: request.method,
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
  },

  async scheduled(_controller, env) {
    if (env.BACKUP_ENABLED !== 'true') return;
    const container = getContainer(env.BACKUP_CONTAINER, 'primary');
    const response = await container.fetch('https://container/run', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    if (response.status !== 202 && response.status !== 409) {
      throw new Error(`Backup trigger failed with status ${response.status}`);
    }
  },
};
