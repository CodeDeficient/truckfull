import type { SupabaseClient } from '@supabase/supabase-js';
import {
  syncExternalEventsToProd,
  type SyncEventChange,
  type SyncResult,
} from '@/lib/events/externalEventSync';
import { CITIES } from '@/lib/events/cities';
import { createCacheInvalidationQueueService } from '@/lib/events/cacheInvalidationQueue';
import {
  chunkEventCacheTargets,
  type EventCacheTarget,
} from '@/lib/events/eventPageInvalidation';
import {
  buildInvalidationFetchInit,
  computeInvalidationRetryDelayMs,
  countSyncErrors,
  createCallPacer,
  INVALIDATION_MIN_GAP_MS,
  INVALIDATION_RETRY_MAX_ATTEMPTS,
  parseRetryAfterSeconds,
  resolveInvalidationCredentials,
  toEventCacheTarget,
} from '@/lib/events/syncCacheTargets';
import { hasCanonicalizationChanged } from '@/lib/events/eventCacheTargets';
import { logMessage, logWarning, logError } from '@/lib/logging';

const EVENT_INVALIDATION_MAX_ATTEMPTS = INVALIDATION_RETRY_MAX_ATTEMPTS;
const paceInvalidation = createCallPacer(INVALIDATION_MIN_GAP_MS);

export const EXTRA_SYNC_SOURCES = ['flyer_dataset_batch1'] as const;

export function listSyncSources(selected?: string | null): string[] {
  if (selected) return [selected];
  return [...Object.values(CITIES).map((city) => city.source), ...EXTRA_SYNC_SOURCES];
}

export function buildEventCacheTargets(changes: readonly SyncEventChange[]): EventCacheTarget[] {
  const targets: EventCacheTarget[] = [];
  const seen = new Set<string>();
  for (const change of changes) {
    const canonicalizationChanged = hasCanonicalizationChanged(change.before, change.after);
    for (const event of [change.before, change.after]) {
      if (!event) continue;
      const target = toEventCacheTarget(event, { canonicalizationChanged });
      if (!target) continue;
      const key = `${target.eventId}:${target.citySlug}:${target.eventSlug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push(target);
    }
  }
  return targets;
}

export async function invalidateTargets(targets: readonly EventCacheTarget[]): Promise<void> {
  if (targets.length === 0) return;
  const invalidationAuth = resolveInvalidationCredentials(process.env);
  for (const targetChunk of chunkEventCacheTargets([...targets], 100)) {
    await invalidateChunkWithRetry(targetChunk, invalidationAuth);
  }
}

async function invalidateChunkWithRetry(
  targetChunk: readonly EventCacheTarget[],
  credentials: ReturnType<typeof resolveInvalidationCredentials>,
): Promise<void> {
  const { url, init } = buildInvalidationFetchInit(targetChunk, credentials);
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= EVENT_INVALIDATION_MAX_ATTEMPTS; attempt++) {
    await paceInvalidation();
    const outcome = await attemptInvalidation(url, init);
    if (outcome.ok) return;
    lastError = outcome.error;
    if (outcome.retryable && attempt < EVENT_INVALIDATION_MAX_ATTEMPTS) {
      const delayMs = computeInvalidationRetryDelayMs(attempt, outcome.retryAfterSeconds);
      logWarning(
        `Event cache invalidation failed with status ${outcome.status}, retry ${attempt + 1}/${EVENT_INVALIDATION_MAX_ATTEMPTS} after ${Math.ceil(delayMs / 1000)}s`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } else if (!outcome.retryable) {
      break;
    }
  }
  if (lastError) throw lastError;
}

interface InvalidationAttemptOk {
  readonly ok: true;
}

interface InvalidationAttemptFailed {
  readonly ok: false;
  readonly error: Error;
  readonly status: number | null;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;
}

type InvalidationAttempt = InvalidationAttemptOk | InvalidationAttemptFailed;

async function attemptInvalidation(url: string, init: RequestInit): Promise<InvalidationAttempt> {
  try {
    const response = await fetch(url, init);
    if (response.ok) return { ok: true };
    const retryable = response.status === 429 || response.status >= 500;
    return {
      ok: false,
      status: response.status,
      retryable,
      retryAfterSeconds: parseRetryAfterSeconds(response.headers.get('Retry-After')),
      error: new Error(`Event cache invalidation failed with status ${response.status}`),
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      retryable: true,
      retryAfterSeconds: null,
      error: error instanceof Error ? error : new Error('Event cache invalidation failed'),
    };
  }
}

export interface ProductionSyncStageOptions {
  readonly staging: SupabaseClient;
  readonly prod: SupabaseClient;
  readonly sources?: readonly string[];
  readonly skipSources?: ReadonlySet<string>;
  readonly invalidate?: (targets: readonly EventCacheTarget[]) => Promise<void>;
  readonly onSourceStarted?: (source: string) => void | Promise<void>;
  readonly onSourceCompleted?: (source: string, result: SyncResult) => void | Promise<void>;
  readonly dryRun?: boolean;
  readonly syncSource?: (
    source: string,
    options: ProductionSyncStageOptions,
  ) => Promise<SyncResult>;
}

export interface ProductionSyncStageResult {
  readonly synced: number;
  readonly totalErrors: number;
  readonly processedSources: readonly string[];
  readonly skippedSources: readonly string[];
  readonly durationMs: number;
}

export async function runProductionSyncStage(
  options: ProductionSyncStageOptions,
): Promise<ProductionSyncStageResult> {
  const sources = options.sources ?? listSyncSources();
  const skipSources = options.skipSources ?? new Set<string>();
  const startedAt = Date.now();
  const processed: string[] = [];
  const skipped: string[] = [];
  let synced = 0;
  let totalErrors = 0;

  for (const source of sources) {
    if (skipSources.has(source)) {
      skipped.push(source);
      continue;
    }
    const result = await syncOneSource(source, options);
    if (!result) {
      skipped.push(source);
      continue;
    }
    synced += result.synced;
    const errors = countSyncErrors(result);
    totalErrors += errors;
    processed.push(source);
    if (errors === 0 && !options.dryRun) {
      await options.onSourceCompleted?.(source, result);
    }
  }

  logMessage('Production sync stage completed', {
    processed: processed.length,
    skipped: skipped.length,
    synced,
    totalErrors,
  });

  return {
    synced,
    totalErrors,
    processedSources: processed,
    skippedSources: skipped,
    durationMs: Date.now() - startedAt,
  };
}

async function syncOneSource(
  source: string,
  options: ProductionSyncStageOptions,
): Promise<SyncResult | null> {
  const cityEntry = Object.values(CITIES).find((city) => city.source === source);
  const label = cityEntry ? `${cityEntry.city}, ${cityEntry.state}` : source;
  logMessage(`Syncing: ${label} (${source})`);
  await options.onSourceStarted?.(source);

  try {
    if (options.syncSource) {
      return await options.syncSource(source, options);
    }

    const queueService = options.dryRun
      ? undefined
      : createCacheInvalidationQueueService(options.staging);

    return await syncExternalEventsToProd(options.staging, options.prod, {
      source,
      dryRun: options.dryRun ?? false,
      queueService,
      onInvalidate: options.dryRun ? undefined : (options.invalidate ?? invalidateTargets),
      buildCacheTargets: options.dryRun ? undefined : buildEventCacheTargets,
    });
  } catch (error) {
    logError(`Production sync failed for source ${source}`, error);
    return {
      synced: 0,
      errors: 1,
      dryRun: options.dryRun ?? false,
      duration_ms: 0,
      lastSyncedAt: new Date().toISOString(),
    };
  }
}
