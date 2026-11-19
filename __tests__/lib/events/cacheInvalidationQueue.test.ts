/**
 * Tests for lib/events/cacheInvalidationQueue.ts — pure logic functions.
 */

import { describe, it, expect } from '@jest/globals';
import {
  buildTargetKey,
  buildTargetPayload,
  buildLegacyTargetKey,
  buildLegacyTargetPayload,
  computeRetryDelay,
  computeReconciliationBackoff,
  isExpired,
  shouldDeadLetterForMaxAttempts,
  shouldDeadLetterForExpiry,
  shouldTransitionToDeadLetter,
  deadLetterReason,
  payloadToTarget,
  QUEUE_MAX_ACTIVE_ROWS,
  QUEUE_PROCESSING_BATCH_SIZE,
  QUEUE_MAX_ATTEMPTS,
  QUEUE_ACTIVE_WINDOW_HOURS,
  QUEUE_RECONCILIATION_BATCH_SIZE,
  QUEUE_RECONCILIATION_BACKOFF_HOURS,
  type QueueRow,
} from '@/lib/events/cacheInvalidationQueue';
import type { EventCacheTarget } from '@/lib/events/eventPageInvalidation';

function makeTarget(overrides: Partial<EventCacheTarget> = {}): EventCacheTarget {
  return {
    eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    city: 'Savannah',
    state: 'GA',
    citySlug: 'savannah-ga',
    eventSlug: 'food-truck-friday-2026-08-07',
    ...overrides,
  };
}

function makeRow(overrides: Partial<QueueRow> = {}): QueueRow {
  return {
    id: 'row-1',
    target_key: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11:savannah-ga:food-truck-friday-2026-08-07',
    target_payload: buildTargetPayload(makeTarget()),
    source_event_id: 'event-1',
    origin: 'live',
    status: 'pending',
    retry_count: 0,
    max_attempts: QUEUE_MAX_ATTEMPTS,
    next_attempt_at: '2026-08-07T00:00:00Z',
    last_attempt_at: null,
    last_error: null,
    expires_at: '2026-08-08T00:00:00Z',
    dead_lettered_at: null,
    dead_letter_reason: null,
    next_reconciliation_at: null,
    reconciliation_attempt_count: 0,
    last_reconciliation_error: null,
    resolved_at: null,
    created_at: '2026-08-07T00:00:00Z',
    updated_at: '2026-08-07T00:00:00Z',
    ...overrides,
  };
}

describe('cacheInvalidationQueue pure logic', () => {
  describe('buildTargetKey', () => {
    it('builds a key from eventId, citySlug, and eventSlug', () => {
      expect(buildTargetKey(makeTarget())).toBe(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11:savannah-ga:food-truck-friday-2026-08-07',
      );
    });

    it('produces different keys for old and new targets on slug change', () => {
      const oldTarget = makeTarget({
        eventSlug: 'old-title-2026-08-07',
        citySlug: 'savannah-ga',
      });
      const newTarget = makeTarget({
        eventSlug: 'new-title-2026-08-07',
        citySlug: 'savannah-ga',
      });
      expect(buildTargetKey(oldTarget)).not.toBe(buildTargetKey(newTarget));
    });

    it('produces different keys for old and new targets on city change', () => {
      const oldTarget = makeTarget({ citySlug: 'savannah-ga' });
      const newTarget = makeTarget({ citySlug: 'charleston-sc' });
      expect(buildTargetKey(oldTarget)).not.toBe(buildTargetKey(newTarget));
    });

    it('keeps scoped targets distinct from full-fan-out targets', () => {
      const fullKey = buildTargetKey(makeTarget());
      expect(buildTargetKey(makeTarget({ cacheScope: 'city' }))).toBe(`${fullKey}:city`);
      expect(buildTargetKey(makeTarget({ cacheScope: 'detail' }))).toBe(`${fullKey}:detail`);
      expect(buildTargetKey(makeTarget({ cacheScope: 'full' }))).toBe(fullKey);
    });

    it('keeps canonicalization invalidations distinct from ordinary targets', () => {
      expect(buildTargetKey(makeTarget({ canonicalizationChanged: true }))).not.toBe(
        buildTargetKey(makeTarget()),
      );
    });
  });

  describe('buildTargetPayload', () => {
    it('stores an immutable snapshot of all cache target fields', () => {
      const target = makeTarget();
      const payload = buildTargetPayload(target);
      expect(payload).toEqual({
        eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        city: 'Savannah',
        state: 'GA',
        citySlug: 'savannah-ga',
        eventSlug: 'food-truck-friday-2026-08-07',
      });
    });

    it('captures exact old and new target fields separately', () => {
      const oldTarget = makeTarget({
        eventSlug: 'old-title-2026-08-07',
        city: 'Savannah',
        state: 'GA',
        citySlug: 'savannah-ga',
      });
      const newTarget = makeTarget({
        eventSlug: 'new-title-2026-08-07',
        city: 'Charleston',
        state: 'SC',
        citySlug: 'charleston-sc',
      });
      const oldPayload = buildTargetPayload(oldTarget);
      const newPayload = buildTargetPayload(newTarget);
      expect(oldPayload.eventSlug).toBe('old-title-2026-08-07');
      expect(newPayload.eventSlug).toBe('new-title-2026-08-07');
      expect(oldPayload.city).toBe('Savannah');
      expect(newPayload.city).toBe('Charleston');
    });

    it('persists a scoped invalidation target', () => {
      expect(buildTargetPayload(makeTarget({ cacheScope: 'city' }))).toEqual({
        eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        city: 'Savannah',
        state: 'GA',
        citySlug: 'savannah-ga',
        eventSlug: 'food-truck-friday-2026-08-07',
        cacheScope: 'city',
      });
    });
  });

  describe('buildLegacyTargetKey', () => {
    it('builds a legacy-prefixed key from an event ID', () => {
      expect(buildLegacyTargetKey('event-uuid-123')).toBe('legacy:event-uuid-123');
    });

    it('produces different keys from live target keys', () => {
      expect(buildLegacyTargetKey('event-1')).not.toBe(
        buildTargetKey(makeTarget({ eventId: 'event-1' })),
      );
    });
  });

  describe('buildLegacyTargetPayload', () => {
    it('stores eventId, source, cursor, and unreconstructable flag', () => {
      const payload = buildLegacyTargetPayload('event-uuid', 'savannah_eproval', 'cursor-uuid');
      expect(payload).toEqual({
        eventId: 'event-uuid',
        source: 'savannah_eproval',
        cursor: 'cursor-uuid',
        unreconstructable: true,
      });
    });

    it('handles null cursor', () => {
      const payload = buildLegacyTargetPayload('event-uuid', 'savannah_eproval', null);
      expect(payload.cursor).toBeNull();
      expect(payload.unreconstructable).toBe(true);
    });

    it('does not synthesize a cache target from event data', () => {
      const payload = buildLegacyTargetPayload('event-uuid', 'savannah_eproval', null);
      expect(payload.citySlug).toBeUndefined();
      expect(payload.eventSlug).toBeUndefined();
      expect(payload.city).toBeUndefined();
      expect(payload.state).toBeUndefined();
    });
  });

  describe('computeRetryDelay', () => {
    it('returns increasing delays with exponential backoff', () => {
      const d0 = computeRetryDelay(0);
      const d1 = computeRetryDelay(1);
      const d2 = computeRetryDelay(2);
      expect(d1).toBeGreaterThan(d0);
      expect(d2).toBeGreaterThan(d1);
    });

    it('caps at maximum delay', () => {
      const maxDelay = 60 * 60 * 1000;
      expect(computeRetryDelay(100)).toBe(maxDelay);
    });
  });

  describe('computeReconciliationBackoff', () => {
    it('returns increasing backoff with attempt count', () => {
      const d0 = computeReconciliationBackoff(0);
      const d1 = computeReconciliationBackoff(1);
      expect(d1).toBeGreaterThan(d0);
    });

    it('caps at QUEUE_RECONCILIATION_BACKOFF_HOURS', () => {
      const maxMs = QUEUE_RECONCILIATION_BACKOFF_HOURS * 60 * 60 * 1000;
      expect(computeReconciliationBackoff(100)).toBe(maxMs);
    });
  });

  describe('isExpired', () => {
    it('returns true when expires_at is in the past', () => {
      expect(isExpired('2026-01-01T00:00:00Z', new Date('2026-08-07T00:00:00Z'))).toBe(true);
    });

    it('returns false when expires_at is in the future', () => {
      expect(isExpired('2026-12-31T00:00:00Z', new Date('2026-08-07T00:00:00Z'))).toBe(false);
    });
  });

  describe('shouldDeadLetterForMaxAttempts', () => {
    it('returns false when retry_count < max_attempts', () => {
      expect(shouldDeadLetterForMaxAttempts(makeRow({ retry_count: 2, max_attempts: 5 }))).toBe(
        false,
      );
    });

    it('returns true when retry_count >= max_attempts', () => {
      expect(shouldDeadLetterForMaxAttempts(makeRow({ retry_count: 5, max_attempts: 5 }))).toBe(
        true,
      );
    });
  });

  describe('shouldDeadLetterForExpiry', () => {
    it('returns true when expires_at is past', () => {
      const row = makeRow({ expires_at: '2026-01-01T00:00:00Z' });
      expect(shouldDeadLetterForExpiry(row, new Date('2026-08-07T00:00:00Z'))).toBe(true);
    });

    it('returns false when expires_at is future', () => {
      const row = makeRow({ expires_at: '2026-12-31T00:00:00Z' });
      expect(shouldDeadLetterForExpiry(row, new Date('2026-08-07T00:00:00Z'))).toBe(false);
    });
  });

  describe('shouldTransitionToDeadLetter', () => {
    it('returns true when max attempts exhausted', () => {
      expect(
        shouldTransitionToDeadLetter(makeRow({ retry_count: 5, max_attempts: 5 })),
      ).toBe(true);
    });

    it('returns true when active window expired', () => {
      expect(
        shouldTransitionToDeadLetter(
          makeRow({ expires_at: '2026-01-01T00:00:00Z' }),
          new Date('2026-08-07T00:00:00Z'),
        ),
      ).toBe(true);
    });

    it('returns false when neither condition met', () => {
      expect(
        shouldTransitionToDeadLetter(
          makeRow({ retry_count: 2, max_attempts: 5, expires_at: '2026-12-31T00:00:00Z' }),
          new Date('2026-08-07T00:00:00Z'),
        ),
      ).toBe(false);
    });
  });

  describe('deadLetterReason', () => {
    it('returns max_attempts_exhausted when retry count is exhausted', () => {
      expect(
        deadLetterReason(makeRow({ retry_count: 5, max_attempts: 5 })),
      ).toBe('max_attempts_exhausted');
    });

    it('returns active_window_expired when expiry is past', () => {
      expect(
        deadLetterReason(
          makeRow({ retry_count: 1, expires_at: '2026-01-01T00:00:00Z' }),
          new Date('2026-08-07T00:00:00Z'),
        ),
      ).toBe('active_window_expired');
    });

    it('returns capacity_exceeded as fallback', () => {
      expect(
        deadLetterReason(
          makeRow({ retry_count: 1, max_attempts: 5, expires_at: '2026-12-31T00:00:00Z' }),
          new Date('2026-08-07T00:00:00Z'),
        ),
      ).toBe('capacity_exceeded');
    });
  });

  describe('payloadToTarget', () => {
    it('reconstructs a valid EventCacheTarget from payload', () => {
      const target = makeTarget();
      const payload = buildTargetPayload(target);
      const result = payloadToTarget(payload);
      expect(result).toEqual(target);
    });

    it('round-trips a scoped EventCacheTarget from payload', () => {
      const target = makeTarget({ cacheScope: 'detail' });
      const payload = buildTargetPayload(target);
      expect(payloadToTarget(payload)).toEqual(target);
    });

    it('round-trips the canonicalization invalidation marker from payload', () => {
      const target = makeTarget({ canonicalizationChanged: true });
      const payload = buildTargetPayload(target);

      expect(payloadToTarget(payload)).toEqual(target);
    });

    it('returns null for legacy unreconstructable payload', () => {
      const legacyPayload = buildLegacyTargetPayload('event-uuid', 'source', null);
      expect(payloadToTarget(legacyPayload)).toBeNull();
    });

    it('returns null for null payload', () => {
      expect(payloadToTarget(null)).toBeNull();
    });

    it('returns null for payload missing required fields', () => {
      expect(payloadToTarget({ eventId: 'x' })).toBeNull();
    });

    it('returns null for a payload with an out-of-footprint state', () => {
      const payload = buildTargetPayload(makeTarget({ state: 'TX', citySlug: 'dallas-tx' }));
      expect(payloadToTarget(payload)).toBeNull();
    });
  });

  describe('production vs staging event IDs', () => {
    it('sourceEventId stores production UUID, not staging UUID', () => {
      const prodTarget = makeTarget({ eventId: 'prod-uuid-123' });
      const stagingTarget = makeTarget({ eventId: 'staging-uuid-456' });
      const prodPayload = buildTargetPayload(prodTarget);
      const stagingPayload = buildTargetPayload(stagingTarget);
      expect(prodPayload.eventId).toBe('prod-uuid-123');
      expect(stagingPayload.eventId).toBe('staging-uuid-456');
      expect(prodPayload.eventId).not.toBe(stagingPayload.eventId);
    });
  });

  describe('queue tunables', () => {
    it('has maximum 1,000 active rows', () => {
      expect(QUEUE_MAX_ACTIVE_ROWS).toBe(1000);
    });

    it('has processing batch size of 100', () => {
      expect(QUEUE_PROCESSING_BATCH_SIZE).toBe(100);
    });

    it('has five queue-level retry attempts', () => {
      expect(QUEUE_MAX_ATTEMPTS).toBe(5);
    });

    it('has 24-hour active retry window', () => {
      expect(QUEUE_ACTIVE_WINDOW_HOURS).toBe(24);
    });

    it('has bounded reconciliation batch size', () => {
      expect(QUEUE_RECONCILIATION_BATCH_SIZE).toBe(50);
    });
  });
});
