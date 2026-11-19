import { Container, getContainer } from '@cloudflare/containers';
import { buildPipelineContainerEnv } from './pipelineConfig.mjs';
import { validatePipelineRequest } from './pipelineRequest.mjs';
import { BATCH_SHUTDOWN_STATE_KEY, expireBatchContainer } from './batchIdleShutdown.mjs';

export class PipelineContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '5m';
  enableInternet = true;

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = buildPipelineContainerEnv(env);
  }

  async onActivityExpired() {
    await expireBatchContainer(this, 6 * 60 * 60 * 1000);
  }

  async onStart() {
    await this.ctx.storage.delete(BATCH_SHUTDOWN_STATE_KEY);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const status = validatePipelineRequest(
      request.method,
      url.pathname,
      request.headers.get('authorization'),
      env,
    );
    if (status !== 200) return new Response(null, { status });
    const container = getContainer(env.PIPELINE_CONTAINER, 'primary');
    return container.fetch(`https://container${url.pathname}`, {
      method: request.method,
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
  },

  async scheduled(_controller, env) {
    if (env.PIPELINE_ENABLED !== 'true') return;
    const container = getContainer(env.PIPELINE_CONTAINER, 'primary');
    const response = await container.fetch('https://container/run', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    if (response.status !== 202 && response.status !== 409) {
      throw new Error(`Pipeline trigger failed with status ${response.status}`);
    }
  },
};
