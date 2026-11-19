import type { SupabaseClient } from '@supabase/supabase-js';

import { isValidContentHash } from './eventComparison';
import {
  buildTargetKey,
  type CacheInvalidationQueueService,
  type EnqueueInput,
  type ProcessResult,
  type ReconcileResult,
} from './cacheInvalidationQueue';
import type { EventCacheTarget } from './eventPageInvalidation';

const FRACTIONAL_SECONDS = /\.(\d+)(?=Z$|[+-]\d{2}:?\d{2}$|$)/;

export interface SyncOptions {
  source: string;
  dryRun: boolean;
  onEventsChanged?: (changes: readonly SyncEventChange[]) => Promise<void>;
  queueService?: CacheInvalidationQueueService;
  onInvalidate?: (targets: readonly EventCacheTarget[]) => Promise<void>;
  buildCacheTargets?: (changes: readonly SyncEventChange[]) => EventCacheTarget[];
}

export interface SyncEventChange {
  readonly before: Record<string, unknown> | null;
  readonly after: Record<string, unknown>;
}

export interface SyncResult {
  synced: number;
  errors: number;
  dryRun: boolean;
  duration_ms: number;
  lastSyncedAt: string;
  queueProcessed?: number;
  queueResolved?: number;
  queueRetried?: number;
  queueDeadLettered?: number;
  reconciled?: number;
  reconciledResolved?: number;
  queuePersistenceError?: boolean;
}

const SYNC_BATCH_SIZE = 500;
const SYNC_CURSOR_OVERLAP_MS = 5 * 60 * 1000;
const SYNCLOG_TABLE = 'external_events_sync_log';
const EVENTS_TABLE = 'external_events';
const RAW_DATA_PROJECTION = 'external_id, updated_at, raw_data';

export interface SyncCursor {
  readonly updatedAt: string;
  readonly id: string | null;
}

export const EXTERNAL_EVENT_SYNC_PROJECTION = [
  'category',
  'city',
  'city_partition_guid',
  'community_shared_at',
  'description',
  'event_end_date',
  'event_end_time',
  'event_start_date',
  'event_start_time',
  'external_id',
  'id',
  'updated_at',
  'hidden_reason',
  'is_canonical',
  'is_community_submitted',
  'is_food_truck_relevant',
  'is_hidden',
  'location_address',
  'location_lat',
  'location_lng',
  'matched_keywords',
  'organization',
  'permit_end_date',
  'permit_end_time',
  'permit_start_date',
  'permit_start_time',
  'permit_status',
  'relevance_classified_at',
  'relevance_confidence',
  'relevance_model',
  'relevance_reasoning',
  'relevance_review_decision',
  'relevance_review_needed',
  'relevance_reviewed_at',
  'relevance_reviewed_by',
  'relevance_score',
  'source',
  'source_partition',
  'source_type',
  'source_updated_at',
  'source_url',
  'state',
  'submitted_by',
  'title',
  'verification_badge',
  'verification_tier',
  'vetted_at',
  'vetting_location_type',
  'vetting_result',
  'vetting_score',
  'vetting_version',
  'website',
  'content_hash',
].join(', ');

const EXCLUDED_COLUMNS = new Set([
  'id',
  'location_geog',
  'created_at',
  'updated_at',
  'ingested_at',
  'content_hash',
]);
const COMPARISON_EXCLUDED_COLUMNS = new Set(['id', 'updated_at']);

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== 'object' || typeof right !== 'object' || left === null || right === null) {
    return false;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

export function isMateriallyChanged(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | undefined,
): boolean {
  if (!existing) return true;
  return Object.entries(incoming).some(
    ([key, value]) => !COMPARISON_EXCLUDED_COLUMNS.has(key) && !valuesEqual(value, existing[key]),
  );
}

export function needsRawDataForComparison(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | undefined,
): boolean {
  if (!existing) return true;
  return (
    !isValidContentHash(incoming['content_hash']) || !isValidContentHash(existing['content_hash'])
  );
}

function cleanEventForUpsert(event: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if (!EXCLUDED_COLUMNS.has(key)) clean[key] = value;
  }
  return clean;
}

interface RawDataSnapshot {
  readonly rawData: unknown;
  readonly updatedAt: string | null;
}

interface RawDataFetchResult {
  readonly data: Map<string, RawDataSnapshot>;
  readonly error: string | null;
}

async function fetchRawDataByExternalId(
  client: SupabaseClient,
  source: string,
  expectedUpdatedAt: ReadonlyMap<string, string | null>,
): Promise<RawDataFetchResult> {
  if (expectedUpdatedAt.size === 0) return { data: new Map(), error: null };

  const { data, error } = await client
    .from(EVENTS_TABLE)
    .select(RAW_DATA_PROJECTION)
    .eq('source', source)
    .in('external_id', [...expectedUpdatedAt.keys()]);

  if (error) return { data: new Map(), error: error.message };

  const rawDataByExternalId = new Map<string, RawDataSnapshot>();
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const externalId = row['external_id'];
    if (typeof externalId === 'string') {
      rawDataByExternalId.set(externalId, {
        rawData: row['raw_data'],
        updatedAt: typeof row['updated_at'] === 'string' ? row['updated_at'] : null,
      });
    }
  }
  return { data: rawDataByExternalId, error: null };
}

async function fetchConsistentRawData(
  client: SupabaseClient,
  source: string,
  expectedUpdatedAt: ReadonlyMap<string, string | null>,
): Promise<RawDataFetchResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await fetchRawDataByExternalId(client, source, expectedUpdatedAt);
    if (result.error) return result;

    const isConsistent = [...expectedUpdatedAt].every(([externalId, updatedAt]) => {
      const snapshot = result.data.get(externalId);
      return snapshot?.updatedAt === updatedAt;
    });
    if (isConsistent) return result;
  }

  return { data: new Map(), error: 'Event changed while reading comparison data' };
}

async function retryBatchInvalidation(
  onEventsChanged: SyncOptions['onEventsChanged'],
  batch: readonly Record<string, unknown>[],
  existingByExternalId: ReadonlyMap<string, Record<string, unknown>>,
): Promise<boolean> {
  if (!onEventsChanged) return true;

  const replayChanges = batch.map((event) => {
    const externalId = event['external_id'];
    return {
      before:
        typeof externalId === 'string' ? (existingByExternalId.get(externalId) ?? null) : null,
      after: event,
    };
  });

  try {
    await onEventsChanged(replayChanges);
    return true;
  } catch (error) {
    console.error('Failed to retry invalidation for replayed event batch', error);
    return false;
  }
}

function buildEnqueueInputs(
  changes: readonly SyncEventChange[],
  productionRowsByExternalId: ReadonlyMap<string, Record<string, unknown>>,
  buildCacheTargets: (changes: readonly SyncEventChange[]) => EventCacheTarget[],
): EnqueueInput[] {
  const targets = buildCacheTargets(changes);
  const eventIdToProductionId = new Map<string, string>();
  for (const change of changes) {
    const after = change.after;
    const eventId = typeof after['id'] === 'string' ? after['id'] : null;
    const externalId = typeof after['external_id'] === 'string' ? after['external_id'] : null;
    if (eventId && externalId) {
      const prodRow = productionRowsByExternalId.get(externalId);
      const prodId = typeof prodRow?.['id'] === 'string' ? prodRow['id'] : null;
      if (prodId) eventIdToProductionId.set(eventId, prodId);
    }
  }

  const inputs: EnqueueInput[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    const key = buildTargetKey(target);
    if (seen.has(key)) continue;
    seen.add(key);
    const productionId = eventIdToProductionId.get(target.eventId);
    if (!productionId) continue;
    inputs.push({ target, sourceEventId: productionId });
  }
  return inputs;
}

async function rollbackBatch(
  prod: SupabaseClient,
  source: string,
  batch: readonly Record<string, unknown>[],
  existingByExternalId: ReadonlyMap<string, Record<string, unknown>>,
): Promise<void> {
  const previousRows = [...existingByExternalId.values()];
  if (previousRows.length > 0) {
    const { error } = await prod
      .from(EVENTS_TABLE)
      .upsert(previousRows, { onConflict: 'source,external_id' });
    if (error) throw error;
  }

  const newExternalIds = batch
    .map((event) => event['external_id'])
    .filter(
      (value): value is string => typeof value === 'string' && !existingByExternalId.has(value),
    );
  if (newExternalIds.length === 0) return;

  const { error } = await prod
    .from(EVENTS_TABLE)
    .delete()
    .eq('source', source)
    .in('external_id', newExternalIds);
  if (error) throw error;
}

async function eagerlyInvalidateAndResolve(
  onInvalidate: (targets: readonly EventCacheTarget[]) => Promise<void>,
  queueService: CacheInvalidationQueueService,
  enqueueInputs: readonly EnqueueInput[],
  enqueuedKeys: readonly string[],
  enqueuedLeaseValues: readonly string[],
): Promise<string | null> {
  try {
    const targets = enqueueInputs.map((input) => input.target);
    await onInvalidate(targets);
  } catch (error) {
    console.error('Failed to invalidate changed event pages (queued for retry)', error);
    return null;
  }
  try {
    const resolveError = await queueService.markResolved(
      [...enqueuedKeys],
      [...enqueuedLeaseValues],
    );
    if (resolveError) console.error(`Failed to mark resolved queue rows: ${resolveError}`);
    return resolveError;
  } catch (error) {
    console.error('Failed to mark resolved queue rows', error);
    return error instanceof Error ? error.message : 'unknown resolution error';
  }
}

interface ReplayResult {
  readonly ok: boolean;
  readonly resolveError: string | null;
}

async function handleReplayedBatch(
  onEventsChanged: SyncOptions['onEventsChanged'],
  queueService: CacheInvalidationQueueService | undefined,
  onInvalidate: ((targets: readonly EventCacheTarget[]) => Promise<void>) | undefined,
  buildCacheTargets: ((changes: readonly SyncEventChange[]) => EventCacheTarget[]) | undefined,
  batch: readonly Record<string, unknown>[],
  existingByExternalId: ReadonlyMap<string, Record<string, unknown>>,
): Promise<ReplayResult> {
  if (queueService && onInvalidate && buildCacheTargets) {
    const replayChanges: SyncEventChange[] = [];
    for (const event of batch) {
      const externalId = event['external_id'];
      if (typeof externalId !== 'string') continue;
      const productionRow = existingByExternalId.get(externalId);
      if (!productionRow) continue;
      replayChanges.push({ before: productionRow, after: productionRow });
    }
    const targets = buildCacheTargets(replayChanges);
    if (targets.length === 0) return { ok: true, resolveError: null };
    const enqueueInputs: EnqueueInput[] = targets.map((target) => ({
      target,
      sourceEventId: target.eventId,
    }));
    const enqueueResult = await queueService.enqueue(enqueueInputs);
    if (enqueueResult.error) {
      console.error(`Failed to persist replayed invalidation queue: ${enqueueResult.error}`);
      return { ok: false, resolveError: null };
    }
    if (enqueueResult.enqueued > 0 || enqueueResult.capacityDeadLettered > 0) {
      const resolveError = await eagerlyInvalidateAndResolve(
        onInvalidate,
        queueService,
        enqueueInputs,
        enqueueResult.enqueuedKeys,
        enqueueResult.enqueuedLeaseValues,
      );
      return { ok: true, resolveError };
    }
    return { ok: true, resolveError: null };
  }
  return {
    ok: await retryBatchInvalidation(onEventsChanged, batch, existingByExternalId),
    resolveError: null,
  };
}

async function advanceSyncCursor(
  staging: SupabaseClient,
  source: string,
  cursorUpdatedAt: string,
  cursorId: string | null,
): Promise<string | null> {
  const { error } = await staging
    .from(SYNCLOG_TABLE)
    .upsert(
      { source, last_synced_at: cursorUpdatedAt, last_synced_event_id: cursorId },
      { onConflict: 'source' },
    );
  return error?.message ?? null;
}

function getSyncCursorOverlapStart(cursorUpdatedAt: string): string {
  const cursorTimestamp = Date.parse(cursorUpdatedAt);
  if (!Number.isFinite(cursorTimestamp)) return cursorUpdatedAt;
  return new Date(cursorTimestamp - SYNC_CURSOR_OVERLAP_MS).toISOString();
}

function parseTimestampMicroseconds(value: string): number | null {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;

  const fractional = value.match(FRACTIONAL_SECONDS)?.[1] ?? '';
  const subMilliseconds = Number(fractional.padEnd(6, '0').slice(3, 6));
  return timestamp * 1000 + subMilliseconds;
}

function compareSyncCursors(left: SyncCursor, right: SyncCursor): number {
  const leftTimestamp = parseTimestampMicroseconds(left.updatedAt);
  const rightTimestamp = parseTimestampMicroseconds(right.updatedAt);
  if (leftTimestamp !== null && rightTimestamp !== null) {
    if (leftTimestamp !== rightTimestamp) return leftTimestamp > rightTimestamp ? 1 : -1;
  } else if (left.updatedAt !== right.updatedAt) {
    return left.updatedAt > right.updatedAt ? 1 : -1;
  }

  if (left.id === right.id) return 0;
  if (left.id === null) return -1;
  if (right.id === null) return 1;
  return left.id > right.id ? 1 : -1;
}

export function getLatestSyncCursor(stored: SyncCursor, observed: SyncCursor): SyncCursor {
  return compareSyncCursors(observed, stored) > 0 ? observed : stored;
}

interface DrainResult {
  readonly processResult: ProcessResult;
  readonly reconcileResult: ReconcileResult;
}

async function drainQueue(
  queueService: CacheInvalidationQueueService,
  onInvalidate: (targets: readonly EventCacheTarget[]) => Promise<void>,
): Promise<DrainResult> {
  const processResult = await queueService.processPending(onInvalidate);
  const reconcileResult = await queueService.reconcileDeadLetters(onInvalidate);
  return { processResult, reconcileResult };
}

export async function syncExternalEventsToProd(
  staging: SupabaseClient,
  prod: SupabaseClient,
  options: SyncOptions,
): Promise<SyncResult> {
  const startTime = Date.now();
  const syncStartedAt = new Date().toISOString();
  let synced = 0;
  let errors = 0;
  let lastSyncedAt = new Date(0).toISOString();
  let queueProcessed = 0;
  let queueResolved = 0;
  let queueRetried = 0;
  let queueDeadLettered = 0;
  let reconciled = 0;
  let reconciledResolved = 0;
  let queuePersistenceError = false;

  const { source, dryRun, onEventsChanged, queueService, onInvalidate, buildCacheTargets } = options;

  if (queueService && !onInvalidate) {
    console.error('Queue service configured without an invalidator; refusing to run');
    return {
      synced: 0,
      errors: 1,
      dryRun,
      duration_ms: Date.now() - startTime,
      lastSyncedAt,
      queuePersistenceError: true,
    };
  }

  const { data: syncLog, error: syncLogError } = await staging
    .from(SYNCLOG_TABLE)
    .select('last_synced_at, last_synced_event_id')
    .eq('source', source)
    .maybeSingle();

  if (syncLogError) {
    console.error(`Failed to read sync cursor: ${syncLogError.message}`);
    return {
      synced: 0,
      errors: 1,
      dryRun,
      duration_ms: Date.now() - startTime,
      lastSyncedAt,
    };
  }

  if (syncLog?.last_synced_at) {
    lastSyncedAt = syncLog.last_synced_at;
  }

  const allEvents: Record<string, unknown>[] = [];
  let cursorUpdatedAt = lastSyncedAt;
  let cursorId: string | null =
    typeof syncLog?.last_synced_event_id === 'string' ? syncLog.last_synced_event_id : null;
  const storedCursor: SyncCursor = { updatedAt: cursorUpdatedAt, id: cursorId };
  let pageCursor: { updatedAt: string; id: string } | null = null;

  while (true) {
    const eventQuery = staging
      .from(EVENTS_TABLE)
      .select(EXTERNAL_EVENT_SYNC_PROJECTION)
      .eq('source', source);

    const cursorQuery =
      pageCursor === null
        ? eventQuery.gte('updated_at', getSyncCursorOverlapStart(cursorUpdatedAt))
        : eventQuery.or(
            `updated_at.gt.${pageCursor.updatedAt},and(updated_at.eq.${pageCursor.updatedAt},id.gt.${pageCursor.id})`,
          );

    const { data, error } = await cursorQuery
      .lte('updated_at', syncStartedAt)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .range(0, SYNC_BATCH_SIZE - 1);

    if (error) {
      console.error(`Failed to fetch staging events: ${error.message}`);
      return {
        synced: 0,
        errors: 1,
        dryRun,
        duration_ms: Date.now() - startTime,
        lastSyncedAt,
      };
    }

    if (!data || data.length === 0) break;

    const projectedEvents = data as unknown as Record<string, unknown>[];
    allEvents.push(...projectedEvents);
    const lastEvent = projectedEvents.at(-1);
    const nextCursorUpdatedAt = lastEvent?.['updated_at'];
    const nextCursorId = lastEvent?.['id'];
    if (typeof nextCursorUpdatedAt !== 'string' || typeof nextCursorId !== 'string') {
      console.error('Failed to advance event cursor: page row is missing updated_at or id');
      return {
        synced: 0,
        errors: 1,
        dryRun,
        duration_ms: Date.now() - startTime,
        lastSyncedAt,
      };
    }
    if (
      pageCursor !== null &&
      pageCursor.updatedAt === nextCursorUpdatedAt &&
      pageCursor.id === nextCursorId
    ) {
      console.error('Failed to advance event cursor: repeated page cursor');
      return {
        synced: 0,
        errors: 1,
        dryRun,
        duration_ms: Date.now() - startTime,
        lastSyncedAt,
      };
    }
    cursorUpdatedAt = nextCursorUpdatedAt;
    cursorId = nextCursorId;
    pageCursor = { updatedAt: nextCursorUpdatedAt, id: nextCursorId };
    if (projectedEvents.length < SYNC_BATCH_SIZE) break;
  }

  if (allEvents.length === 0) {
    if (queueService && onInvalidate && !dryRun) {
      try {
        const drain = await drainQueue(queueService, onInvalidate);
        queueProcessed = drain.processResult.processed;
        queueResolved = drain.processResult.resolved;
        queueRetried = drain.processResult.retried;
        queueDeadLettered = drain.processResult.deadLettered;
        reconciled = drain.reconcileResult.processed;
        reconciledResolved = drain.reconcileResult.resolved;
        if (drain.processResult.errors > 0 || drain.reconcileResult.errors > 0) {
          queuePersistenceError = true;
        }
      } catch (error) {
        console.error('Failed to drain invalidation queue on idle sync', error);
        queuePersistenceError = true;
      }
    }
    return {
      synced: 0,
      errors: queuePersistenceError ? 1 : 0,
      dryRun,
      duration_ms: Date.now() - startTime,
      lastSyncedAt,
      queueProcessed,
      queueResolved,
      queueRetried,
      queueDeadLettered,
      reconciled,
      reconciledResolved,
      queuePersistenceError,
    };
  }

  const comparisonEvents = allEvents;

  if (dryRun) {
    console.log(`[DRY RUN] Would sync ${comparisonEvents.length} events for source: ${source}`);
    return {
      synced: comparisonEvents.length,
      errors: 0,
      dryRun: true,
      duration_ms: Date.now() - startTime,
      lastSyncedAt,
    };
  }

  const UPSERT_BATCH_SIZE = 50;

  for (let i = 0; i < comparisonEvents.length; i += UPSERT_BATCH_SIZE) {
    const batch = comparisonEvents.slice(i, i + UPSERT_BATCH_SIZE);
    const externalIds = batch
      .map((event) => event['external_id'])
      .filter((value): value is string => typeof value === 'string');
    const { data: existingData, error: existingError } = await prod
      .from(EVENTS_TABLE)
      .select(EXTERNAL_EVENT_SYNC_PROJECTION)
      .eq('source', source)
      .in('external_id', externalIds);

    if (existingError) {
      console.error(`Failed to compare production batch (offset ${i}): ${existingError.message}`);
      errors += batch.length;
      continue;
    }

    const existingByExternalId = new Map<string, Record<string, unknown>>();
    for (const row of (existingData ?? []) as unknown as Record<string, unknown>[]) {
      const externalId = row['external_id'];
      if (typeof externalId === 'string') existingByExternalId.set(externalId, row);
    }

    const potentialChanges = batch
      .map((event) => {
        const externalId = event['external_id'];
        const existing =
          typeof externalId === 'string' ? existingByExternalId.get(externalId) : undefined;
        return { event, externalId, existing };
      })
      .filter(
        ({ event, existing }) =>
          isMateriallyChanged(event, existing) || needsRawDataForComparison(event, existing),
      );

    if (potentialChanges.length === 0) {
      const replayed = await handleReplayedBatch(
        onEventsChanged,
        queueService,
        onInvalidate,
        buildCacheTargets,
        batch,
        existingByExternalId,
      );
      if (!replayed.ok) {
        errors += batch.length;
        continue;
      }
      if (replayed.resolveError) queuePersistenceError = true;
      synced += batch.length;
      continue;
    }

    const stagingExpectedUpdatedAt = new Map<string, string | null>();
    const productionExpectedUpdatedAt = new Map<string, string | null>();
    for (const { event, existing, externalId } of potentialChanges) {
      if (typeof externalId !== 'string') continue;
      stagingExpectedUpdatedAt.set(
        externalId,
        typeof event['updated_at'] === 'string' ? event['updated_at'] : null,
      );
      if (
        existing &&
        (needsRawDataForComparison(event, existing) ||
          Boolean(onEventsChanged) ||
          Boolean(queueService && onInvalidate && buildCacheTargets))
      ) {
        productionExpectedUpdatedAt.set(
          externalId,
          typeof existing['updated_at'] === 'string' ? existing['updated_at'] : null,
        );
      }
    }

    const [stagingRawData, prodRawData] = await Promise.all([
      fetchConsistentRawData(staging, source, stagingExpectedUpdatedAt),
      fetchConsistentRawData(prod, source, productionExpectedUpdatedAt),
    ]);

    if (stagingRawData.error || prodRawData.error) {
      const detail = stagingRawData.error ?? prodRawData.error;
      console.error(`Failed to fetch changed event raw_data (offset ${i}): ${detail}`);
      errors += batch.length;
      continue;
    }

    const changedEntries = potentialChanges.filter(({ event, existing, externalId }) => {
      if (isMateriallyChanged(event, existing)) return true;
      if (typeof externalId !== 'string') return true;
      return !valuesEqual(
        stagingRawData.data.get(externalId)?.rawData,
        prodRawData.data.get(externalId)?.rawData,
      );
    });

    if (changedEntries.length === 0) {
      const replayed = await handleReplayedBatch(
        onEventsChanged,
        queueService,
        onInvalidate,
        buildCacheTargets,
        batch,
        existingByExternalId,
      );
      if (!replayed.ok) {
        errors += batch.length;
        continue;
      }
      if (replayed.resolveError) queuePersistenceError = true;
      synced += batch.length;
      continue;
    }

    const missingStagingRawData = changedEntries.some(
      ({ externalId }) => typeof externalId !== 'string' || !stagingRawData.data.has(externalId),
    );
    const missingRollbackRawData =
      (Boolean(onEventsChanged) || Boolean(queueService && onInvalidate && buildCacheTargets)) &&
      changedEntries.some(
        ({ existing, externalId }) =>
          Boolean(existing) &&
          (typeof externalId !== 'string' || !prodRawData.data.has(externalId)),
      );
    if (missingStagingRawData || missingRollbackRawData) {
      console.error(`Missing raw_data for changed event batch (offset ${i})`);
      errors += batch.length;
      continue;
    }

    const changedEvents = changedEntries.map(({ event, externalId }) => ({
      ...event,
      raw_data: stagingRawData.data.get(externalId as string)?.rawData,
    }));
    const changedBatch = changedEvents.map((event) => cleanEventForUpsert(event));
    const previousRowsByExternalId = new Map<string, Record<string, unknown>>();
    if (onEventsChanged || (queueService && onInvalidate && buildCacheTargets)) {
      for (const { existing, externalId } of changedEntries) {
        if (existing && typeof externalId === 'string') {
          previousRowsByExternalId.set(
            externalId,
            cleanEventForUpsert({
              ...existing,
              raw_data: prodRawData.data.get(externalId)?.rawData,
            }),
          );
        }
      }
    }
    const changedBeforeByExternalId = new Map<string, Record<string, unknown> | null>();
    const changedAfterByExternalId = new Map<string, Record<string, unknown>>();
    for (const [{ existing, externalId }, changedEvent] of changedEntries.map(
      (entry, index) => [entry, changedEvents[index]] as const,
    )) {
      if (typeof externalId !== 'string') continue;
      changedBeforeByExternalId.set(
        externalId,
        existing ? { ...existing, raw_data: prodRawData.data.get(externalId)?.rawData } : null,
      );
      changedAfterByExternalId.set(externalId, changedEvent);
    }
    const batchChanges: SyncEventChange[] = batch.map((event) => {
      const externalId = event['external_id'];
      const existing =
        typeof externalId === 'string' ? existingByExternalId.get(externalId) : undefined;
      return {
        before:
          typeof externalId === 'string'
            ? (changedBeforeByExternalId.get(externalId) ?? existing ?? null)
            : null,
        after:
          typeof externalId === 'string'
            ? (changedAfterByExternalId.get(externalId) ?? event)
            : event,
      };
    });

    const { data: upsertedData, error: upsertError } = await prod
      .from(EVENTS_TABLE)
      .upsert(changedBatch, { onConflict: 'source,external_id' })
      .select(EXTERNAL_EVENT_SYNC_PROJECTION);

    if (upsertError) {
      console.error(`Failed to upsert batch (offset ${i}): ${upsertError.message}`);
      errors += batch.length;
    } else {
      const productionRowsByExternalId = new Map<string, Record<string, unknown>>();
      for (const row of (upsertedData ?? []) as unknown as Record<string, unknown>[]) {
        const externalId = row['external_id'];
        if (typeof externalId === 'string') productionRowsByExternalId.set(externalId, row);
      }

      if (queueService && onInvalidate && buildCacheTargets) {
        const productionChanges: SyncEventChange[] = batch.map((event) => {
          const externalId = event['external_id'];
          const before =
            typeof externalId === 'string'
              ? (existingByExternalId.get(externalId) ?? null)
              : null;
          const after =
            typeof externalId === 'string'
              ? (productionRowsByExternalId.get(externalId) ??
                existingByExternalId.get(externalId) ??
                event)
              : event;
          return { before, after };
        });
        const allProductionRowsByExternalId = new Map(productionRowsByExternalId);
        for (const [externalId, row] of existingByExternalId) {
          if (!allProductionRowsByExternalId.has(externalId)) {
            allProductionRowsByExternalId.set(externalId, row);
          }
        }
        const enqueueInputs = buildEnqueueInputs(
          productionChanges,
          allProductionRowsByExternalId,
          buildCacheTargets,
        );
        const enqueueResult = await queueService.enqueue(enqueueInputs);
        if (enqueueResult.error) {
          console.error(`Failed to persist cache invalidation queue: ${enqueueResult.error}`);
          try {
            await rollbackBatch(prod, source, changedBatch, previousRowsByExternalId);
          } catch (rollbackError) {
            console.error(
              'Failed to roll back event batch after queue persistence failure',
              rollbackError,
            );
          }
          errors += batch.length;
          queuePersistenceError = true;
          continue;
        }
        if (enqueueResult.enqueued > 0 || enqueueResult.capacityDeadLettered > 0) {
          const resolveError = await eagerlyInvalidateAndResolve(
            onInvalidate,
            queueService,
            enqueueInputs,
            enqueueResult.enqueuedKeys,
            enqueueResult.enqueuedLeaseValues,
          );
          if (resolveError) queuePersistenceError = true;
        }
      } else if (onEventsChanged && batchChanges.length > 0) {
        try {
          await onEventsChanged(batchChanges);
        } catch (error) {
          console.error('Failed to invalidate changed event pages', error);
          try {
            await rollbackBatch(prod, source, changedBatch, previousRowsByExternalId);
          } catch (rollbackError) {
            console.error(
              'Failed to roll back event batch after invalidation failure',
              rollbackError,
            );
          }
          errors += batch.length;
          continue;
        }
      }
      synced += batch.length;
    }
  }

  if (queueService && onInvalidate && !dryRun) {
    try {
      const drain = await drainQueue(queueService, onInvalidate);
      queueProcessed = drain.processResult.processed;
      queueResolved = drain.processResult.resolved;
      queueRetried = drain.processResult.retried;
      queueDeadLettered = drain.processResult.deadLettered;
      reconciled = drain.reconcileResult.processed;
      reconciledResolved = drain.reconcileResult.resolved;
      if (drain.processResult.errors > 0 || drain.reconcileResult.errors > 0) {
        queuePersistenceError = true;
      }
    } catch (error) {
      console.error('Failed to drain invalidation queue', error);
      queuePersistenceError = true;
    }
  }

  const finalCursor = getLatestSyncCursor(storedCursor, {
    updatedAt: cursorUpdatedAt,
    id: cursorId,
  });

  if (errors > 0 || queuePersistenceError) {
    console.warn(
      `Sync completed with ${errors} errors for source "${source}". Sync log not updated — failed events will be retried on next run.`,
    );
  } else {
    const cursorError = dryRun
      ? null
      : await advanceSyncCursor(staging, source, finalCursor.updatedAt, finalCursor.id);
    if (cursorError) {
      console.error(`Failed to advance sync cursor: ${cursorError}`);
      errors = 1;
    }
  }

  return {
    synced,
    errors,
    dryRun: false,
    duration_ms: Date.now() - startTime,
    lastSyncedAt: errors > 0 || queuePersistenceError ? lastSyncedAt : finalCursor.updatedAt,
    queueProcessed,
    queueResolved,
    queueRetried,
    queueDeadLettered,
    reconciled,
    reconciledResolved,
    queuePersistenceError,
  };
}
