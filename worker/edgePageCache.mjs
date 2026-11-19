export const PAGE_FRESH_SECONDS = 120;
export const SHARED_PAGE_FRESH_SECONDS = 600;
export const PAGE_REVALIDATE_SECONDS = 3600;
export const PAGE_STALE_IF_ERROR_SECONDS = 86_400;
export const ORIGIN_WAIT_MS = 8000;
export const BUILD_NOTE_SECONDS = 60;
export const EDGE_CACHE_HEADER = 'x-truckfull-edge-cache';

const STORED_AT = 'x-truckfull-stored-at';
const STORED_BUILD = 'x-truckfull-build';
const ORIGIN_CACHE_CONTROL = 'x-truckfull-origin-cache-control';
const SESSION_COOKIE = /(?:^|;\s*)sb-[A-Za-z0-9]+-auth-token/;
const ROUTER_HEADERS = [
  'rsc',
  'next-router-prefetch',
  'next-router-state-tree',
  'next-router-segment-prefetch',
];
const EXCLUDED_PREFIXES = [
  '/api/',
  '/_next/',
  '/cdn-cgi/',
  '/ingest/',
  '/auth/',
  '/admin',
  '/owner-dashboard',
  '/user-dashboard',
  '/organizer',
];
const BUILD_ID = /\\?"b\\?":\\?"([A-Za-z0-9_-]{10,})/;
const WHOLE_BUILD_ID = /^[A-Za-z0-9_-]{10,}$/;
const RELEASE_ID = /^[A-Za-z0-9-]{1,64}$/;
const TIMED_OUT = Symbol('origin-timed-out');
const VISITOR_INDEPENDENT_PATHS = new Set(['/', '/trucks', '/events', '/pricing']);
const GONE_STATUSES = new Set([301, 302, 307, 308, 404, 410]);

export function isCacheablePageRequest(request, url) {
  if (request.method !== 'GET' || url.search !== '') return false;
  if (EXCLUDED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return false;
  if (ROUTER_HEADERS.some((name) => request.headers.has(name))) return false;
  if (request.headers.has('authorization') || request.headers.has('upgrade')) return false;
  return !SESSION_COOKIE.test(request.headers.get('cookie') ?? '');
}

export function isAlwaysSharedPage(request, url) {
  return VISITOR_INDEPENDENT_PATHS.has(url.pathname) && isCacheablePageRequest(request, url);
}

export function isShareableResponse(response, pathname = '') {
  if (response.status !== 200 || response.headers.has('set-cookie')) return false;
  if (!/text\/html/i.test(response.headers.get('content-type') ?? '')) return false;
  if (VISITOR_INDEPENDENT_PATHS.has(pathname)) return true;
  const control = response.headers.get('cache-control') ?? '';
  return /\bs-maxage=\d+/i.test(control) && !/private|no-store|no-cache/i.test(control);
}

function freshSecondsFor(pathname) {
  return VISITOR_INDEPENDENT_PATHS.has(pathname) ? SHARED_PAGE_FRESH_SECONDS : PAGE_FRESH_SECONDS;
}

export function buildIdOf(html) {
  return BUILD_ID.exec(html)?.[1] ?? null;
}

function ageSeconds(stored, now) {
  const at = Number(stored.headers.get(STORED_AT));
  return Number.isFinite(at) ? (now - at) / 1000 : Infinity;
}

function labelled(response, status) {
  const result = new Response(response.body, response);
  const original = result.headers.get(ORIGIN_CACHE_CONTROL);
  if (original !== null) result.headers.set('cache-control', original);
  for (const name of [STORED_AT, STORED_BUILD, ORIGIN_CACHE_CONTROL]) result.headers.delete(name);
  result.headers.set(EDGE_CACHE_HEADER, status);
  return result;
}

function bodyHeaders(response) {
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return headers;
}

function storedCopy(response, html, build, now) {
  const headers = bodyHeaders(response);
  headers.set(ORIGIN_CACHE_CONTROL, headers.get('cache-control') ?? '');
  headers.set('cache-control', `public, max-age=${PAGE_STALE_IF_ERROR_SECONDS}`);
  headers.set(STORED_AT, String(now));
  headers.set(STORED_BUILD, build ?? '');
  headers.delete('vary');
  return new Response(html, { status: response.status, headers });
}

function isFailure(response) {
  return response === TIMED_OUT || response instanceof Error || response.status >= 500;
}

async function settled(promise) {
  try {
    return await promise;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

async function withinLimit(promise, limitMs) {
  let timer;
  const expiry = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), limitMs);
  });
  try {
    return await Promise.race([promise, expiry]);
  } finally {
    clearTimeout(timer);
  }
}

function buildNoteKey(pageUrl, release) {
  const suffix = release ? `/${release}` : '';
  return new Request(`${new URL(pageUrl).origin}/__truckfull-edge-build${suffix}`);
}

function noteSeconds(release) {
  return release ? PAGE_REVALIDATE_SECONDS : BUILD_NOTE_SECONDS;
}

function buildNote(build, at, release) {
  return new Response(build, {
    headers: {
      'cache-control': `public, max-age=${noteSeconds(release)}`,
      [STORED_AT]: String(at),
    },
  });
}

async function learnBuild(ctx, key) {
  const note = await ctx.cache.match(buildNoteKey(key.url, ctx.release)).catch(() => null);
  if (!note || ageSeconds(note, ctx.now()) >= noteSeconds(ctx.release)) return;
  const build = await note.text().catch(() => '');
  if (ctx.state.build === null && WHOLE_BUILD_ID.test(build)) ctx.state.build = build;
}

function keepResponse(ctx, key, response) {
  const { cache, state, now, waitUntil, release } = ctx;
  if (!isShareableResponse(response, new URL(key.url).pathname)) {
    if (GONE_STATUSES.has(response.status)) waitUntil(cache.delete(key).catch(() => null));
    return Promise.resolve(labelled(response, 'BYPASS'));
  }
  return response.text().then((html) => {
    const build = buildIdOf(html);
    if (build) {
      state.build = build;
      const note = buildNote(build, now(), release);
      waitUntil(cache.put(buildNoteKey(key.url, release), note).catch(() => null));
    }
    waitUntil(cache.put(key, storedCopy(response, html, build, now())).catch(() => null));
    return labelled(
      new Response(html, { status: response.status, headers: bodyHeaders(response) }),
      'MISS',
    );
  });
}

function refreshInBackground(ctx, request, key) {
  const { state, origin, waitUntil } = ctx;
  if (state.refreshing.has(key.url)) return;
  state.refreshing.add(key.url);
  const task = settled(origin(request))
    .then((response) => (isFailure(response) ? null : keepResponse(ctx, key, response)))
    .finally(() => state.refreshing.delete(key.url));
  waitUntil(task);
}

async function fromOrigin(ctx, request, key, stored, age) {
  const { origin, waitLimitMs, waitUntil } = ctx;
  const pending = settled(origin(request));
  const usable = stored && age < PAGE_STALE_IF_ERROR_SECONDS;
  const response = usable ? await withinLimit(pending, waitLimitMs) : await pending;
  if (usable && isFailure(response)) {
    waitUntil(pending.then((late) => (isFailure(late) ? null : keepResponse(ctx, key, late))));
    return labelled(stored, 'STALE-ERROR');
  }
  if (response instanceof Error) throw response;
  return keepResponse(ctx, key, response);
}

export function createEdgePageCache({
  cache,
  now = Date.now,
  waitLimitMs = ORIGIN_WAIT_MS,
  release = '',
}) {
  const state = { build: null, refreshing: new Set() };
  const trustedRelease = RELEASE_ID.test(release) ? release : '';
  return async function servePage(request, url, origin, waitUntil) {
    if (!isCacheablePageRequest(request, url)) return origin(request);
    const ctx = { cache, state, now, waitLimitMs, origin, waitUntil, release: trustedRelease };
    const key = new Request(`${url.origin}${url.pathname}`);
    if (state.build === null) await learnBuild(ctx, key);
    const stored = await cache.match(key).catch(() => null);
    const age = stored ? ageSeconds(stored, now()) : Infinity;
    const current =
      stored && state.build !== null && stored.headers.get(STORED_BUILD) === state.build;
    if (!current || age >= PAGE_REVALIDATE_SECONDS)
      return fromOrigin(ctx, request, key, stored, age);
    const fresh = age < freshSecondsFor(url.pathname);
    if (!fresh) refreshInBackground(ctx, request, key);
    return labelled(stored, fresh ? 'HIT' : 'STALE');
  };
}
