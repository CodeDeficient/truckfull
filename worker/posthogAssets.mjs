const ASSET_PREFIX = '/ingest/static/';
const ASSET_ORIGIN = 'https://us-assets.i.posthog.com/static/';
const ASSET_METHODS = new Set(['GET', 'HEAD']);

export function posthogAssetUrl(request, url = new URL(request.url)) {
  if (!ASSET_METHODS.has(request.method)) return null;
  if (!url.pathname.startsWith(ASSET_PREFIX)) return null;
  return `${ASSET_ORIGIN}${url.pathname.slice(ASSET_PREFIX.length)}${url.search}`;
}

export function fetchPosthogAsset(request, assetUrl, fetchImpl = fetch) {
  return fetchImpl(assetUrl, {
    method: request.method,
    headers: { accept: request.headers.get('accept') ?? '*/*' },
  });
}
