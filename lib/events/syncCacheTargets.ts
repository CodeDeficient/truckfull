import { type EventCacheTarget } from './eventPageInvalidation';
import { buildEventCacheTarget } from './eventCacheTargets';

const TRAILING_SLASH = /\/$/;

export const INVALIDATION_EDGE_SECRET_ENV = 'TRUCKFULL_EDGE_SECRET';
export const INVALIDATION_EDGE_HEADER = 'x-truckfull-internal';

export interface InvalidationCredentials {
  readonly appUrl: string;
  readonly cronSecret: string;
  readonly edgeSecret: string;
}

export function resolveInvalidationCredentials(env: NodeJS.ProcessEnv): InvalidationCredentials {
  const appUrl = env.NEXT_PUBLIC_APP_URL?.replace(TRAILING_SLASH, '');
  const cronSecret = env.CRON_SECRET;
  const edgeSecret = env[INVALIDATION_EDGE_SECRET_ENV];
  if (!appUrl || !cronSecret) {
    throw new Error('Missing NEXT_PUBLIC_APP_URL or CRON_SECRET for event cache invalidation');
  }
  if (!edgeSecret) {
    throw new Error(
      `Missing ${INVALIDATION_EDGE_SECRET_ENV} for event cache invalidation (required for the X-TruckFull-Internal edge credential)`,
    );
  }
  return { appUrl, cronSecret, edgeSecret };
}

export function buildInvalidationFetchInit(
  events: readonly EventCacheTarget[],
  credentials: InvalidationCredentials,
): { url: string; init: RequestInit } {
  const { appUrl, cronSecret, edgeSecret } = credentials;
  return {
    url: `${appUrl}/api/revalidate/event`,
    init: {
      method: 'POST',
      headers: {
        authorization: `Bearer ${cronSecret}`,
        [INVALIDATION_EDGE_HEADER]: edgeSecret,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ events }),
    },
  };
}

export interface EventCacheTargetOptions {
  readonly canonicalizationChanged?: boolean;
}

export function toEventCacheTarget(
  event: Record<string, unknown>,
  options: EventCacheTargetOptions = {},
): EventCacheTarget | null {
  const target = buildEventCacheTarget({
    id: typeof event.id === 'string' ? event.id : null,
    city: typeof event.city === 'string' ? event.city : null,
    state: typeof event.state === 'string' ? event.state : null,
    title: typeof event.title === 'string' ? event.title : null,
    event_start_date:
      typeof event.event_start_date === 'string' ? event.event_start_date : null,
  });
  return target && options.canonicalizationChanged
    ? { ...target, canonicalizationChanged: true }
    : target;
}

export function countSyncErrors(result: {
  readonly errors: number;
  readonly queuePersistenceError?: boolean;
}): number {
  return result.errors + (result.queuePersistenceError && result.errors === 0 ? 1 : 0);
}

export const INVALIDATION_MIN_GAP_MS = 1000;

export function createCallPacer(
  minGapMs: number,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): () => Promise<void> {
  let nextAllowedAt = 0;
  return async (): Promise<void> => {
    const startAt = Math.max(now(), nextAllowedAt);
    nextAllowedAt = startAt + minGapMs;
    const waitMs = startAt - now();
    if (waitMs > 0) await sleep(waitMs);
  };
}

export const INVALIDATION_RETRY_MAX_ATTEMPTS = 3;
export const INVALIDATION_RETRY_BASE_DELAY_MS = 5000;
export const INVALIDATION_RETRY_MAX_DELAY_MS = 60_000;
export function parseRetryAfterSeconds(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return seconds;

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  const dateSeconds = (retryAt - Date.now()) / 1000;
  return dateSeconds > 0 ? dateSeconds : null;
}

export function computeInvalidationRetryDelayMs(
  attempt: number,
  retryAfterSeconds: number | null,
): number {
  const cappedRetryAfterMs = retryAfterSeconds
    ? Math.min(retryAfterSeconds * 1000, INVALIDATION_RETRY_MAX_DELAY_MS)
    : 0;
  const backoffMs = Math.min(
    INVALIDATION_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
    INVALIDATION_RETRY_MAX_DELAY_MS,
  );
  return Math.max(cappedRetryAfterMs, backoffMs);
}
