import { constantTimeEqual } from './searxngAuth.mjs';

const BASIC_AUTH_HEADER = /^Basic (.+)$/i;
const NEXT_STATIC_ASSET_PATH =
  /^\/_next\/static\/[A-Za-z0-9_./-]+\.(?:js|css|woff2?|ttf|png|webp|avif|svg)$/;
const UNCACHEABLE_DIRECTIVE = /(?:private|no-store|no-cache)/i;
const DYNAMIC_CONTENT_TYPE = /text\/html|text\/x-component/i;

function isStagingBasicAuth(request, env) {
  if (env.APP_ENV !== 'staging' || !env.STAGING_ACCESS_TOKEN) return false;
  const match = BASIC_AUTH_HEADER.exec(request.headers.get('authorization') ?? '');
  if (!match) return false;
  try {
    return constantTimeEqual(atob(match[1]), `truckfull:${env.STAGING_ACCESS_TOKEN}`);
  } catch {
    return false;
  }
}

export function authorizeStaging(request, env) {
  if (env.APP_ENV === 'production') return true;
  if (env.APP_ENV !== 'staging') return false;
  return (
    constantTimeEqual(request.headers.get('x-truckfull-staging-token'), env.STAGING_ACCESS_TOKEN) ||
    isStagingBasicAuth(request, env)
  );
}

export function withTrustedClientIp(request, env = {}) {
  const forwarded = new Request(request);
  const ip = request.headers.get('cf-connecting-ip');
  for (const name of [
    'x-forwarded-for',
    'x-real-ip',
    'x-vercel-forwarded-for',
    'x-truckfull-staging-token',
  ]) {
    forwarded.headers.delete(name);
  }
  if (ip) {
    forwarded.headers.set('x-forwarded-for', ip);
    forwarded.headers.set('x-real-ip', ip);
  }
  if (isStagingBasicAuth(request, env)) forwarded.headers.delete('authorization');
  return forwarded;
}

export function isVerifiedBotRscRequest(request, cf, url = new URL(request.url)) {
  if (typeof cf?.verifiedBotCategory !== 'string' || cf.verifiedBotCategory === '') return false;
  return (
    url.searchParams.has('_rsc') ||
    request.headers.get('rsc') === '1' ||
    request.headers.has('next-router-prefetch')
  );
}

export function verifiedBotRscResponse() {
  return new Response(null, {
    status: 204,
    headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
}

export function isAnonymousStaticAsset(request, url = new URL(request.url)) {
  return (
    request.method === 'GET' &&
    url.search === '' &&
    NEXT_STATIC_ASSET_PATH.test(url.pathname) &&
    ![
      'cookie',
      'authorization',
      'rsc',
      'range',
      'next-router-state-tree',
      'next-router-prefetch',
      'next-router-segment-prefetch',
      'upgrade',
    ].some((name) => request.headers.has(name))
  );
}

export function staticAssetCacheControl(request, response) {
  const control = response.headers.get('cache-control') ?? '';
  const vary = response.headers.get('vary') ?? '';
  if (
    !isAnonymousStaticAsset(request) ||
    response.status !== 200 ||
    response.headers.has('set-cookie') ||
    UNCACHEABLE_DIRECTIVE.test(control) ||
    vary.includes('*') ||
    DYNAMIC_CONTENT_TYPE.test(response.headers.get('content-type') ?? '')
  ) {
    return 'no-store';
  }
  return 'public, max-age=31536000, immutable';
}
