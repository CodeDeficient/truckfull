import {
  buildInvalidationFetchInit,
  computeInvalidationRetryDelayMs,
  INVALIDATION_RETRY_MAX_ATTEMPTS,
  parseRetryAfterSeconds,
  resolveInvalidationCredentials,
  toEventCacheTarget,
  type InvalidationCredentials,
} from '@/lib/events/syncCacheTargets';
import { chunkEventCacheTargets, type EventCacheTarget } from '@/lib/events/eventPageInvalidation';
import type { EventCacheInvalidator } from '@/lib/events/eventCacheTargets';

const INVALIDATION_REQUEST_TIMEOUT_MS = 30_000;

class GlobalInvalidationAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GlobalInvalidationAuthError';
  }
}

/**
 * Script-facing adapter for the shared server invalidation funnel.
 *
 * Scripts mutate external_events rows (hide/delete/classify/vet/ingest), then
 * hand the affected EventCacheTarget identities to the returned invalidator,
 * which POSTs them to the existing authenticated /api/revalidate/event route
 * (chunked at 100, retry/backoff, all-or-nothing per chunk).
 *
 * Fail-open by design: scripts must never crash or roll back their DB work
 * because cache invalidation could not be delivered. When credentials are
 * missing (e.g. a laptop that only holds CRON_SECRET but not the edge secret),
 * a warning is logged and invalidation is skipped.
 */
export function buildScriptInvalidator(env: NodeJS.ProcessEnv): EventCacheInvalidator {
  const { NEXT_PUBLIC_APP_URL, CRON_SECRET } = env;
  const edgeSecret = env.TRUCKFULL_EDGE_SECRET;

  if (!NEXT_PUBLIC_APP_URL || !CRON_SECRET) {
    return () => {
      console.warn(
        '[WARN] Event cache invalidation skipped: NEXT_PUBLIC_APP_URL or CRON_SECRET not set in this script environment',
      );
      return Promise.resolve();
    };
  }
  if (!edgeSecret) {
    return () => {
      console.warn(
        '[WARN] Event cache invalidation skipped: TRUCKFULL_EDGE_SECRET not set in this script environment',
      );
      return Promise.resolve();
    };
  }

  const credentials = resolveInvalidationCredentials(env);
  let authFailureLatched = false;
  let authCheckComplete = false;
  let initialAuthCheck: Promise<void> | null = null;
  const runInvalidation = async (targets: readonly EventCacheTarget[]): Promise<void> => {
    try {
      await postTargetsChunked(targets, credentials);
    } catch (error) {
      if (error instanceof GlobalInvalidationAuthError) authFailureLatched = true;
      throw error;
    }
  };
  return async (targets) => {
    if (targets.length === 0) return;
    if (authFailureLatched) return;
    if (!authCheckComplete) {
      if (!initialAuthCheck) {
        initialAuthCheck = runInvalidation(targets).finally(() => {
          authCheckComplete = true;
          initialAuthCheck = null;
        });
        return initialAuthCheck;
      }
      try {
        await initialAuthCheck;
      } catch (error) {
        if (authFailureLatched) return;
        throw error;
      }
      if (authFailureLatched) return;
    }
    return runInvalidation(targets);
  };
}

async function postTargetsChunked(
  targets: readonly EventCacheTarget[],
  credentials: InvalidationCredentials,
): Promise<void> {
  if (targets.length === 0) return;
  const chunks = chunkEventCacheTargets([...targets], 100);
  const failedChunks: EventCacheTarget[][] = [];
  for (const chunk of chunks) {
    const result = await postChunkWithRetry(chunk, credentials);
    if (result.ok) continue;
    if (result.abort) {
      console.error(
        `[ERROR] Event cache invalidation aborted after global authentication failure: ${result.error.message}`,
      );
      throw new GlobalInvalidationAuthError(result.error.message);
    }
    failedChunks.push(chunk);
  }
  if (failedChunks.length > 0) {
    const failedTargets = failedChunks.reduce((total, chunk) => total + chunk.length, 0);
    console.warn(
      `[WARN] Event cache invalidation completed with ${chunks.length - failedChunks.length}/${chunks.length} chunks successful; ${failedTargets} targets were not invalidated`,
    );
  }
}

interface ChunkPostSuccess {
  readonly ok: true;
}

interface ChunkPostFailure {
  readonly ok: false;
  readonly abort: boolean;
  readonly error: Error;
}

type ChunkPostResult = ChunkPostSuccess | ChunkPostFailure;

async function postChunkWithRetry(
  chunk: readonly EventCacheTarget[],
  credentials: InvalidationCredentials,
): Promise<ChunkPostResult> {
  const { url, init } = buildInvalidationFetchInit(chunk, credentials);
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= INVALIDATION_RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchChunkWithTimeout(url, init);
      if (response.ok) {
        return { ok: true };
      }
      lastError = new Error(`Event cache invalidation failed with status ${response.status}`);
      if (response.status !== 429 && response.status !== 408 && response.status < 500) {
        return {
          ok: false,
          abort: response.status === 401 || response.status === 403,
          error: lastError,
        };
      }
      if (attempt < INVALIDATION_RETRY_MAX_ATTEMPTS) {
        const delayMs = computeInvalidationRetryDelayMs(
          attempt,
          parseRetryAfterSeconds(response.headers.get('Retry-After')),
        );
        console.warn(
          `[WARN] Event cache invalidation failed with status ${response.status}, retry ${attempt + 1}/${INVALIDATION_RETRY_MAX_ATTEMPTS} after ${Math.ceil(delayMs / 1000)}s`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Event cache invalidation failed');
      if (attempt < INVALIDATION_RETRY_MAX_ATTEMPTS) {
        const delayMs = computeInvalidationRetryDelayMs(attempt, null);
        console.warn(
          `[WARN] Event cache invalidation request failed: ${lastError.message}, retry ${attempt + 1}/${INVALIDATION_RETRY_MAX_ATTEMPTS} after ${Math.ceil(delayMs / 1000)}s`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  if (lastError) {
    return { ok: false, abort: false, error: lastError };
  }
  return { ok: false, abort: false, error: new Error('Event cache invalidation failed') };
}

async function fetchChunkWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INVALIDATION_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    await response.arrayBuffer();
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export interface EventRowIdentity {
  readonly id: string | null;
  readonly title: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly event_start_date: string | null;
}

export function rowToCacheTarget(row: EventRowIdentity): EventCacheTarget | null {
  return toEventCacheTarget({
    id: row.id,
    title: row.title,
    city: row.city,
    state: row.state,
    event_start_date: row.event_start_date,
  });
}

export function collectRowTargets(rows: readonly EventRowIdentity[]): EventCacheTarget[] {
  const targets: EventCacheTarget[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const target = rowToCacheTarget(row);
    if (!target) continue;
    const key = `${target.eventId}:${target.citySlug}:${target.eventSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push(target);
  }
  return targets;
}
