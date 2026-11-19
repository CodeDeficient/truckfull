/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import {
  BUILD_NOTE_SECONDS,
  EDGE_CACHE_HEADER,
  PAGE_FRESH_SECONDS,
  PAGE_REVALIDATE_SECONDS,
  SHARED_PAGE_FRESH_SECONDS,
  buildIdOf,
  createEdgePageCache,
  isCacheablePageRequest,
  isShareableResponse,
} from '../../worker/edgePageCache.mjs';

const SITE = 'https://www.truckfull.food';
const SHAREABLE = 's-maxage=86400, stale-while-revalidate=31449600';

function page(build: string, body = 'truck page'): string {
  return `<html><body>${body}<script>self.__next_f.push([1,"0:{\\"b\\":\\"${build}\\"}"])</script></body></html>`;
}

function html(
  body: string,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': SHAREABLE,
      ...init.headers,
    },
  });
}

function memoryCache() {
  const entries = new Map<string, Response>();
  return {
    entries,
    match: (key: Request): Promise<Response | undefined> =>
      Promise.resolve(entries.get(key.url)?.clone()),
    put: async (key: Request, response: Response): Promise<void> => {
      entries.set(key.url, response.clone());
    },
    delete: async (key: Request): Promise<boolean> => entries.delete(key.url),
  };
}

function harness(origin: (request: Request) => Promise<Response>, waitLimitMs = 8000) {
  const cache = memoryCache();
  const clock = { now: 1_000_000 };
  const tasks: Promise<unknown>[] = [];
  const calls: string[] = [];
  const serve = createEdgePageCache({ cache, now: () => clock.now, waitLimitMs });
  const countingOrigin = (request: Request): Promise<Response> => {
    calls.push(request.url);
    return origin(request);
  };
  const get = (path: string, headers: Record<string, string> = {}): Promise<Response> => {
    const request = new Request(`${SITE}${path}`, { headers });
    return serve(request, new URL(request.url), countingOrigin, (task: Promise<unknown>) => {
      tasks.push(task);
    });
  };
  const settle = async (): Promise<void> => {
    while (tasks.length > 0) await Promise.all(tasks.splice(0));
  };
  return { cache, clock, calls, get, settle };
}

describe('isCacheablePageRequest', () => {
  const allowed = (path: string, init: RequestInit = {}): boolean => {
    const request = new Request(`${SITE}${path}`, init);
    return isCacheablePageRequest(request, new URL(request.url));
  };

  it('accepts a plain signed-out page load', () => {
    expect(allowed('/smoke-stack-bar-b-q', { headers: { cookie: 'ph_session=1' } })).toBe(true);
  });

  it('refuses signed-in visitors, prefetches, queries, non-GET and private areas', () => {
    expect(allowed('/lakeo', { headers: { cookie: 'a=1; sb-abcdef-auth-token=x' } })).toBe(false);
    expect(allowed('/lakeo', { headers: { rsc: '1' } })).toBe(false);
    expect(allowed('/lakeo', { headers: { 'next-router-prefetch': '1' } })).toBe(false);
    expect(allowed('/lakeo', { headers: { authorization: 'Basic eA==' } })).toBe(false);
    expect(allowed('/lakeo', { headers: { upgrade: 'websocket' } })).toBe(false);
    expect(allowed('/lakeo?_rsc=abc')).toBe(false);
    expect(allowed('/lakeo', { method: 'POST' })).toBe(false);
    for (const path of [
      '/api/trucks',
      '/_next/data/x',
      '/owner-dashboard',
      '/admin/users',
      '/auth/callback',
    ]) {
      expect(allowed(path)).toBe(false);
    }
  });
});

describe('isShareableResponse', () => {
  it('only shares public HTML that Next marks for shared caches', () => {
    expect(isShareableResponse(html('x'))).toBe(true);
    expect(
      isShareableResponse(html('x', { headers: { 'cache-control': 'private, no-store' } })),
    ).toBe(false);
    expect(isShareableResponse(html('x', { headers: { 'cache-control': 'max-age=60' } }))).toBe(
      false,
    );
    expect(isShareableResponse(html('x', { headers: { 'set-cookie': 'a=1' } }))).toBe(false);
    expect(isShareableResponse(html('x', { status: 404 }))).toBe(false);
    expect(
      isShareableResponse(html('x', { headers: { 'content-type': 'application/json' } })),
    ).toBe(false);
  });
});

describe('visitor-independent pages', () => {
  const dynamic = {
    headers: { 'cache-control': 'private, no-cache, no-store, max-age=0, must-revalidate' },
  };

  it('shares the visitor-independent pages even though Next renders them per request', () => {
    expect(isShareableResponse(html('x', dynamic), '/')).toBe(true);
    expect(isShareableResponse(html('x', dynamic), '/trucks')).toBe(true);
    expect(isShareableResponse(html('x', dynamic), '/events')).toBe(true);
    expect(isShareableResponse(html('x', dynamic), '/pricing')).toBe(true);
    expect(isShareableResponse(html('x', dynamic), '/about')).toBe(false);
    expect(isShareableResponse(html('x', dynamic), '/trucks/extra')).toBe(false);
  });

  it('still refuses cookies, errors and non-HTML on those paths', () => {
    const withCookie = { headers: { ...dynamic.headers, 'set-cookie': 'a=1' } };
    expect(isShareableResponse(html('x', withCookie), '/')).toBe(false);
    expect(isShareableResponse(html('x', { ...dynamic, status: 500 }), '/')).toBe(false);
    const json = { headers: { ...dynamic.headers, 'content-type': 'application/json' } };
    expect(isShareableResponse(html('x', json), '/trucks')).toBe(false);
  });

  it('saves the home page and gives browsers the original private header', async () => {
    const { calls, get, settle } = harness(() =>
      Promise.resolve(html(page('BUILD-AAAAAA'), dynamic)),
    );
    await get('/');
    await settle();
    const second = await get('/');
    expect(second.headers.get(EDGE_CACHE_HEADER)).toBe('HIT');
    expect(second.headers.get('cache-control')).toBe(dynamic.headers['cache-control']);
    expect(calls).toHaveLength(1);
  });

  it('never saves the home page for a signed-in visitor', async () => {
    const { cache, get, settle } = harness(() =>
      Promise.resolve(html(page('BUILD-AAAAAA'), dynamic)),
    );
    await get('/', { cookie: 'sb-abcdef-auth-token=x' });
    await settle();
    expect(cache.entries.size).toBe(0);
  });
});

describe('buildIdOf', () => {
  it('reads the build id from the flight payload', () => {
    expect(buildIdOf(page('LNqW9qAZLekWtaIV9Rwft'))).toBe('LNqW9qAZLekWtaIV9Rwft');
    expect(buildIdOf('<html></html>')).toBeNull();
  });
});

describe('createEdgePageCache', () => {
  it('stores a shareable page once and serves repeat visits from the edge', async () => {
    const { calls, get, settle } = harness(() => Promise.resolve(html(page('BUILD-AAAAAA'))));
    const first = await get('/lakeo');
    await settle();
    const second = await get('/lakeo');
    expect(first.headers.get(EDGE_CACHE_HEADER)).toBe('MISS');
    expect(second.headers.get(EDGE_CACHE_HEADER)).toBe('HIT');
    expect(second.headers.get('cache-control')).toBe(SHAREABLE);
    expect(second.headers.get('x-truckfull-stored-at')).toBeNull();
    expect(await second.text()).toBe(page('BUILD-AAAAAA'));
    expect(calls).toHaveLength(1);
  });

  it('never stores private pages', async () => {
    const { cache, calls, get, settle } = harness(() =>
      Promise.resolve(
        html(page('BUILD-AAAAAA'), { headers: { 'cache-control': 'private, no-store' } }),
      ),
    );
    expect((await get('/about')).headers.get(EDGE_CACHE_HEADER)).toBe('BYPASS');
    await settle();
    await get('/about');
    expect(cache.entries.size).toBe(0);
    expect(calls).toHaveLength(2);
  });

  it('serves a copy older than the fresh window while refreshing it once in the background', async () => {
    let version = 'old';
    const { clock, calls, get, settle } = harness(() =>
      Promise.resolve(html(page('BUILD-AAAAAA', version))),
    );
    await get('/lakeo');
    await settle();
    clock.now += (PAGE_FRESH_SECONDS + 1) * 1000;
    version = 'new';
    const [a, b] = await Promise.all([get('/lakeo'), get('/lakeo')]);
    expect(a.headers.get(EDGE_CACHE_HEADER)).toBe('STALE');
    expect(b.headers.get(EDGE_CACHE_HEADER)).toBe('STALE');
    await settle();
    expect(calls).toHaveLength(2);
    expect(await (await get('/lakeo')).text()).toContain('new');
  });

  it('keeps the per-request shared pages fresh longer so they are rebuilt less often', async () => {
    let version = 'old';
    const { clock, calls, get, settle } = harness(() =>
      Promise.resolve(
        html(page('BUILD-AAAAAA', version), {
          headers: { 'cache-control': 'private, no-cache, no-store, max-age=0, must-revalidate' },
        }),
      ),
    );
    await get('/');
    await settle();
    clock.now += (PAGE_FRESH_SECONDS + 1) * 1000;
    version = 'new';
    expect((await get('/')).headers.get(EDGE_CACHE_HEADER)).toBe('HIT');
    await settle();
    expect(calls).toHaveLength(1);
    clock.now = 1_000_000 + (SHARED_PAGE_FRESH_SECONDS + 1) * 1000;
    expect((await get('/')).headers.get(EDGE_CACHE_HEADER)).toBe('STALE');
    await settle();
    expect(calls).toHaveLength(2);
    expect(await (await get('/')).text()).toContain('new');
  });

  it('waits for the app when the stored copy is too old to serve normally', async () => {
    const { clock, calls, get, settle } = harness(() =>
      Promise.resolve(html(page('BUILD-AAAAAA'))),
    );
    await get('/lakeo');
    await settle();
    clock.now += (PAGE_REVALIDATE_SECONDS + 1) * 1000;
    expect((await get('/lakeo')).headers.get(EDGE_CACHE_HEADER)).toBe('MISS');
    expect(calls).toHaveLength(2);
  });

  it('serves the stored copy when the app errors, refuses with 503, or stalls', async () => {
    let mode: 'ok' | 'error' | 'busy' | 'stall' = 'ok';
    const origin = (): Promise<Response> => {
      if (mode === 'error') return Promise.reject(new Error('container gone'));
      if (mode === 'busy') return Promise.resolve(new Response('busy', { status: 503 }));
      if (mode === 'stall') return new Promise(() => {});
      return Promise.resolve(html(page('BUILD-AAAAAA')));
    };
    const { clock, get, settle } = harness(origin, 20);
    await get('/lakeo');
    await settle();
    clock.now += (PAGE_REVALIDATE_SECONDS + 1) * 1000;
    for (const failure of ['error', 'busy', 'stall'] as const) {
      mode = failure;
      const response = await get('/lakeo');
      expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('STALE-ERROR');
      expect(response.status).toBe(200);
    }
  });

  it('picks up the recovered app once the outage ends', async () => {
    let mode: 'ok' | 'down' | 'slow-recovery' | 'recovered' = 'ok';
    const origin = (): Promise<Response> => {
      if (mode === 'down') return Promise.reject(new Error('container restarting'));
      if (mode === 'slow-recovery')
        return new Promise((resolve) => {
          setTimeout(() => resolve(html(page('BUILD-AAAAAA', 'back up'))), 40);
        });
      return Promise.resolve(html(page('BUILD-AAAAAA', mode === 'ok' ? 'before' : 'after')));
    };
    const { clock, get, settle } = harness(origin, 10);
    await get('/lakeo');
    await settle();
    clock.now += (PAGE_REVALIDATE_SECONDS + 1) * 1000;
    mode = 'down';
    const during = await get('/lakeo');
    expect(during.headers.get(EDGE_CACHE_HEADER)).toBe('STALE-ERROR');
    expect(await during.text()).toContain('before');
    mode = 'slow-recovery';
    expect((await get('/lakeo')).headers.get(EDGE_CACHE_HEADER)).toBe('STALE-ERROR');
    await settle();
    mode = 'recovered';
    const after = await get('/lakeo');
    expect(after.headers.get(EDGE_CACHE_HEADER)).toBe('HIT');
    expect(await after.text()).toContain('back up');
  });

  it('passes app failures through when nothing is stored', async () => {
    const { get } = harness(() => Promise.reject(new Error('container gone')));
    await expect(get('/lakeo')).rejects.toThrow('container gone');
    const busy = harness(() => Promise.resolve(new Response('busy', { status: 503 })));
    expect((await busy.get('/lakeo')).status).toBe(503);
  });

  it('drops the stored copy once the app says the page is gone or moved', async () => {
    let status = 200;
    const { cache, clock, get, settle } = harness(() =>
      Promise.resolve(
        status === 200 ? html(page('BUILD-AAAAAA')) : new Response('gone', { status }),
      ),
    );
    await get('/lakeo');
    await settle();
    clock.now += (PAGE_FRESH_SECONDS + 1) * 1000;
    status = 404;
    expect((await get('/lakeo')).headers.get(EDGE_CACHE_HEADER)).toBe('STALE');
    await settle();
    expect(cache.entries.has(`${SITE}/lakeo`)).toBe(false);
    expect((await get('/lakeo')).status).toBe(404);
  });

  it('stops serving copies from an older build once a newer build is seen', async () => {
    let build = 'BUILD-AAAAAA';
    const { calls, get, settle } = harness(() => Promise.resolve(html(page(build))));
    await get('/lakeo');
    await settle();
    build = 'BUILD-BBBBBB';
    await get('/other-truck');
    await settle();
    const after = await get('/lakeo');
    expect(after.headers.get(EDGE_CACHE_HEADER)).toBe('MISS');
    expect(await after.text()).toContain('BUILD-BBBBBB');
    expect(calls).toHaveLength(3);
  });

  it('trusts a recent release note from another instance after a restart', async () => {
    const shared = memoryCache();
    const tasks: Promise<unknown>[] = [];
    const calls: string[] = [];
    const origin = (request: Request): Promise<Response> => {
      calls.push(request.url);
      return Promise.resolve(html(page('BUILD-AAAAAA')));
    };
    const request = new Request(`${SITE}/lakeo`);
    const track = (t: Promise<unknown>): void => {
      tasks.push(t);
    };
    const first = createEdgePageCache({ cache: shared, now: () => 1_000_000 });
    await first(request, new URL(request.url), origin, track);
    await Promise.all(tasks.splice(0));
    const restarted = createEdgePageCache({ cache: shared, now: () => 1_030_000 });
    const response = await restarted(request, new URL(request.url), origin, track);
    expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('HIT');
    expect(calls).toHaveLength(1);
  });

  it('asks the app again after a restart when the release note is old', async () => {
    const shared = memoryCache();
    const tasks: Promise<unknown>[] = [];
    const origin = (): Promise<Response> => Promise.resolve(html(page('BUILD-AAAAAA')));
    const request = new Request(`${SITE}/lakeo`);
    const track = (t: Promise<unknown>): void => {
      tasks.push(t);
    };
    const first = createEdgePageCache({ cache: shared, now: () => 1_000_000 });
    await first(request, new URL(request.url), origin, track);
    await Promise.all(tasks.splice(0));
    const later = 1_000_000 + (BUILD_NOTE_SECONDS + 1) * 1000;
    const restarted = createEdgePageCache({ cache: shared, now: () => later });
    const response = await restarted(request, new URL(request.url), origin, track);
    expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('MISS');
    await Promise.all(tasks.splice(0));
    const again = await restarted(request, new URL(request.url), origin, track);
    expect(again.headers.get(EDGE_CACHE_HEADER)).toBe('HIT');
  });

  function restartedAfter(seconds: number, firstRelease: string, nextRelease: string) {
    const shared = memoryCache();
    const tasks: Promise<unknown>[] = [];
    const calls: string[] = [];
    const origin = (request: Request): Promise<Response> => {
      calls.push(request.url);
      return Promise.resolve(html(page('BUILD-AAAAAA')));
    };
    const request = new Request(`${SITE}/`);
    const track = (t: Promise<unknown>): void => {
      tasks.push(t);
    };
    const run = async (): Promise<Response> => {
      const first = createEdgePageCache({
        cache: shared,
        now: () => 1_000_000,
        release: firstRelease,
      });
      await first(request, new URL(request.url), origin, track);
      await Promise.all(tasks.splice(0));
      const restarted = createEdgePageCache({
        cache: shared,
        now: () => 1_000_000 + seconds * 1000,
        release: nextRelease,
      });
      return restarted(request, new URL(request.url), origin, track);
    };
    return { calls, run };
  }

  it('trusts an older release note written by the same deploy', async () => {
    const { calls, run } = restartedAfter(BUILD_NOTE_SECONDS + 300, 'deploy-a', 'deploy-a');
    expect((await run()).headers.get(EDGE_CACHE_HEADER)).toBe('HIT');
    expect(calls).toHaveLength(1);
  });

  it('ignores the release note of an earlier deploy', async () => {
    const { calls, run } = restartedAfter(30, 'deploy-a', 'deploy-b');
    expect((await run()).headers.get(EDGE_CACHE_HEADER)).toBe('MISS');
    expect(calls).toHaveLength(2);
  });

  it('stops trusting a same-deploy note once a page would be refetched anyway', async () => {
    const { calls, run } = restartedAfter(PAGE_REVALIDATE_SECONDS + 1, 'deploy-a', 'deploy-a');
    expect((await run()).headers.get(EDGE_CACHE_HEADER)).toBe('MISS');
    expect(calls).toHaveLength(2);
  });

  it('falls back to the short note when the deploy id is not usable', async () => {
    const { calls, run } = restartedAfter(BUILD_NOTE_SECONDS + 1, '../x', '../x');
    expect((await run()).headers.get(EDGE_CACHE_HEADER)).toBe('MISS');
    expect(calls).toHaveLength(2);
  });

  it.each(['"><script>', 'BUILD-AAAAAA"><script>'])(
    'ignores a release note that is not a build id: %s',
    async (note) => {
      const shared = memoryCache();
      await shared.put(
        new Request(`${SITE}/__truckfull-edge-build`),
        new Response(note, { headers: { 'x-truckfull-stored-at': '1000000' } }),
      );
      const serve = createEdgePageCache({ cache: shared, now: () => 1_000_000 });
      const request = new Request(`${SITE}/lakeo`);
      const response = await serve(
        request,
        new URL(request.url),
        () => Promise.resolve(html(page('BUILD-AAAAAA'))),
        () => undefined,
      );
      expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('MISS');
    },
  );

  it('asks the app when the release note cannot be read', async () => {
    const broken = new Response('BUILD-AAAAAA', {
      headers: { 'x-truckfull-stored-at': '1000000' },
    });
    Object.defineProperty(broken, 'text', {
      value: () => Promise.reject(new Error('read failed')),
    });
    const cache = {
      match: (key: Request): Promise<Response | undefined> =>
        Promise.resolve(key.url.endsWith('/__truckfull-edge-build') ? broken : undefined),
      put: (): Promise<void> => Promise.resolve(),
      delete: (): Promise<boolean> => Promise.resolve(false),
    };
    const serve = createEdgePageCache({ cache, now: () => 1_000_000 });
    const request = new Request(`${SITE}/lakeo`);
    const response = await serve(
      request,
      new URL(request.url),
      () => Promise.resolve(html(page('BUILD-AAAAAA'))),
      () => undefined,
    );
    expect(response.headers.get(EDGE_CACHE_HEADER)).toBe('MISS');
  });

  it('drops encoding and length headers that no longer match the saved body', async () => {
    const { get, settle } = harness(() =>
      Promise.resolve(
        html(page('BUILD-AAAAAA'), {
          headers: { 'content-encoding': 'gzip', 'content-length': '7' },
        }),
      ),
    );
    const first = await get('/lakeo');
    await settle();
    const second = await get('/lakeo');
    for (const response of [first, second]) {
      expect(response.headers.get('content-encoding')).toBeNull();
      expect(response.headers.get('content-length')).toBeNull();
    }
  });
});
