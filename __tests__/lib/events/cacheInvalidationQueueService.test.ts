/**
 * Tests for lib/events/cacheInvalidationQueue.ts — service operations with a
 * fake Supabase client. No real database is used.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  createCacheInvalidationQueueService,
  QUEUE_TABLE,
  QUEUE_PROCESSING_BATCH_SIZE,
  QUEUE_RECONCILIATION_BATCH_SIZE,
  QUEUE_MAX_ATTEMPTS,
  QUEUE_LEASE_MS,
  QUEUE_ACTIVE_TARGET_CONSTRAINT,
  type QueueStatus,
} from '@/lib/events/cacheInvalidationQueue';
import type { EventCacheTarget } from '@/lib/events/eventPageInvalidation';

type Row = Record<string, unknown>;

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

function makeQueueRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'row-1',
    target_key: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11:savannah-ga:food-truck-friday-2026-08-07',
    target_payload: {
      eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      city: 'Savannah',
      state: 'GA',
      citySlug: 'savannah-ga',
      eventSlug: 'food-truck-friday-2026-08-07',
    },
    source_event_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    origin: 'live',
    status: 'pending',
    retry_count: 0,
    max_attempts: QUEUE_MAX_ATTEMPTS,
    next_attempt_at: '2026-08-07T00:00:00Z',
    last_attempt_at: null,
    last_error: null,
    expires_at: '2099-08-08T00:00:00Z',
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

interface FakeStore {
  rows: Row[];
  updates: { id: string; data: Row }[];
  insertError: { code: string; message: string } | null;
  selectError: { message: string } | null;
  updateError: { message: string } | null;
  duplicateKeys: Set<string>;
  blockedClaimIds: Set<string>;
  materializeConflictKeys: boolean;
  failInsertKeys: Set<string>;
}

function createFakeStaging(initialRows: Row[] = []): {
  client: { from: jest.Mock };
  store: FakeStore;
} {
  const store: FakeStore = {
    rows: [...initialRows],
    updates: [],
    insertError: null,
    selectError: null,
    updateError: null,
    duplicateKeys: new Set<string>(),
    blockedClaimIds: new Set<string>(),
    materializeConflictKeys: false,
    failInsertKeys: new Set<string>(),
  };

  const client = {
    from: jest.fn().mockImplementation((name: string) => {
      if (name !== QUEUE_TABLE) {
        return {
          insert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }),
        };
      }

      return {
        insert: jest.fn().mockImplementation((rows: Row | Row[]) => ({
          select: jest.fn().mockImplementation(() => {
            const batch = Array.isArray(rows) ? rows : [rows];
            if (store.insertError) {
              return Promise.resolve({ data: null, error: store.insertError });
            }
            if (batch.some((row) => store.failInsertKeys.has(row['target_key'] as string))) {
              return Promise.resolve({ data: null, error: { code: '500', message: 'insert failed' } });
            }
            const inserted: Row[] = [];
            for (const row of batch) {
              const targetKey = row['target_key'] as string;
              if (store.duplicateKeys.has(targetKey)) {
                if (store.materializeConflictKeys) {
                  store.rows.push({
                    ...row,
                    id: `row-${store.rows.length + 1}`,
                    status: 'pending',
                    next_attempt_at: row.next_attempt_at ?? '2026-08-07T00:00:00Z',
                  });
                }
                return Promise.resolve({
                  data: null,
                  error: {
                    code: '23505',
                    message: `duplicate key value violates unique constraint "${QUEUE_ACTIVE_TARGET_CONSTRAINT}"`,
                  },
                });
              }
              const newRow = {
                ...row,
                id: row.id ?? `row-${store.rows.length + 1}`,
                status: row.status ?? 'pending',
                next_attempt_at: row.next_attempt_at ?? '2026-08-07T00:00:00Z',
              };
              store.rows.push(newRow);
              inserted.push(newRow);
            }
            return Promise.resolve({
              data: inserted.map((row) => ({
                target_key: row.target_key,
                status: row.status,
                next_attempt_at: row.next_attempt_at,
              })),
              error: null,
            });
          }),
        })),
        select: jest.fn().mockImplementation((_cols: string, options?: { count?: string; head?: boolean }) => {
          if (options?.head === true) {
            return {
              eq: jest.fn().mockImplementation((col: string, val: unknown) => {
                if (store.selectError) {
                  return { count: null, error: store.selectError };
                }
                const n = store.rows.filter((r) => r[col] === val).length;
                return { count: n, error: null };
              }),
            };
          }
          const filters: Array<[string, unknown]> = [];
          const chain = {
            eq: jest.fn().mockImplementation((col: string, val: unknown) => {
              filters.push([col, val]);
              return chain;
            }),
            in: jest.fn().mockImplementation((col: string, vals: unknown[]) => {
              filters.push([col, vals]);
              return chain;
            }),
            lte: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockImplementation((n: number) => {
              if (store.selectError) {
                return { data: null, error: store.selectError };
              }
              return { data: [...store.rows].slice(0, n), error: null };
            }),
            then: (resolve: (value: unknown) => void): void => {
              if (store.selectError) {
                resolve({ data: null, error: store.selectError });
                return;
              }
              const matches = store.rows.filter((row) =>
                filters.every(([col, val]) =>
                  Array.isArray(val) ? val.includes(row[col] as string) : row[col] === val,
                ),
              );
              resolve({ data: matches, error: null });
            },
          };
          return chain;
        }),
        update: jest.fn().mockImplementation((data: Row) => {
          const filters: Array<[string, unknown]> = [];
          const chain: Record<string, jest.Mock> = {
            eq: jest.fn().mockImplementation((col: string, val: unknown) => {
              filters.push([col, val]);
              return chain;
            }),
            in: jest.fn().mockImplementation((col: string, vals: unknown[]) => {
              filters.push([col, vals]);
              return chain;
            }),
            is: jest.fn().mockImplementation((col: string, val: unknown) => {
              filters.push([col, val]);
              return chain;
            }),
            select: jest.fn().mockImplementation((_cols: string) => ({
              maybeSingle: jest.fn().mockImplementation(() => {
                if (store.updateError) {
                  return Promise.resolve({ data: null, error: store.updateError });
                }
                const match = store.rows.find((r) =>
                  filters.every(([col, val]) => {
                    if (Array.isArray(val)) {
                      return val.includes(r[col] as string);
                    }
                    return r[col] === val;
                  }),
                );
                if (!match || store.blockedClaimIds.has(match.id as string)) {
                  return Promise.resolve({ data: null, error: null });
                }
                Object.assign(match, data);
                store.updates.push({ id: match.id as string, data });
                return Promise.resolve({ data: match, error: null });
              }),
            })),
          };
          return chain;
        }),
        delete: jest.fn(),
      };
    }),
  };

  return { client, store };
}

describe('cacheInvalidationQueueService', () => {
  let createService: typeof createCacheInvalidationQueueService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import('@/lib/events/cacheInvalidationQueue');
    createService = mod.createCacheInvalidationQueueService;
  });

  describe('enqueue', () => {
    it('enqueues targets with immutable payload', async () => {
      const { client, store } = createFakeStaging();
      const service = createService(client as never);
      const result = await service.enqueue([
        { target: makeTarget(), sourceEventId: 'prod-uuid-1' },
      ]);
      expect(result.enqueued).toBe(1);
      expect(result.error).toBeNull();
      expect(store.rows).toHaveLength(1);
      expect(store.rows[0].status).toBe('pending');
      expect(store.rows[0].target_payload).toEqual({
        eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        city: 'Savannah',
        state: 'GA',
        citySlug: 'savannah-ga',
        eventSlug: 'food-truck-friday-2026-08-07',
      });
    });

    it('keeps old and new targets as separate rows', async () => {
      const { client, store } = createFakeStaging();
      const service = createService(client as never);
      const oldTarget = makeTarget({ eventSlug: 'old-title-2026-08-07' });
      const newTarget = makeTarget({ eventSlug: 'new-title-2026-08-07' });
      await service.enqueue([
        { target: oldTarget, sourceEventId: 'prod-1' },
        { target: newTarget, sourceEventId: 'prod-2' },
      ]);
      expect(store.rows).toHaveLength(2);
      expect(store.rows[0].target_key).not.toBe(store.rows[1].target_key);
    });

    it('suppresses duplicate pending entries for the same target key', async () => {
      const { client, store } = createFakeStaging([makeQueueRow()]);
      const service = createService(client as never);
      const result = await service.enqueue([
        { target: makeTarget(), sourceEventId: 'prod-1' },
      ]);
      expect(result.error).toBeNull();
      expect(result.duplicatesSuppressed).toBe(1);
      expect(result.enqueued).toBe(0);
      expect(store.rows).toHaveLength(1);
    });

    it('persists non-duplicate targets when a batch contains a partial duplicate', async () => {
      const dupTarget = makeTarget({ eventId: 'evt-dup', citySlug: 'savannah-ga', eventSlug: 'old-slug' });
      const dupKey = 'evt-dup:savannah-ga:old-slug';
      const newTarget = makeTarget({ eventId: 'evt-new', citySlug: 'charleston-sc', eventSlug: 'new-slug' });
      const { client, store } = createFakeStaging([makeQueueRow({ target_key: dupKey })]);
      const service = createService(client as never);
      const result = await service.enqueue([
        { target: dupTarget, sourceEventId: 'dup' },
        { target: newTarget, sourceEventId: 'new' },
      ]);
      expect(result.duplicatesSuppressed).toBe(1);
      expect(result.enqueued).toBe(1);
      expect(store.rows.some((r) => r.target_key === 'evt-new:charleston-sc:new-slug')).toBe(true);
      expect(store.rows.filter((r) => r.target_key === dupKey)).toHaveLength(1);
    });

    it('returns empty result for empty input', async () => {
      const { client } = createFakeStaging();
      const service = createService(client as never);
      const result = await service.enqueue([]);
      expect(result.enqueued).toBe(0);
      expect(result.error).toBeNull();
    });

    it('capacity dead-letters overflow rows', async () => {
      const { client, store } = createFakeStaging();
      store.insertError = null;
      const service = createService(client as never);
      const origPush = store.rows.push.bind(store.rows);
      store.rows.push = (...items: Row[]) => {
        for (const item of items) {
          item.status = 'capacity_dead_letter';
        }
        return origPush(...items);
      };
      const result = await service.enqueue([
        { target: makeTarget(), sourceEventId: 'prod-1' },
      ]);
      expect(result.capacityDeadLettered).toBe(1);
      expect(result.enqueued).toBe(0);
    });

    it('deduplicates identical target keys within a single batch', async () => {
      const { client, store } = createFakeStaging();
      const service = createService(client as never);
      const result = await service.enqueue([
        { target: makeTarget(), sourceEventId: 'prod-1' },
        { target: makeTarget(), sourceEventId: 'prod-2' },
      ]);
      expect(result.enqueued).toBe(1);
      expect(result.duplicatesSuppressed).toBe(1);
      expect(store.rows).toHaveLength(1);
    });

    it('inserts a multi-row batch in one atomic statement', async () => {
      const { client, store } = createFakeStaging();
      const service = createService(client as never);
      const result = await service.enqueue([
        { target: makeTarget({ eventId: 'event-a' }), sourceEventId: 'prod-a' },
        { target: makeTarget({ eventId: 'event-b' }), sourceEventId: 'prod-b' },
      ]);
      expect(result.error).toBeNull();
      expect(result.enqueued).toBe(2);
      expect(store.rows).toHaveLength(2);
    });

    it('leaves no rows when the atomic insert fails', async () => {
      const { client, store } = createFakeStaging();
      store.insertError = { code: '500', message: 'insert failed' };
      const service = createService(client as never);
      const result = await service.enqueue([
        { target: makeTarget({ eventId: 'event-a' }), sourceEventId: 'prod-a' },
        { target: makeTarget({ eventId: 'event-b' }), sourceEventId: 'prod-b' },
      ]);
      expect(result.error).toBe('insert failed');
      expect(result.enqueued).toBe(0);
      expect(store.rows).toHaveLength(0);
    });

    it('retries a named active-target conflict and inserts the remaining keys', async () => {
      const racedKey = 'event-race:savannah-ga:race-slug';
      const { client, store } = createFakeStaging();
      store.duplicateKeys.add(racedKey);
      store.materializeConflictKeys = true;
      const service = createService(client as never);
      const result = await service.enqueue([
        { target: makeTarget({ eventId: 'event-race', eventSlug: 'race-slug' }), sourceEventId: 'prod-race' },
        { target: makeTarget({ eventId: 'event-new' }), sourceEventId: 'prod-new' },
      ]);
      expect(result.error).toBeNull();
      expect(result.enqueued).toBe(1);
      expect(result.duplicatesSuppressed).toBe(1);
      expect(store.rows.some((row) => row.target_key === 'event-new:savannah-ga:food-truck-friday-2026-08-07')).toBe(true);
    });

    it('fails closed when an active-target conflict cannot be reconciled', async () => {
      const racedKey = 'event-race:savannah-ga:race-slug';
      const { client, store } = createFakeStaging();
      store.duplicateKeys.add(racedKey);
      const service = createService(client as never);
      const result = await service.enqueue([
        { target: makeTarget({ eventId: 'event-race', eventSlug: 'race-slug' }), sourceEventId: 'prod-race' },
      ]);
      expect(result.error).not.toBeNull();
      expect(result.enqueued).toBe(0);
      expect(store.rows).toHaveLength(0);
    });

    it('treats unexpected unique violations as hard failures', async () => {
      const { client, store } = createFakeStaging();
      store.insertError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "some_other_constraint"',
      };
      const service = createService(client as never);
      const result = await service.enqueue([{ target: makeTarget(), sourceEventId: 'prod-1' }]);
      expect(result.error).not.toBeNull();
      expect(store.rows).toHaveLength(0);
    });

    it('fails closed when pending-key lookup fails', async () => {
      const { client, store } = createFakeStaging();
      store.selectError = { message: 'prefilter failed' };
      const service = createService(client as never);
      const result = await service.enqueue([{ target: makeTarget(), sourceEventId: 'prod-1' }]);
      expect(result.error).toBe('prefilter failed');
      expect(store.rows).toHaveLength(0);
    });

    it('returns enqueued keys and lease values', async () => {
      const { client } = createFakeStaging();
      const service = createService(client as never);
      const result = await service.enqueue([{ target: makeTarget(), sourceEventId: 'prod-1' }]);
      expect(result.enqueuedKeys).toEqual([
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11:savannah-ga:food-truck-friday-2026-08-07',
      ]);
      expect(result.enqueuedLeaseValues).toHaveLength(1);
      expect(result.enqueuedLeaseValues[0]).toEqual(expect.any(String));
    });
  });

  describe('processPending', () => {
    it('resolves targets on successful invalidation', async () => {
      const row = makeQueueRow({ expires_at: '2099-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.processPending(invalidate);
      expect(result.resolved).toBe(1);
      expect(invalidate).toHaveBeenCalled();
      expect(store.updates.at(-1).data.status).toBe('resolved');
      expect(store.updates.at(-1).data.resolved_at).toBeDefined();
    });

    it('increments retry state and schedules next_attempt on failure', async () => {
      const row = makeQueueRow({ retry_count: 0, expires_at: '2026-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockRejectedValue(new Error('HTTP 500'));
      const result = await service.processPending(invalidate);
      expect(result.retried).toBe(1);
      expect(store.updates.at(-1).data.retry_count).toBe(1);
      expect(store.updates.at(-1).data.last_error).toBe('HTTP 500');
      expect(store.updates.at(-1).data.next_attempt_at).toBeDefined();
    });

    it('transitions to dead_letter when max attempts exhausted', async () => {
      const row = makeQueueRow({ retry_count: QUEUE_MAX_ATTEMPTS - 1, expires_at: '2026-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockRejectedValue(new Error('HTTP 500'));
      const result = await service.processPending(invalidate);
      expect(result.deadLettered).toBe(1);
      expect(store.updates.at(-1).data.status).toBe('dead_letter');
      expect(store.updates.at(-1).data.dead_letter_reason).toBe('max_attempts_exhausted');
      expect(store.updates.at(-1).data.dead_lettered_at).toBeDefined();
    });

    it('transitions to dead_letter when active window expires', async () => {
      const row = makeQueueRow({
        expires_at: '2026-01-01T00:00:00Z',
        retry_count: 1,
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn();
      const result = await service.processPending(invalidate);
      expect(result.deadLettered).toBe(1);
      expect(store.updates.at(-1).data.status).toBe('dead_letter');
      expect(store.updates.at(-1).data.dead_letter_reason).toBe('active_window_expired');
      expect(invalidate).not.toHaveBeenCalled();
    });

    it('dead-letters a row with an invalid target payload without invalidating', async () => {
      const row = makeQueueRow({
        target_key: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11:dallas-tx:lacd-adult-field-day-2026-08-29',
        target_payload: {
          eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          city: 'Dallas',
          state: 'TX',
          citySlug: 'dallas-tx',
          eventSlug: 'lacd-adult-field-day-2026-08-29',
        },
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.processPending(invalidate);
      expect(result.deadLettered).toBe(1);
      expect(invalidate).not.toHaveBeenCalled();
      expect(store.updates.at(-1).data.status).toBe('dead_letter');
      expect(store.updates.at(-1).data.dead_letter_reason).toBe('invalid_target_payload');
    });

    it('dead-letters a legacy unreconstructable payload with the migration reason', async () => {
      const row = makeQueueRow({
        target_payload: { eventId: 'legacy-uuid', unreconstructable: true },
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.processPending(invalidate);
      expect(result.deadLettered).toBe(1);
      expect(invalidate).not.toHaveBeenCalled();
      expect(store.updates.at(-1).data.status).toBe('dead_letter');
      expect(store.updates.at(-1).data.dead_letter_reason).toBe('migration_unreconstructable');
      expect(store.updates.at(-1).data.last_error).toBe('unreconstructable target payload');
    });

    it('terminalizes an invalid target payload on reconciliation', async () => {
      const row = makeQueueRow({
        status: 'dead_letter',
        target_key: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11:dallas-tx:lacd-adult-field-day-2026-08-29',
        target_payload: {
          eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          city: 'Dallas',
          state: 'TX',
          citySlug: 'dallas-tx',
          eventSlug: 'lacd-adult-field-day-2026-08-29',
        },
        next_reconciliation_at: '2026-08-07T00:00:00Z',
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.reconcileDeadLetters(invalidate);
      expect(result.retried).toBe(1);
      expect(invalidate).not.toHaveBeenCalled();
      expect(store.updates.at(-1).data.next_reconciliation_at).toBeNull();
    });

    it('processes at most QUEUE_PROCESSING_BATCH_SIZE rows', async () => {
      const rows = Array.from({ length: QUEUE_PROCESSING_BATCH_SIZE + 5 }, (_, i) =>
        makeQueueRow({ id: `row-${i}`, target_key: `event-${i}:c:s` }),
      );
      const { client } = createFakeStaging(rows);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.processPending(invalidate);
      expect(result.processed).toBeLessThanOrEqual(QUEUE_PROCESSING_BATCH_SIZE);
    });

    it('returns zero results when queue is empty', async () => {
      const { client } = createFakeStaging();
      const service = createService(client as never);
      const result = await service.processPending(jest.fn());
      expect(result.processed).toBe(0);
      expect(result.resolved).toBe(0);
    });

    it('only processes rows whose claim succeeds', async () => {
      const row = makeQueueRow({ expires_at: '2099-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.processPending(invalidate);
      expect(result.processed).toBe(1);
      expect(result.resolved).toBe(1);
      expect(invalidate).toHaveBeenCalledTimes(1);
      expect(store.rows[0].status).toBe('resolved');
    });

    it('skips rows whose claim fails (already claimed by another worker)', async () => {
      const row = makeQueueRow({ expires_at: '2099-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([row]);
      store.blockedClaimIds.add('row-1');
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.processPending(invalidate);
      expect(result.processed).toBe(0);
      expect(result.resolved).toBe(0);
      expect(invalidate).not.toHaveBeenCalled();
      expect(store.rows[0].status).toBe('pending');
    });

    it('does not resolve a row whose lease was lost before the guarded update', async () => {
      const row = makeQueueRow({ expires_at: '2099-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockImplementation(async () => {
        const claimed = store.rows[0];
        claimed.next_attempt_at = '2099-01-01T00:00:00Z';
      });
      const result = await service.processPending(invalidate);
      expect(result.resolved).toBe(0);
      expect(result.processed).toBe(1);
    });

    it('returns errors when the claim update fails', async () => {
      const row = makeQueueRow({ expires_at: '2099-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([row]);
      store.updateError = { message: 'claim failed' };
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.processPending(invalidate);
      expect(result.errors).toBe(1);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });

  describe('reconcileDeadLetters', () => {
    it('resolves dead letters on successful invalidation', async () => {
      const row = makeQueueRow({
        status: 'dead_letter',
        dead_lettered_at: '2026-08-07T00:00:00Z',
        next_reconciliation_at: '2026-08-07T00:00:00Z',
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.reconcileDeadLetters(invalidate);
      expect(result.resolved).toBe(1);
      expect(store.updates.at(-1).data.status).toBe('resolved');
      expect(store.updates.at(-1).data.resolved_at).toBeDefined();
    });

    it('increments reconciliation attempt count on failure', async () => {
      const row = makeQueueRow({
        status: 'dead_letter',
        next_reconciliation_at: '2026-08-07T00:00:00Z',
        reconciliation_attempt_count: 0,
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockRejectedValue(new Error('still down'));
      const result = await service.reconcileDeadLetters(invalidate);
      expect(result.retried).toBe(1);
      expect(store.updates.at(-1).data.reconciliation_attempt_count).toBe(1);
      expect(store.updates.at(-1).data.last_reconciliation_error).toBe('still down');
      expect(store.updates.at(-1).data.next_reconciliation_at).toBeDefined();
    });

    it('schedules backoff so persistent outage does not create heavy load', async () => {
      const row = makeQueueRow({
        status: 'dead_letter',
        next_reconciliation_at: '2026-08-07T00:00:00Z',
        reconciliation_attempt_count: 5,
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockRejectedValue(new Error('down'));
      await service.reconcileDeadLetters(invalidate);
      const nextRecon = store.updates.at(-1).data.next_reconciliation_at as string;
      expect(new Date(nextRecon).getTime()).toBeGreaterThan(Date.now());
    });

    it('processes at most QUEUE_RECONCILIATION_BATCH_SIZE dead letters', async () => {
      const rows = Array.from(
        { length: QUEUE_RECONCILIATION_BATCH_SIZE + 10 },
        (_, i) =>
          makeQueueRow({
            id: `dl-${i}`,
            target_key: `event-${i}:c:s`,
            status: 'dead_letter' as QueueStatus,
            next_reconciliation_at: '2026-08-07T00:00:00Z',
          }),
      );
      const { client } = createFakeStaging(rows);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.reconcileDeadLetters(invalidate);
      expect(result.processed).toBeLessThanOrEqual(QUEUE_RECONCILIATION_BATCH_SIZE);
    });

    it('skips legacy unreconstructable targets', async () => {
      const row = makeQueueRow({
        status: 'dead_letter',
        target_payload: { eventId: 'legacy-uuid', unreconstructable: true },
        next_reconciliation_at: '2026-08-07T00:00:00Z',
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.reconcileDeadLetters(invalidate);
      expect(result.retried).toBe(1);
      expect(invalidate).not.toHaveBeenCalled();
      expect(store.updates.at(-1).data.last_reconciliation_error).toBe('unreconstructable target payload');
    });

    it('records invalid target payload on reconciliation of an out-of-footprint row', async () => {
      const row = makeQueueRow({
        status: 'dead_letter',
        target_key: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11:dallas-tx:lacd-adult-field-day-2026-08-29',
        target_payload: {
          eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          city: 'Dallas',
          state: 'TX',
          citySlug: 'dallas-tx',
          eventSlug: 'lacd-adult-field-day-2026-08-29',
        },
        next_reconciliation_at: '2026-08-07T00:00:00Z',
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.reconcileDeadLetters(invalidate);
      expect(result.retried).toBe(1);
      expect(invalidate).not.toHaveBeenCalled();
      expect(store.updates.at(-1).data.last_reconciliation_error).toBe('invalid target payload');
    });

    it('reconciliation has no terminal retry limit', async () => {
      const row = makeQueueRow({
        status: 'dead_letter',
        next_reconciliation_at: '2026-08-07T00:00:00Z',
        reconciliation_attempt_count: 999,
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.reconcileDeadLetters(invalidate);
      expect(result.resolved).toBe(1);
    });

    it('returns zero results when no dead letters due', async () => {
      const { client } = createFakeStaging();
      const service = createService(client as never);
      const result = await service.reconcileDeadLetters(jest.fn());
      expect(result.processed).toBe(0);
      expect(result.resolved).toBe(0);
    });
  });

  describe('getQueueStats', () => {
    it('counts rows by status', async () => {
      const rows = [
        makeQueueRow({ id: '1', status: 'pending' }),
        makeQueueRow({ id: '2', status: 'pending' }),
        makeQueueRow({ id: '3', status: 'dead_letter' }),
        makeQueueRow({ id: '4', status: 'capacity_dead_letter' }),
        makeQueueRow({ id: '5', status: 'resolved' }),
      ];
      const { client } = createFakeStaging(rows);
      const service = createService(client as never);
      const stats = await service.getQueueStats();
      expect(stats.pending).toBe(2);
      expect(stats.deadLetter).toBe(1);
      expect(stats.capacityDeadLetter).toBe(1);
      expect(stats.resolved).toBe(1);
    });

    it('returns error on failure', async () => {
      const { client, store } = createFakeStaging();
      store.selectError = { message: 'fail' };
      const service = createService(client as never);
      const stats = await service.getQueueStats();
      expect(stats.error).toBe('fail');
    });
  });

  describe('lease semantics', () => {
    it('claims a row by moving next_attempt_at into the future', async () => {
      const row = makeQueueRow({ expires_at: '2099-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      await service.processPending(invalidate);
      const claimUpdate = store.updates.find((u) => u.data.next_attempt_at !== undefined);
      expect(claimUpdate).toBeDefined();
      const leaseValue = claimUpdate?.data.next_attempt_at as string;
      expect(new Date(leaseValue).getTime()).toBeGreaterThan(Date.now());
      expect(new Date(leaseValue).getTime() - Date.now()).toBeLessThanOrEqual(QUEUE_LEASE_MS + 1000);
    });

    it('preserves the database-returned next_attempt_at representation in the CAS predicate', async () => {
      const microsecondValue = '2026-08-07T00:00:00.123456Z';
      const row = makeQueueRow({
        expires_at: '2099-12-31T00:00:00Z',
        next_attempt_at: microsecondValue,
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      await service.processPending(invalidate);
      const claimUpdate = store.updates.find((u) => u.data.next_attempt_at !== undefined);
      expect(claimUpdate).toBeDefined();
      expect(claimUpdate?.data.next_attempt_at).not.toBe(microsecondValue);
    });

    it('markResolved skips when no lease values are provided', async () => {
      const { client, store } = createFakeStaging();
      const service = createService(client as never);
      const updatesBefore = store.updates.length;
      const error = await service.markResolved(
        ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11:savannah-ga:food-truck-friday-2026-08-07'],
        [],
      );
      expect(error).toBeNull();
      expect(client.from).not.toHaveBeenCalled();
      expect(store.updates).toHaveLength(updatesBefore);
    });
  });
});
