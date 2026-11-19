const STATIC_EXTENSIONS = new Set(
  'js mjs css map json xml txt ico png jpg jpeg webp gif svg woff woff2 ttf otf pdf webmanifest'.split(
    ' ',
  ),
);
const DOCUMENT_SKIP_PREFIXES = ['/api/', '/_next/', '/cdn-cgi/', '/ingest/'];
const DYNAMIC_SKIP_PREFIXES = [...DOCUMENT_SKIP_PREFIXES, '/object/'];
const PREFETCH_PURPOSE = /\bprefetch\b/i;
const RELAY_ORGANIZATION = /(?:icloud|apple).*relay/;
const COMMERCIAL_MESSAGE =
  'Commercial automated access is blocked. For data licensing and API access, join the waitlist at https://www.truckfull.food/data-api.';

export const BLOCKED_MESSAGE = 'Too many automated-looking requests. Please try again shortly.';

function isStaticFile(path) {
  const dot = path.lastIndexOf('.');
  return dot !== -1 && STATIC_EXTENSIONS.has(path.slice(dot + 1).toLowerCase());
}

export function candidate(request) {
  if (request.method !== 'GET') return false;
  const path = new URL(request.url).pathname.toLowerCase();
  if (DOCUMENT_SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  const accept = (request.headers.get('accept') || '').toLowerCase();
  if (request.headers.get('rsc') === '1' || accept.includes('text/x-component')) return false;
  if (isStaticFile(path)) return false;
  const dest = request.headers.get('sec-fetch-dest') || '';
  if (dest && dest !== 'document') return false;
  return dest === 'document' || accept.includes('text/html');
}

export function isPrefetchRequest(request) {
  return (
    request.headers.get('next-router-prefetch') === '1' ||
    PREFETCH_PURPOSE.test(request.headers.get('purpose') || '') ||
    PREFETCH_PURPOSE.test(request.headers.get('sec-purpose') || '')
  );
}

export function isDynamicGet(request) {
  const path = new URL(request.url).pathname.toLowerCase();
  return (
    request.method === 'GET' &&
    !DYNAMIC_SKIP_PREFIXES.some((prefix) => path.startsWith(prefix)) &&
    !isStaticFile(path)
  );
}

export function bypassesDetector(request, env) {
  const category = request.cf?.verifiedBotCategory;
  if (typeof category === 'string' && category !== '') return true;
  const organization = String(request.cf?.asOrganization || '').toLowerCase();
  if (RELAY_ORGANIZATION.test(organization)) return true;
  return !request.headers.get('cf-connecting-ip') || !env.HASH_KEY;
}

export async function digest(key, value) {
  const enc = new TextEncoder();
  const hmac = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const out = await crypto.subtle.sign('HMAC', hmac, enc.encode(value));
  return [...new Uint8Array(out)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export function blocked(reason) {
  return new Response(BLOCKED_MESSAGE, {
    status: 429,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': reason === 'coordinated-pattern' ? '900' : '10',
      'x-truckfull-security': reason,
    },
  });
}

export function denyCrawler(reason) {
  const message = reason === 'commercial' ? COMMERCIAL_MESSAGE : 'Automated access is blocked.';
  return new Response(message, {
    status: 403,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-truckfull-security': reason,
    },
  });
}

export function crawlerDenial(request) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  if (ua.includes('shap')) return denyCrawler('shap');
  if (ua.includes('commercial')) return denyCrawler('commercial');
  return null;
}
