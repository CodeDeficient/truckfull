import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as fileSystemCacheModule from 'next/dist/server/lib/incremental-cache/file-system-cache.js';
import * as sharedCacheControlsModule from 'next/dist/server/lib/incremental-cache/shared-cache-controls.external.js';
import * as tagsManifestModule from 'next/dist/server/lib/incremental-cache/tags-manifest.external.js';
import { deserializeEntry, serializeEntry } from './serialize.mjs';
import { timedStage } from '../runtime/dependencyTiming.mjs';

// eslint-disable-next-line sonarjs/no-clear-text-protocols
const ORIGIN = 'http://next-cache.internal';
const TAGS_KEY = 'v1/tags.json';
const READ_TIMEOUT_MS = 1500;
const WRITE_TIMEOUT_MS = 5000;
const FLUSH_DELAY_MS = 2000;
const TAGS_RETRY_DELAY_MS = 30_000;
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_IN_FLIGHT_PUTS = 8;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const JSON_HEADERS = { 'content-type': 'application/json' };

const TAG_FIELDS = ['stale', 'expired'];

const readBuildIdFrom = (serverDistDir) => {
  try {
    return fs.readFileSync(path.join(serverDistDir, '..', 'BUILD_ID'), 'utf8').trim();
  } catch {
    return null;
  }
};

const unwrapModule = (mod) => {
  const exported = mod.default ?? mod;
  return exported.default ?? exported;
};

const hashKey = (key) => createHash('sha256').update(key).digest('hex');

const remoteKeyFor = (kind, key, buildId) => {
  if (kind === 'FETCH') return `v1/data/${hashKey(key)}`;
  if ((kind === 'APP_PAGE' || kind === 'APP_ROUTE') && buildId) {
    return `v1/pages/${buildId}/${hashKey(key)}`;
  }
  return null;
};

const isEntry = (entry) =>
  typeof entry === 'object' &&
  entry !== null &&
  typeof entry.lastModified === 'number' &&
  typeof entry.value === 'object' &&
  entry.value !== null;

const isTagRecord = (value) => typeof value === 'object' && value !== null;

const isRetained = (record, cutoff) =>
  TAG_FIELDS.some((field) => typeof record?.[field] === 'number' && record[field] >= cutoff);

const retainedTags = (tagsManifest, cutoff) =>
  Object.fromEntries([...tagsManifest].filter(([, record]) => isRetained(record, cutoff)));

const isPageKind = (kind) => kind === 'APP_PAGE' || kind === 'APP_ROUTE';

const isCacheControl = (value) =>
  typeof value === 'object' &&
  value !== null &&
  (typeof value.revalidate === 'number' || value.revalidate === false);

const maxNumber = (...values) => {
  const numbers = values.filter((value) => typeof value === 'number');
  return numbers.length > 0 ? Math.max(...numbers) : undefined;
};

const mergeTagRecord = (local, remote) => {
  const merged = { ...local };
  for (const field of TAG_FIELDS) {
    const value = maxNumber(local?.[field], remote?.[field]);
    if (value !== undefined) merged[field] = value;
  }
  return merged;
};

const warn = (message) => console.warn(`[r2-cache] ${message}`);

const reasonOf = (error) => (error instanceof Error ? error.message : String(error));

const createRemote = (fetchImpl, tagsManifest, origin) => {
  const urlFor = (remoteKey) => `${origin}/object/${encodeURIComponent(remoteKey)}`;

  const readText = async (remoteKey, timeoutMs) => {
    const response = await fetchImpl(urlFor(remoteKey), {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      status: response.status,
      text: response.status === 200 ? await response.text() : null,
    };
  };

  const writeText = async (remoteKey, text) => {
    const response = await fetchImpl(urlFor(remoteKey), {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: text,
      signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`remote write status ${response.status}`);
  };

  const readEntry = async (remoteKey) => {
    try {
      const { text } = await readText(remoteKey, READ_TIMEOUT_MS);
      if (text === null) return null;
      const entry = deserializeEntry(text);
      return isEntry(entry) && entry.lastModified >= Date.now() - RETENTION_MS ? entry : null;
    } catch {
      return null;
    }
  };

  const mergeRemoteTags = (remoteTags) => {
    for (const [tag, remoteRecord] of Object.entries(remoteTags)) {
      if (!isTagRecord(remoteRecord)) continue;
      tagsManifest.set(tag, mergeTagRecord(tagsManifest.get(tag), remoteRecord));
    }
  };

  const fetchRemoteTags = async () => {
    const { status, text } = await readText(TAGS_KEY, READ_TIMEOUT_MS);
    if (status === 404) return {};
    if (text === null) throw new Error(`remote tags status ${status}`);
    const parsed = JSON.parse(text);
    if (!isTagRecord(parsed)) throw new Error('remote tags malformed');
    return parsed;
  };

  const loadTags = async () => {
    mergeRemoteTags(await fetchRemoteTags());
  };

  const flushTags = async () => {
    await loadTags();
    const tags = retainedTags(tagsManifest, Date.now() - RETENTION_MS);
    await writeText(TAGS_KEY, JSON.stringify(tags));
  };

  return { readEntry, writeText, loadTags, flushTags };
};

export const createR2CacheHandler = ({
  Base,
  tagsManifest,
  cacheControls,
  fetchImpl,
  origin,
  enabled,
  readBuildId,
}) => {
  const remote = createRemote(fetchImpl, tagsManifest, origin);
  let inFlightPuts = 0;
  let flushTimer = null;

  const restoreCacheControl = (key, entry) => {
    if (!cacheControls || !isCacheControl(entry.cacheControl)) return;
    if (cacheControls.get(key) !== undefined) return;
    cacheControls.set(key, entry.cacheControl);
  };

  const putEntry = async (remoteKey, data, cacheControl) => {
    try {
      const record = { lastModified: Date.now(), value: data };
      if (cacheControl !== undefined) record.cacheControl = cacheControl;
      const text = serializeEntry(record);
      if (Buffer.byteLength(text) > MAX_ENTRY_BYTES) {
        warn('entry too large, not persisted');
        return;
      }
      await remote.writeText(remoteKey, text);
    } catch (error) {
      warn(`entry write failed: ${reasonOf(error)}`);
    }
  };

  const persistEntry = (remoteKey, data, cacheControl) => {
    if (inFlightPuts >= MAX_IN_FLIGHT_PUTS) return;
    inFlightPuts += 1;
    putEntry(remoteKey, data, cacheControl).finally(() => {
      inFlightPuts -= 1;
    });
  };

  const flushTagsSafely = async () => {
    try {
      await remote.flushTags();
    } catch (error) {
      warn(`tags flush failed: ${reasonOf(error)}`);
    }
  };

  const scheduleFlush = () => {
    if (flushTimer !== null) return;
    const timer = setTimeout(() => {
      flushTimer = null;
      flushTagsSafely();
    }, FLUSH_DELAY_MS);
    if (typeof timer.unref === 'function') timer.unref();
    flushTimer = timer;
  };

  class R2CacheHandler extends Base {
    static tagsLoad = null;

    static tagsRetryAt = 0;

    buildId;

    constructor(ctx) {
      super(ctx);
      this.buildId = readBuildId(ctx?.serverDistDir);
    }

    static async loadTagsOnce() {
      if (R2CacheHandler.tagsLoad === null && Date.now() < R2CacheHandler.tagsRetryAt) {
        return false;
      }
      R2CacheHandler.tagsLoad ??= remote.loadTags().then(
        () => true,
        () => {
          warn('tags load failed');
          R2CacheHandler.tagsLoad = null;
          R2CacheHandler.tagsRetryAt = Date.now() + TAGS_RETRY_DELAY_MS;
          return false;
        },
      );
      return R2CacheHandler.tagsLoad;
    }

    async get(key, ctx) {
      const local = await super.get(key, ctx);
      if (local || !enabled || Base.memoryCache === undefined) return local;
      const remoteKey = remoteKeyFor(ctx?.kind, key, this.buildId);
      if (remoteKey === null) return local;

      if (!(await R2CacheHandler.loadTagsOnce())) return null;
      const entry = await timedStage('r2', () => remote.readEntry(remoteKey));
      if (entry === null) return null;

      restoreCacheControl(key, entry);
      Base.memoryCache.set(key, { lastModified: entry.lastModified, value: entry.value });
      return super.get(key, ctx);
    }

    async set(key, data, ctx) {
      await super.set(key, data, ctx);
      if (!enabled || !data || ctx?.isFallback) return;
      const remoteKey = remoteKeyFor(data.kind, key, this.buildId);
      if (remoteKey === null) return;
      const cacheControl = ctx?.cacheControl;
      const persistedCacheControl =
        isPageKind(data.kind) && isCacheControl(cacheControl) ? cacheControl : undefined;
      persistEntry(remoteKey, data, persistedCacheControl);
    }

    async revalidateTag(tags, durations) {
      await super.revalidateTag(tags, durations);
      if (enabled) scheduleFlush();
    }
  }

  return R2CacheHandler;
};

const R2CacheHandler = createR2CacheHandler({
  Base: unwrapModule(fileSystemCacheModule),
  tagsManifest: unwrapModule(tagsManifestModule).tagsManifest,
  cacheControls: unwrapModule(sharedCacheControlsModule).SharedCacheControls?.cacheControls,
  fetchImpl: (...args) => globalThis.fetch(...args),
  origin: ORIGIN,
  enabled: process.env.NEXT_CACHE_R2 === 'on',
  readBuildId: readBuildIdFrom,
});

export default R2CacheHandler;
