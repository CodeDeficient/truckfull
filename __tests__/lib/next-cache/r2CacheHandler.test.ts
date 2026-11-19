import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createR2CacheHandler } from '../../../lib/next-cache/r2CacheHandler.mjs';
import { deserializeEntry, serializeEntry } from '../../../lib/next-cache/serialize.mjs';

type StoredEntry = { lastModified: number; value: unknown };

type TagRecord = { stale?: number; expired?: number };

interface RemoteCall {
  readonly url: string;
  readonly method: string;
  readonly body: string | undefined;
}

const ORIGIN = 'http://next-cache.internal';
const BUILD_ID = 'build-1';
const SERVER_DIST_DIR = '/app/.next/server';
const DAY_MS = 24 * 60 * 60 * 1000;
const WRITTEN_AT = Date.now() - 60_000;

const sha256 = (key: string): string => createHash('sha256').update(key).digest('hex');

const urlFor = (remoteKey: string): string => `${ORIGIN}/object/${encodeURIComponent(remoteKey)}`;

const remoteKeyOf = (url: string): string =>
  decodeURIComponent(url.slice(`${ORIGIN}/object/`.length));

const response = (status: number, body: string) => ({
  status,
  ok: status >= 200 && status < 300,
  text: async () => body,
});

const createFakeBase = () => {
  class FakeBase {
    static memoryCache: Map<string, StoredEntry> | undefined = new Map();

    readonly ctx: unknown;

    constructor(ctx: unknown) {
      this.ctx = ctx;
    }

    async get(key: string): Promise<unknown> {
      const entry = FakeBase.memoryCache?.get(key);
      return entry === undefined ? null : entry.value;
    }

    async set(key: string, data: unknown): Promise<void> {
      FakeBase.memoryCache?.set(key, { lastModified: Date.now(), value: data });
    }

    async revalidateTag(): Promise<void> {}

    resetRequestCache(): void {}
  }

  return FakeBase;
};

const createRemoteFake = () => {
  const store = new Map<string, string>();
  const calls: RemoteCall[] = [];
  let failGets = false;
  let putStatus = 200;
  const failingUrls = new Set<string>();

  const fetchImpl = jest.fn(async (url: string, init: RequestInit) => {
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? init.body : undefined;
    calls.push({ url, method, body });
    if (method === 'GET' && (failGets || failingUrls.has(url))) throw new Error('network down');
    if (method === 'PUT') {
      if (putStatus !== 200) return response(putStatus, '');
      store.set(url, body ?? '');
      return response(200, '');
    }
    const stored = store.get(url);
    return stored === undefined ? response(404, '') : response(200, stored);
  });

  return {
    store,
    calls,
    fetchImpl,
    failGets: () => {
      failGets = true;
    },
    failPutsWith: (status: number) => {
      putStatus = status;
    },
    failGetsFor: (remoteKey: string) => {
      failingUrls.add(urlFor(remoteKey));
    },
    callsTo: (method: string, remoteKey: string): RemoteCall[] =>
      calls.filter((call) => call.method === method && call.url === urlFor(remoteKey)),
    puts: (): RemoteCall[] => calls.filter((call) => call.method === 'PUT'),
  };
};

const settle = async (): Promise<void> => {
  for (let index = 0; index < 50; index += 1) {
    await Promise.resolve();
  }
};

interface HandlerOptions {
  enabled?: boolean;
  buildId?: string | null;
  tagsManifest?: Map<string, TagRecord>;
  cacheControls?: Map<string, unknown>;
}

const createHandlerUnderTest = (
  remote: ReturnType<typeof createRemoteFake>,
  options: HandlerOptions = {},
) => {
  const Base = createFakeBase();
  const tagsManifest = options.tagsManifest ?? new Map<string, TagRecord>();
  const cacheControls = options.cacheControls ?? new Map<string, unknown>();
  const buildId = options.buildId === undefined ? BUILD_ID : options.buildId;
  const Handler = createR2CacheHandler({
    Base,
    tagsManifest,
    cacheControls,
    fetchImpl: remote.fetchImpl,
    origin: ORIGIN,
    enabled: options.enabled ?? true,
    readBuildId: () => buildId,
  });
  const instance = new Handler({ serverDistDir: SERVER_DIST_DIR });
  return { Base, Handler, instance, tagsManifest, cacheControls };
};

const fetchEntry = (value: unknown, cacheControl?: unknown, lastModified = WRITTEN_AT): string =>
  serializeEntry({ lastModified, value, cacheControl });

describe('r2CacheHandler', () => {
  let remote: ReturnType<typeof createRemoteFake>;

  beforeEach(() => {
    remote = createRemoteFake();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get', () => {
    it('returns a local hit without touching the remote', async () => {
      const { Base, instance } = createHandlerUnderTest(remote);
      Base.memoryCache?.set('k', { lastModified: 1, value: { kind: 'FETCH', n: 1 } });

      await expect(instance.get('k', { kind: 'FETCH' })).resolves.toEqual({ kind: 'FETCH', n: 1 });
      expect(remote.calls).toHaveLength(0);
    });

    it('never reaches the remote when disabled', async () => {
      const { instance } = createHandlerUnderTest(remote, { enabled: false });

      await expect(instance.get('k', { kind: 'FETCH' })).resolves.toBeNull();
      expect(remote.calls).toHaveLength(0);
    });

    it('loads a FETCH miss from the remote into memory and returns it via super.get', async () => {
      const key = 'https://api.example.com/trucks';
      const value = { kind: 'FETCH', data: { body: Buffer.from('payload') }, tags: ['trucks'] };
      remote.store.set(urlFor(`v1/data/${sha256(key)}`), fetchEntry(value));
      const { Base, instance } = createHandlerUnderTest(remote);

      const result = await instance.get(key, { kind: 'FETCH' });

      expect(result).toEqual(value);
      expect(Base.memoryCache?.get(key)).toEqual({ lastModified: WRITTEN_AT, value });
    });

    it('returns null when the remote object is missing', async () => {
      const { instance } = createHandlerUnderTest(remote);

      await expect(instance.get('missing', { kind: 'FETCH' })).resolves.toBeNull();
    });

    it('returns null instead of throwing when the remote fetch rejects', async () => {
      remote.failGets();
      const { instance } = createHandlerUnderTest(remote);

      await expect(instance.get('k', { kind: 'FETCH' })).resolves.toBeNull();
    });

    it('ignores a remote entry written more than seven days ago', async () => {
      const key = 'https://api.example.com/old';
      remote.store.set(
        urlFor(`v1/data/${sha256(key)}`),
        fetchEntry({ kind: 'FETCH', n: 1 }, undefined, Date.now() - 7 * DAY_MS - 60_000),
      );
      const { Base, instance } = createHandlerUnderTest(remote);

      await expect(instance.get(key, { kind: 'FETCH' })).resolves.toBeNull();
      expect(Base.memoryCache?.has(key)).toBe(false);
    });

    it('returns null for a malformed remote entry', async () => {
      remote.store.set(urlFor(`v1/data/${sha256('bad')}`), '{"lastModified":"x"}');
      const { instance } = createHandlerUnderTest(remote);

      await expect(instance.get('bad', { kind: 'FETCH' })).resolves.toBeNull();
    });

    it('never fetches PAGES or IMAGE kinds remotely', async () => {
      const { instance } = createHandlerUnderTest(remote);

      await expect(instance.get('p', { kind: 'PAGES' })).resolves.toBeNull();
      await expect(instance.get('i', { kind: 'IMAGE' })).resolves.toBeNull();
      expect(remote.calls).toHaveLength(0);
    });

    it('does not fetch APP_PAGE when no build id is available', async () => {
      const { instance } = createHandlerUnderTest(remote, { buildId: null });

      await expect(instance.get('page', { kind: 'APP_PAGE' })).resolves.toBeNull();
      expect(remote.calls).toHaveLength(0);
    });

    it('loads the tags manifest once across multiple gets', async () => {
      const { instance } = createHandlerUnderTest(remote);

      await instance.get('a', { kind: 'FETCH' });
      await instance.get('b', { kind: 'FETCH' });
      await instance.get('c', { kind: 'APP_PAGE' });

      const tagReads = remote.callsTo('GET', 'v1/tags.json');
      expect(tagReads).toHaveLength(1);
    });

    it('restores the cache lifetime of an APP_PAGE loaded from the remote', async () => {
      const key = '/trucks/x';
      const cacheControl = { revalidate: 86400, expire: 31536000 };
      remote.store.set(
        urlFor(`v1/pages/${BUILD_ID}/${sha256(key)}`),
        fetchEntry({ kind: 'APP_PAGE', html: '<p>x</p>' }, cacheControl),
      );
      const { cacheControls, instance } = createHandlerUnderTest(remote);

      await instance.get(key, { kind: 'APP_PAGE' });

      expect(cacheControls.get(key)).toEqual(cacheControl);
    });

    it('keeps an existing cache lifetime instead of overwriting it', async () => {
      const key = '/trucks/y';
      remote.store.set(
        urlFor(`v1/pages/${BUILD_ID}/${sha256(key)}`),
        fetchEntry({ kind: 'APP_PAGE', html: '' }, { revalidate: 86400, expire: 31536000 }),
      );
      const cacheControls = new Map<string, unknown>([[key, { revalidate: 60 }]]);
      const { instance } = createHandlerUnderTest(remote, { cacheControls });

      await instance.get(key, { kind: 'APP_PAGE' });

      expect(cacheControls.get(key)).toEqual({ revalidate: 60 });
    });

    it('treats a failed tags load as a miss instead of serving the remote entry', async () => {
      const key = 'https://api.example.com/trucks';
      remote.store.set(urlFor(`v1/data/${sha256(key)}`), fetchEntry({ kind: 'FETCH', n: 1 }));
      remote.failGetsFor('v1/tags.json');
      const { instance } = createHandlerUnderTest(remote);

      await expect(instance.get(key, { kind: 'FETCH' })).resolves.toBeNull();
      expect(remote.callsTo('GET', `v1/data/${sha256(key)}`)).toHaveLength(0);
    });

    it('backs off for 30 seconds after a failed tags load before retrying', async () => {
      jest.useFakeTimers({ now: 1_000_000 });
      remote.failGetsFor('v1/tags.json');
      const { instance } = createHandlerUnderTest(remote);

      await instance.get('a', { kind: 'FETCH' });
      await instance.get('b', { kind: 'FETCH' });
      expect(remote.callsTo('GET', 'v1/tags.json')).toHaveLength(1);

      jest.setSystemTime(1_000_000 + 30_001);
      await instance.get('c', { kind: 'FETCH' });
      expect(remote.callsTo('GET', 'v1/tags.json')).toHaveLength(2);
    });
  });

  describe('set', () => {
    it('PUTs a FETCH entry under v1/data with a sha256 key', async () => {
      const { instance } = createHandlerUnderTest(remote);
      const key = 'https://api.example.com/x';

      await instance.set(key, { kind: 'FETCH', data: { body: 'x' } }, { tags: [] });
      await settle();

      const puts = remote.puts();
      expect(puts).toHaveLength(1);
      const [put] = puts;
      expect(put?.method).toBe('PUT');
      expect(remoteKeyOf(put?.url ?? '')).toMatch(/^v1\/data\/[0-9a-f]{64}$/);
      expect(remoteKeyOf(put?.url ?? '')).toBe(`v1/data/${sha256(key)}`);
      expect(JSON.parse(put?.body ?? '')).toMatchObject({
        lastModified: expect.any(Number),
        value: { kind: 'FETCH', data: { body: 'x' } },
      });
    });

    it('returns from set without waiting for a stalled or failing remote write', async () => {
      const { instance } = createHandlerUnderTest(remote);
      remote.fetchImpl.mockImplementationOnce(() => new Promise(() => {}));
      const stalled = instance.set('https://api.example.com/slow', { kind: 'FETCH', data: {} }, {});
      const outcome = await Promise.race([
        stalled.then(() => 'returned'),
        new Promise((resolve) => setTimeout(() => resolve('waited'), 50)),
      ]);
      expect(outcome).toBe('returned');

      remote.failPutsWith(500);
      await expect(
        instance.set('https://api.example.com/x', { kind: 'FETCH', data: {} }, {}),
      ).resolves.toBeUndefined();
      await settle();
      expect(remote.fetchImpl).toHaveBeenCalledTimes(2);
      expect(remote.puts()).toHaveLength(1);
    });

    it('persists a FETCH entry larger than 5 MB so a growing catalog is not left stale', async () => {
      const { instance } = createHandlerUnderTest(remote);

      await instance.set(
        'catalog',
        { kind: 'FETCH', data: { body: 'x'.repeat(6 * 1024 * 1024) } },
        {
          tags: [],
        },
      );
      await settle();

      expect(remote.puts()).toHaveLength(1);
    });

    it('skips an entry larger than 16 MB', async () => {
      const { instance } = createHandlerUnderTest(remote);

      await instance.set(
        'huge',
        { kind: 'FETCH', data: { body: 'x'.repeat(17 * 1024 * 1024) } },
        {
          tags: [],
        },
      );
      await settle();

      expect(remote.puts()).toHaveLength(0);
    });

    it('PUTs an APP_PAGE entry under v1/pages/<buildId>/', async () => {
      const { instance } = createHandlerUnderTest(remote);

      await instance.set('/trucks/x', { kind: 'APP_PAGE', html: '<p>x</p>' }, { tags: [] });
      await settle();

      const [put] = remote.puts();
      expect(remoteKeyOf(put?.url ?? '')).toBe(`v1/pages/${BUILD_ID}/${sha256('/trucks/x')}`);
    });

    it('persists the APP_PAGE cache lifetime alongside the entry', async () => {
      const { instance } = createHandlerUnderTest(remote);
      const cacheControl = { revalidate: 86400, expire: 31536000 };

      await instance.set(
        '/trucks/z',
        { kind: 'APP_PAGE', html: '<p>z</p>' },
        { tags: [], cacheControl },
      );
      await settle();

      const [put] = remote.puts();
      expect(deserializeEntry(put?.body ?? '')).toMatchObject({ cacheControl });
    });

    it('never persists a cache lifetime for FETCH entries', async () => {
      const { instance } = createHandlerUnderTest(remote);

      await instance.set(
        'https://api.example.com/y',
        { kind: 'FETCH', data: {} },
        { tags: [], cacheControl: { revalidate: 60 } },
      );
      await settle();

      const [put] = remote.puts();
      expect(deserializeEntry(put?.body ?? '')).not.toHaveProperty('cacheControl');
    });

    it('does not persist APP_PAGE when the build id is unavailable', async () => {
      const { instance } = createHandlerUnderTest(remote, { buildId: null });

      await instance.set('/p', { kind: 'APP_PAGE', html: '' }, { tags: [] });
      await settle();

      expect(remote.puts()).toHaveLength(0);
    });

    it('never persists PAGES or IMAGE kinds', async () => {
      const { instance } = createHandlerUnderTest(remote);

      await instance.set('/a', { kind: 'PAGES', html: '' }, { tags: [] });
      await instance.set('/b', { kind: 'IMAGE', buffer: Buffer.from('i') }, { tags: [] });
      await settle();

      expect(remote.puts()).toHaveLength(0);
    });

    it('never persists fallback renders', async () => {
      const { instance } = createHandlerUnderTest(remote);

      await instance.set(
        '/fallback',
        { kind: 'APP_PAGE', html: '' },
        { isFallback: true, tags: [] },
      );
      await settle();

      expect(remote.puts()).toHaveLength(0);
    });

    it('never persists when disabled', async () => {
      const { instance } = createHandlerUnderTest(remote, { enabled: false });

      await instance.set('k', { kind: 'FETCH', data: {} }, { tags: [] });
      await settle();

      expect(remote.calls).toHaveLength(0);
    });
  });

  describe('revalidateTag', () => {
    it('debounces flushes into one tags.json PUT that merges remote tags by max', async () => {
      jest.useFakeTimers();
      const t = Date.now() - DAY_MS;
      remote.store.set(
        urlFor('v1/tags.json'),
        JSON.stringify({ trucks: { stale: t + 3, expired: t + 20 }, events: { stale: t + 1 } }),
      );
      const tagsManifest = new Map<string, TagRecord>([['trucks', { stale: t + 5 }]]);
      const { instance } = createHandlerUnderTest(remote, { tagsManifest });

      await instance.revalidateTag(['trucks'], undefined);
      await instance.revalidateTag(['trucks'], undefined);
      await instance.revalidateTag(['events'], undefined);
      expect(remote.callsTo('PUT', 'v1/tags.json')).toHaveLength(0);

      await jest.advanceTimersByTimeAsync(2_000);
      await settle();

      const tagPuts = remote.callsTo('PUT', 'v1/tags.json');
      expect(tagPuts).toHaveLength(1);
      expect(JSON.parse(tagPuts[0]?.body ?? '')).toEqual({
        trucks: { stale: t + 5, expired: t + 20 },
        events: { stale: t + 1 },
      });
    });

    it('drops tag records older than seven days from the flushed manifest', async () => {
      jest.useFakeTimers();
      const old = Date.now() - 7 * DAY_MS - 60_000;
      const recent = Date.now() - DAY_MS;
      remote.store.set(
        urlFor('v1/tags.json'),
        JSON.stringify({ gone: { stale: old, expired: old }, kept: { stale: old, expired: recent } }),
      );
      const tagsManifest = new Map<string, TagRecord>([['local-old', { expired: old }]]);
      const { instance } = createHandlerUnderTest(remote, { tagsManifest });

      await instance.revalidateTag(['kept'], undefined);
      await jest.advanceTimersByTimeAsync(2_000);
      await settle();

      const [put] = remote.callsTo('PUT', 'v1/tags.json');
      expect(JSON.parse(put?.body ?? '')).toEqual({ kept: { stale: old, expired: recent } });
      expect(tagsManifest.get('local-old')).toEqual({ expired: old });
    });

    it('logs why a tags flush failed', async () => {
      jest.useFakeTimers();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      remote.failPutsWith(413);
      const { instance } = createHandlerUnderTest(remote);

      await instance.revalidateTag(['trucks'], undefined);
      await jest.advanceTimersByTimeAsync(2_000);
      await settle();

      expect(warn).toHaveBeenCalledWith('[r2-cache] tags flush failed: remote write status 413');
      warn.mockRestore();
    });

    it('does not flush when disabled', async () => {
      jest.useFakeTimers();
      const { instance } = createHandlerUnderTest(remote, { enabled: false });

      await instance.revalidateTag(['trucks'], undefined);
      await jest.advanceTimersByTimeAsync(5_000);
      await settle();

      expect(remote.calls).toHaveLength(0);
    });
  });
});
