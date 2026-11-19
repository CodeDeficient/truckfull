import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.remote.types';
import { isEventCacheTarget, type EventCacheTarget } from '@/lib/events/eventPageInvalidation';

export const QUEUE_TABLE = 'external_event_cache_invalidation_queue';

export const QUEUE_MAX_ACTIVE_ROWS = 1000;
export const QUEUE_PROCESSING_BATCH_SIZE = 100;
export const QUEUE_MAX_ATTEMPTS = 5;
export const QUEUE_ACTIVE_WINDOW_HOURS = 24;
export const QUEUE_RECONCILIATION_BATCH_SIZE = 50;
export const QUEUE_RECONCILIATION_BACKOFF_HOURS = 6;
export const QUEUE_LEASE_MS = 15 * 60 * 1000;
export const QUEUE_ACTIVE_TARGET_CONSTRAINT = 'uq_cache_invalidation_active_target';
export const QUEUE_ENQUEUE_CONFLICT_RETRY_LIMIT = 2;

export type QueueStatus = 'pending' | 'dead_letter' | 'resolved' | 'capacity_dead_letter';
export type QueueOrigin = 'live' | 'legacy' | 'reconciliation';
export type DeadLetterReason =
  | 'max_attempts_exhausted'
  | 'active_window_expired'
  | 'capacity_exceeded'
  | 'migration_unreconstructable'
  | 'invalid_target_payload';

export interface QueueRow {
  readonly id: string;
  readonly target_key: string;
  readonly target_payload: Database['public']['Tables']['external_event_cache_invalidation_queue']['Row']['target_payload'];
  readonly source_event_id: string | null;
  readonly origin: QueueOrigin;
  readonly status: QueueStatus;
  readonly retry_count: number;
  readonly max_attempts: number;
  readonly next_attempt_at: string | null;
  readonly last_attempt_at: string | null;
  readonly last_error: string | null;
  readonly expires_at: string;
  readonly dead_lettered_at: string | null;
  readonly dead_letter_reason: string | null;
  readonly next_reconciliation_at: string | null;
  readonly reconciliation_attempt_count: number;
  readonly last_reconciliation_error: string | null;
  readonly resolved_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface EnqueueInput {
  readonly target: EventCacheTarget;
  readonly sourceEventId: string | null;
  readonly origin?: QueueOrigin;
}

export interface EnqueueResult {
  readonly enqueued: number;
  readonly capacityDeadLettered: number;
  readonly duplicatesSuppressed: number;
  readonly enqueuedKeys: readonly string[];
  readonly enqueuedLeaseValues: readonly string[];
  readonly error: string | null;
}

export interface ProcessResult {
  readonly processed: number;
  readonly resolved: number;
  readonly retried: number;
  readonly deadLettered: number;
  readonly errors: number;
}

export interface ReconcileResult {
  readonly processed: number;
  readonly resolved: number;
  readonly retried: number;
  readonly errors: number;
}

interface ClaimedRow {
  readonly row: QueueRow;
  readonly leaseValue: string;
}

interface ClaimResult {
  readonly claimed: ClaimedRow | null;
  readonly error: string | null;
}

interface GuardedUpdateResult {
  readonly error: string | null;
  readonly owned: boolean;
}

export function buildTargetKey(target: EventCacheTarget): string {
  const baseKey = `${target.eventId}:${target.citySlug}:${target.eventSlug}`;
  const scope = target.cacheScope && target.cacheScope !== 'full' ? `:${target.cacheScope}` : '';
  const canonicalization = target.canonicalizationChanged ? ':canonicalization' : '';
  return `${baseKey}${scope}${canonicalization}`;
}

export function buildTargetPayload(target: EventCacheTarget): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    eventId: target.eventId,
    city: target.city,
    state: target.state,
    citySlug: target.citySlug,
    eventSlug: target.eventSlug,
  };
  if (target.cacheScope !== undefined) payload.cacheScope = target.cacheScope;
  if (target.canonicalizationChanged !== undefined) {
    payload.canonicalizationChanged = target.canonicalizationChanged;
  }
  return payload;
}

function buildQueueInsertRow(input: EnqueueInput, targetKey: string): Record<string, unknown> {
  return {
    target_key: targetKey,
    target_payload: buildTargetPayload(input.target),
    source_event_id: input.sourceEventId,
    origin: input.origin ?? 'live',
    status: 'pending' as QueueStatus,
    retry_count: 0,
    max_attempts: QUEUE_MAX_ATTEMPTS,
    next_attempt_at: new Date().toISOString(),
    expires_at: new Date(
      Date.now() + QUEUE_ACTIVE_WINDOW_HOURS * 60 * 60 * 1000,
    ).toISOString(),
  };
}

export function buildLegacyTargetKey(eventId: string): string {
  return `legacy:${eventId}`;
}

export function buildLegacyTargetPayload(
  eventId: string,
  source: string,
  cursor: string | null,
): Record<string, unknown> {
  return {
    eventId,
    source,
    cursor,
    unreconstructable: true,
  };
}

export function computeRetryDelay(retryCount: number): number {
  const baseMinutes = 5;
  const maxMinutes = 60;
  const delay = Math.min(baseMinutes * 2 ** retryCount, maxMinutes);
  return delay * 60 * 1000;
}

export function computeReconciliationBackoff(attemptCount: number): number {
  const baseHours = 1;
  const maxHours = QUEUE_RECONCILIATION_BACKOFF_HOURS;
  const delay = Math.min(baseHours * 2 ** attemptCount, maxHours);
  return delay * 60 * 60 * 1000;
}

export function isExpired(expiresAt: string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function shouldDeadLetterForMaxAttempts(row: QueueRow): boolean {
  return row.retry_count >= row.max_attempts;
}

export function shouldDeadLetterForExpiry(row: QueueRow, now: Date = new Date()): boolean {
  return isExpired(row.expires_at, now);
}

export function shouldTransitionToDeadLetter(row: QueueRow, now: Date = new Date()): boolean {
  return shouldDeadLetterForMaxAttempts(row) || shouldDeadLetterForExpiry(row, now);
}

export function deadLetterReason(row: QueueRow, now: Date = new Date()): DeadLetterReason {
  if (shouldDeadLetterForMaxAttempts(row)) return 'max_attempts_exhausted';
  if (shouldDeadLetterForExpiry(row, now)) return 'active_window_expired';
  return 'capacity_exceeded';
}

export interface CacheInvalidationQueueService {
  enqueue: (inputs: readonly EnqueueInput[]) => Promise<EnqueueResult>;
  processPending: (
    invalidate: (targets: readonly EventCacheTarget[]) => Promise<void>,
  ) => Promise<ProcessResult>;
  reconcileDeadLetters: (
    invalidate: (targets: readonly EventCacheTarget[]) => Promise<void>,
  ) => Promise<ReconcileResult>;
  markResolved: (
    targetKeys: readonly string[],
    leaseValues: readonly string[],
  ) => Promise<string | null>;
  getQueueStats: () => Promise<{
    pending: number;
    deadLetter: number;
    capacityDeadLetter: number;
    resolved: number;
    error: string | null;
  }>;
}

type QueueTableHelper = Database['public']['Tables']['external_event_cache_invalidation_queue'];

export function createCacheInvalidationQueueService(
  staging: SupabaseClient,
): CacheInvalidationQueueService {
  async function fetchPendingKeys(
    keys: readonly string[],
  ): Promise<{ pendingKeys: ReadonlySet<string>; error: string | null }> {
    if (keys.length === 0) return { pendingKeys: new Set(), error: null };
    const { data, error } = await staging
      .from(QUEUE_TABLE)
      .select('target_key')
      .eq('status', 'pending')
      .in('target_key', [...keys]);
    if (error) return { pendingKeys: new Set(), error: error.message };
    const pendingKeys = new Set<string>();
    for (const row of (data ?? []) as unknown as { target_key?: unknown }[]) {
      if (typeof row.target_key === 'string') pendingKeys.add(row.target_key);
    }
    return { pendingKeys, error: null };
  }

  async function enqueue(inputs: readonly EnqueueInput[]): Promise<EnqueueResult> {
    let duplicatesSuppressed = 0;
    const uniqueInputs = new Map<string, EnqueueInput>();
    for (const input of inputs) {
      const targetKey = buildTargetKey(input.target);
      if (uniqueInputs.has(targetKey)) duplicatesSuppressed++;
      else uniqueInputs.set(targetKey, input);
    }
    let remaining = [...uniqueInputs.entries()];
    let enqueued = 0;
    let capacityDeadLettered = 0;
    const enqueuedKeys: string[] = [];
    const enqueuedLeaseValues: string[] = [];

    for (let attempt = 0; attempt <= QUEUE_ENQUEUE_CONFLICT_RETRY_LIMIT && remaining.length > 0; attempt++) {
      const pending = await fetchPendingKeys(remaining.map(([key]) => key));
      if (pending.error) {
        return { enqueued, capacityDeadLettered, duplicatesSuppressed, enqueuedKeys, enqueuedLeaseValues, error: pending.error };
      }
      duplicatesSuppressed += pending.pendingKeys.size;
      const toInsert = remaining.filter(([key]) => !pending.pendingKeys.has(key));
      if (toInsert.length === 0) break;

      const rows = toInsert.map(([key, input]) => buildQueueInsertRow(input, key));
      const { data, error } = await staging
        .from(QUEUE_TABLE)
        .insert(rows as unknown as QueueTableHelper['Insert'][])
        .select('target_key, status, next_attempt_at');

      if (error) {
        const expectedConflict =
          error.code === '23505' && error.message.includes(QUEUE_ACTIVE_TARGET_CONSTRAINT);
        if (!expectedConflict) {
          return { enqueued, capacityDeadLettered, duplicatesSuppressed, enqueuedKeys, enqueuedLeaseValues, error: error.message };
        }
        if (attempt >= QUEUE_ENQUEUE_CONFLICT_RETRY_LIMIT) {
          const finalState = await fetchPendingKeys(toInsert.map(([key]) => key));
          if (finalState.error) {
            return { enqueued, capacityDeadLettered, duplicatesSuppressed, enqueuedKeys, enqueuedLeaseValues, error: finalState.error };
          }
          duplicatesSuppressed += finalState.pendingKeys.size;
          const unknownKeys = toInsert.filter(([key]) => !finalState.pendingKeys.has(key));
          if (unknownKeys.length > 0) {
            return { enqueued, capacityDeadLettered, duplicatesSuppressed, enqueuedKeys, enqueuedLeaseValues, error: 'Queue insert conflicts exceeded retry limit' };
          }
          break;
        }
        remaining = toInsert;
        continue;
      }

      for (const row of (data ?? []) as unknown as {
        target_key: string;
        status: QueueStatus;
        next_attempt_at: string | null;
      }[]) {
        if (row.status === 'capacity_dead_letter') capacityDeadLettered++;
        else {
          enqueued++;
          enqueuedKeys.push(row.target_key);
          if (row.next_attempt_at) enqueuedLeaseValues.push(row.next_attempt_at);
        }
      }
      break;
    }

    return { enqueued, capacityDeadLettered, duplicatesSuppressed, enqueuedKeys, enqueuedLeaseValues, error: null };
  }

  async function claimPendingRow(candidate: QueueRow): Promise<ClaimResult> {
    const leaseValue = new Date(Date.now() + QUEUE_LEASE_MS).toISOString();
    const { data, error } = await staging
      .from(QUEUE_TABLE)
      .update({ next_attempt_at: leaseValue })
      .eq('id', candidate.id)
      .eq('next_attempt_at', candidate.next_attempt_at)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();
    if (error) return { claimed: null, error: error.message };
    if (!data) return { claimed: null, error: null };
    return { claimed: { row: data as unknown as QueueRow, leaseValue }, error: null };
  }

  async function claimReconciliationRow(candidate: QueueRow): Promise<ClaimResult> {
    const leaseValue = new Date(Date.now() + QUEUE_LEASE_MS).toISOString();
    const { data, error } = await staging
      .from(QUEUE_TABLE)
      .update({ next_reconciliation_at: leaseValue })
      .eq('id', candidate.id)
      .eq('next_reconciliation_at', candidate.next_reconciliation_at)
      .in('status', ['dead_letter', 'capacity_dead_letter'])
      .is('resolved_at', null)
      .select('*')
      .maybeSingle();
    if (error) return { claimed: null, error: error.message };
    if (!data) return { claimed: null, error: null };
    return { claimed: { row: data as unknown as QueueRow, leaseValue }, error: null };
  }

  async function guardedUpdate(
    id: string,
    leaseColumn: 'next_attempt_at' | 'next_reconciliation_at',
    leaseValue: string,
    data: Record<string, unknown>,
  ): Promise<GuardedUpdateResult> {
    const { data: updated, error } = await staging
      .from(QUEUE_TABLE)
      .update(data)
      .eq('id', id)
      .eq(leaseColumn, leaseValue)
      .select('id')
      .maybeSingle();
    if (error) return { error: error.message, owned: false };
    return { error: null, owned: updated !== null };
  }

  async function processPending(
    invalidate: (targets: readonly EventCacheTarget[]) => Promise<void>,
  ): Promise<ProcessResult> {
    const now = new Date().toISOString();
    const { data, error } = await staging
      .from(QUEUE_TABLE)
      .select('*')
      .eq('status', 'pending')
      .lte('next_attempt_at', now)
      .order('next_attempt_at', { ascending: true })
      .limit(QUEUE_PROCESSING_BATCH_SIZE);

    if (error) {
      return { processed: 0, resolved: 0, retried: 0, deadLettered: 0, errors: 1 };
    }

    const candidates = (data ?? []) as unknown as QueueRow[];
    if (candidates.length === 0) {
      return { processed: 0, resolved: 0, retried: 0, deadLettered: 0, errors: 0 };
    }

    let processed = 0;
    let resolved = 0;
    let retried = 0;
    let deadLettered = 0;
    let errors = 0;

    for (const candidate of candidates) {
      const claim = await claimPendingRow(candidate);
      if (claim.error) {
        errors++;
        continue;
      }
      if (!claim.claimed) continue;
      processed++;
      const { row, leaseValue } = claim.claimed;

      if (shouldTransitionToDeadLetter(row)) {
        const reason = deadLetterReason(row);
        const result = await guardedUpdate(row.id, 'next_attempt_at', leaseValue, {
          status: 'dead_letter',
          dead_lettered_at: new Date().toISOString(),
          dead_letter_reason: reason,
          next_reconciliation_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });
        if (result.error) errors++;
        else if (result.owned) deadLettered++;
        continue;
      }

      const target = payloadToTarget(row.target_payload);
      if (!target) {
        const legacy = isLegacyPayload(row.target_payload);
        const result = await guardedUpdate(row.id, 'next_attempt_at', leaseValue, {
          status: 'dead_letter',
          dead_lettered_at: new Date().toISOString(),
          dead_letter_reason: legacy ? 'migration_unreconstructable' : 'invalid_target_payload',
          last_attempt_at: new Date().toISOString(),
          last_error: legacy ? 'unreconstructable target payload' : 'invalid target payload',
          next_reconciliation_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });
        if (result.error) errors++;
        else if (result.owned) deadLettered++;
        continue;
      }

      try {
        await invalidate([target]);
        const result = await guardedUpdate(row.id, 'next_attempt_at', leaseValue, {
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString(),
        });
        if (result.error) errors++;
        else if (result.owned) resolved++;
      } catch (invalidationError) {
        const errorMessage =
          invalidationError instanceof Error ? invalidationError.message : 'unknown';
        const newRetryCount = row.retry_count + 1;
        const nextAttemptAt = new Date(
          Date.now() + computeRetryDelay(newRetryCount),
        ).toISOString();

        if (shouldDeadLetterForMaxAttempts({ ...row, retry_count: newRetryCount })) {
          const result = await guardedUpdate(row.id, 'next_attempt_at', leaseValue, {
            retry_count: newRetryCount,
            last_attempt_at: new Date().toISOString(),
            last_error: errorMessage,
            status: 'dead_letter',
            dead_lettered_at: new Date().toISOString(),
            dead_letter_reason: 'max_attempts_exhausted',
            next_reconciliation_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          });
          if (result.error) errors++;
          else if (result.owned) deadLettered++;
        } else {
          const result = await guardedUpdate(row.id, 'next_attempt_at', leaseValue, {
            retry_count: newRetryCount,
            last_attempt_at: new Date().toISOString(),
            last_error: errorMessage,
            next_attempt_at: nextAttemptAt,
          });
          if (result.error) errors++;
          else if (result.owned) retried++;
        }
      }
    }

    return {
      processed,
      resolved,
      retried,
      deadLettered,
      errors,
    };
  }

  async function reconcileDeadLetters(
    invalidate: (targets: readonly EventCacheTarget[]) => Promise<void>,
  ): Promise<ReconcileResult> {
    const now = new Date().toISOString();
    const { data, error } = await staging
      .from(QUEUE_TABLE)
      .select('*')
      .in('status', ['dead_letter', 'capacity_dead_letter'])
      .is('resolved_at', null)
      .lte('next_reconciliation_at', now)
      .order('next_reconciliation_at', { ascending: true })
      .limit(QUEUE_RECONCILIATION_BATCH_SIZE);

    if (error) {
      return { processed: 0, resolved: 0, retried: 0, errors: 1 };
    }

    const candidates = (data ?? []) as unknown as QueueRow[];
    if (candidates.length === 0) {
      return { processed: 0, resolved: 0, retried: 0, errors: 0 };
    }

    let processed = 0;
    let resolved = 0;
    let retried = 0;
    let errors = 0;

    for (const candidate of candidates) {
      const claim = await claimReconciliationRow(candidate);
      if (claim.error) {
        errors++;
        continue;
      }
      if (!claim.claimed) continue;
      processed++;
      const { row, leaseValue } = claim.claimed;

      const target = payloadToTarget(row.target_payload);
      if (!target) {
        const legacy = isLegacyPayload(row.target_payload);
        const result = await guardedUpdate(
          row.id,
          'next_reconciliation_at',
          leaseValue,
          {
            reconciliation_attempt_count: row.reconciliation_attempt_count + 1,
            last_reconciliation_error: legacy
              ? 'unreconstructable target payload'
              : 'invalid target payload',
            next_reconciliation_at: null,
          },
        );
        if (result.error) errors++;
        else if (result.owned) retried++;
        continue;
      }

      try {
        await invalidate([target]);
        const result = await guardedUpdate(
          row.id,
          'next_reconciliation_at',
          leaseValue,
          {
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            reconciliation_attempt_count: row.reconciliation_attempt_count + 1,
          },
        );
        if (result.error) errors++;
        else if (result.owned) resolved++;
      } catch (reconciliationError) {
        const errorMessage =
          reconciliationError instanceof Error ? reconciliationError.message : 'unknown';
        const newAttemptCount = row.reconciliation_attempt_count + 1;
        const result = await guardedUpdate(
          row.id,
          'next_reconciliation_at',
          leaseValue,
          {
            reconciliation_attempt_count: newAttemptCount,
            last_reconciliation_error: errorMessage,
            next_reconciliation_at: new Date(
              Date.now() + computeReconciliationBackoff(newAttemptCount),
            ).toISOString(),
          },
        );
        if (result.error) errors++;
        else if (result.owned) retried++;
      }
    }

    return { processed, resolved, retried, errors };
  }

  async function getQueueStats() {
    const statuses: QueueStatus[] = ['pending', 'dead_letter', 'capacity_dead_letter', 'resolved'];
    const counts = { pending: 0, deadLetter: 0, capacityDeadLetter: 0, resolved: 0 };

    for (const status of statuses) {
      const { count, error } = await staging
        .from(QUEUE_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('status', status);

      if (error) {
        return { pending: 0, deadLetter: 0, capacityDeadLetter: 0, resolved: 0, error: error.message };
      }
      const n = count ?? 0;
      switch (status) {
        case 'pending': {
          counts.pending = n;
          break;
        }
        case 'dead_letter': {
          counts.deadLetter = n;
          break;
        }
        case 'capacity_dead_letter': {
          counts.capacityDeadLetter = n;
          break;
        }
        case 'resolved': {
          counts.resolved = n;
          break;
        }
      }
    }
    return { ...counts, error: null };
  }

  async function markResolved(
    targetKeys: readonly string[],
    leaseValues: readonly string[],
  ): Promise<string | null> {
    if (targetKeys.length === 0 || leaseValues.length === 0) return null;
    const nowIso = new Date().toISOString();
    const { error } = await staging
      .from(QUEUE_TABLE)
      .update({ status: 'resolved', resolved_at: nowIso, last_attempt_at: nowIso })
      .in('target_key', [...targetKeys])
      .in('next_attempt_at', [...leaseValues])
      .eq('status', 'pending');
    return error?.message ?? null;
  }

  return { enqueue, processPending, reconcileDeadLetters, markResolved, getQueueStats };
}

export function payloadToTarget(
  payload: Database['public']['Tables']['external_event_cache_invalidation_queue']['Row']['target_payload'],
): EventCacheTarget | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (
    typeof record['eventId'] !== 'string' ||
    typeof record['citySlug'] !== 'string' ||
    typeof record['eventSlug'] !== 'string' ||
    typeof record['city'] !== 'string' ||
    typeof record['state'] !== 'string'
  ) {
    return null;
  }
  const target = {
    eventId: record['eventId'],
    citySlug: record['citySlug'],
    eventSlug: record['eventSlug'],
    city: record['city'],
    state: record['state'],
    ...(record['cacheScope'] === undefined ? {} : { cacheScope: record['cacheScope'] }),
    ...(record['canonicalizationChanged'] === undefined
      ? {}
      : { canonicalizationChanged: record['canonicalizationChanged'] }),
  };
  if (!isEventCacheTarget(target)) return null;
  return target;
}

function isLegacyPayload(
  payload: Database['public']['Tables']['external_event_cache_invalidation_queue']['Row']['target_payload'],
): boolean {
  return (payload as Record<string, unknown> | null)?.['unreconstructable'] === true;
}
