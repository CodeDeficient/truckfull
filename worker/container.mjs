import { Container, getContainer } from '@cloudflare/containers';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { createNextCacheStoreHandler } from './nextCacheStore.mjs';
import { withClientLocationHeaders } from './geoHeaders.mjs';
import { BOT_ACCESS_MESSAGE, isBlockedCrawlerIp, isBlockedUserAgent } from './botAccess.mjs';
import { honeypotGuard } from './honeypot.mjs';
import { createInFlightLimiter, maxInFlight, orUnavailable } from './loadShedding.mjs';
import { fetchPosthogAsset, posthogAssetUrl } from './posthogAssets.mjs';
import { foreignDenial } from './foreignBlock.mjs';
import { finishTimedRequest, withServerTiming } from './stageTiming.mjs';
import { createEdgePageCache } from './edgePageCache.mjs';
import {
  authorizeStaging,
  isAnonymousStaticAsset,
  isVerifiedBotRscRequest,
  staticAssetCacheControl,
  verifiedBotRscResponse,
  withTrustedClientIp,
} from './edgePolicy.mjs';

export { ContainerProxy } from '@cloudflare/containers';

const CONTAINER_ENV_ALLOWLIST = new Set([
  'ADMIN_NOTIFY_EMAIL',
  'BRAVE_API_KEY',
  'COLUMBUS_TIMELY_API_KEY',
  'CRON_SECRET',
  'ENABLE_AUTO_APPROVAL',
  'ENFORMION_PROFILE_KEY_NAME',
  'ENFORMION_PROFILE_KEY_PASSWORD',
  'EVENTBRITE_PRIVATE_TOKEN',
  'EXA_API_KEY',
  'FACEBOOK_APP_SECRET',
  'FACEBOOK_AUTH_APP_SECRET',
  'FACEBOOK_BUSINESS_APP_ID',
  'FACEBOOK_BUSINESS_APP_SECRET',
  'FOURSQUARE_API_KEY',
  'FOURSQUARE_ENABLED',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'LOCATIONIQ_API_KEY',
  'MACON_ALGOLIA_API_KEY',
  'MACON_ALGOLIA_APP_ID',
  'SAVANNAH_EPROVAL_CALENDAR_KEY',
  'META_WEBHOOK_APP_SECRET',
  'META_WEBHOOK_VERIFY_TOKEN',
  'NEXT_CACHE_R2',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_BILLING_ENABLED',
  'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NODE_ENV',
  'OLLAMA_CLOUD_API_KEY',
  'OLLAMA_CLOUD_URL',
  'OPENROUTER_API_KEY',
  'RESEND_API_KEY',
  'SEARXNG_PROXY_TOKEN',
  'SEARXNG_URL',
  'SLACK_WEBHOOK_URL',
  'STRIPE_RESTRICTED_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TAVILY_API_KEY',
  'TOMTOM_API_KEY',
  'TRUCKFULL_EDGE_SECRET',
  'TURNSTILE_ALLOWED_HOSTNAMES',
  'TURNSTILE_SECRET_KEY',
  'UPSTASH_REDIS_REST_TOKEN',
  'UPSTASH_REDIS_REST_URL',
]);

export class TruckFullContainer extends Container {
  defaultPort = 3000;
  sleepAfter = '2m';
  enableInternet = true;

  constructor(ctx, env) {
    super(ctx, env);

    this.envVars = Object.fromEntries(
      [...CONTAINER_ENV_ALLOWLIST]
        .map((name) => [name, env[name]])
        .filter(([, value]) => typeof value === 'string'),
    );
    this.limitInFlight = createInFlightLimiter(maxInFlight(env.CONTAINER_MAX_IN_FLIGHT));
  }

  async fetch(request) {
    const started = Date.now();
    const alreadyInFlight = this.limitInFlight.inFlight();
    const response = await this.limitInFlight(request, (forwarded) => super.fetch(forwarded));
    return withServerTiming(response, [
      { name: 'container', ms: Date.now() - started },
      { name: 'inflight', ms: alreadyInFlight },
    ]);
  }
}

TruckFullContainer.outboundByHost = {
  'next-cache.internal': (request, env) =>
    createNextCacheStoreHandler(env.NEXT_CACHE_BUCKET)(request),
};

export class CachedStaticAssets extends WorkerEntrypoint {
  async fetch(request) {
    const container = getContainer(this.env.TRUCKFULL_CONTAINER, 'primary');
    const response = await container.fetch(withTrustedClientIp(request));
    const result = new Response(response.body, response);
    result.headers.set('cache-control', staticAssetCacheControl(request, response));
    return result;
  }
}

let edgePageCache = null;

function servePageFromEdge(request, url, origin, ctx, env) {
  edgePageCache ??= createEdgePageCache({
    cache: caches.default,
    release: env.CF_VERSION_METADATA?.id ?? '',
  });
  return edgePageCache(request, url, origin, (task) => ctx.waitUntil(task));
}

async function forwardToApp(request, env, url, started, ctx) {
  const edgeMs = Date.now() - started;
  const container = getContainer(env.TRUCKFULL_CONTAINER, 'primary');
  const origin = (forwarded) => container.fetch(forwarded);
  const appStarted = Date.now();
  const response = await orUnavailable(
    env.EDGE_PAGE_CACHE === 'on'
      ? servePageFromEdge(request, url, origin, ctx, env)
      : origin(request),
    url.pathname,
  );
  return finishTimedRequest(url, response, [
    { name: 'edge', ms: edgeMs },
    { name: 'app', ms: Date.now() - appStarted },
  ]);
}

export default {
  async fetch(request, env, ctx) {
    const started = Date.now();
    if (!authorizeStaging(request, env)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'cache-control': 'no-store',
          'www-authenticate': 'Basic realm="TruckFull staging", charset="UTF-8"',
        },
      });
    }
    const clientIp = request.headers.get('cf-connecting-ip');
    if (isBlockedUserAgent(request.headers.get('user-agent')) || isBlockedCrawlerIp(clientIp)) {
      return new Response(BOT_ACCESS_MESSAGE, {
        status: 403,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }

    const url = new URL(request.url);
    const waitUntil = (task) => ctx.waitUntil(task);
    const honeypotDenial = await honeypotGuard(request, caches.default, waitUntil, url);
    if (honeypotDenial) return honeypotDenial;

    if (isVerifiedBotRscRequest(request, request.cf, url)) return verifiedBotRscResponse();

    const assetUrl = posthogAssetUrl(request, url);
    if (assetUrl) return fetchPosthogAsset(request, assetUrl);

    const clientLocation = request.cf;
    const denial = foreignDenial(clientLocation, url);
    if (denial) return denial;
    request = withTrustedClientIp(request, env);
    if (env.STATIC_ASSET_CACHE_ENABLED === 'true' && isAnonymousStaticAsset(request, url)) {
      return ctx.exports.CachedStaticAssets.fetch(request);
    }
    const forwarded =
      url.pathname === '/api/geo/ip-location'
        ? withClientLocationHeaders(request, clientLocation)
        : request;
    return forwardToApp(forwarded, env, url, started, ctx);
  },

  async scheduled(controller, env, ctx) {
    const container = getContainer(env.TRUCKFULL_CONTAINER, 'primary');
    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- internal loopback host of the containers runtime, not a network endpoint
    const response = await container.fetch('http://container/api/cron/recover-stuck-posts', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const result = await response.text();
    console.log('[recover-stuck-posts]', response.status, result);
    if (!response.ok) {
      throw new Error(`recover-stuck-posts failed with status ${response.status}: ${result}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      throw new Error(`recover-stuck-posts returned a non-JSON 200 body: ${result.slice(0, 200)}`);
    }
    if (parsed && parsed.success === false) {
      throw new Error(`recover-stuck-posts reported failure: ${result}`);
    }
  },
};
