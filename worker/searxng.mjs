import { Container, getContainer } from '@cloudflare/containers';
import { isAuthorizedSearxngRequest, SEARXNG_AUTH_HEADER } from './searxngAuth.mjs';
import { validateSearxngRequest } from './searxngRequest.mjs';

export class SearxngContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '15m';
  enableInternet = true;

  constructor(ctx, env) {
    super(ctx, env);

    this.envVars = { SEARXNG_SECRET: env.SEARXNG_SECRET };
  }
}

function jsonError(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    // Authenticate before touching the container binding so that unauthenticated
    // requests neither wake the container nor consume container CPU time.
    const providedToken = request.headers.get(SEARXNG_AUTH_HEADER);
    if (!isAuthorizedSearxngRequest(providedToken, env.SEARXNG_PROXY_TOKEN)) {
      return jsonError(401, 'Unauthorized');
    }

    const url = new URL(request.url);
    const validation = validateSearxngRequest(request.method, url.pathname, url.searchParams);
    if (!validation.allowed) {
      return jsonError(validation.status, validation.error);
    }

    const container = getContainer(env.SEARXNG_CONTAINER, 'primary');
    return container.fetch(request);
  },
};
