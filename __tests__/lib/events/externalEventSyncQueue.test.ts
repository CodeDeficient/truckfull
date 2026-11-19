/**
 * Tests for the four PR #1013 review fixes:
 * 1. Idle draining (zero-event sync still drains pending retries and dead letters)
 * 2. Production-only replay identities
 * 3. Cursor safety (queue errors block cursor advancement)
 * 4. Concurrent queue claims (CAS lease)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  createCacheInvalidationQueueService,
  QUEUE_TABLE,
  QUEUE_MAX_ATTEMPTS,
  QUEUE_LEASE_MS,
  type QueueStatus,
} from '@/lib/events/cacheInvalidationQueue';
import { syncExternalEventsToProd } from '@/lib/events/externalEventSync';
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
  markResolvedError: { message: string } | null;
  markResolvedThrow: boolean;
}

function cloneRow(row: Row): Row {
  return JSON.parse(JSON.stringify(row)) as Row;
}

function createFakeStaging(initialRows: Row[] = []): {
  client: { from: jest.Mock };
  store: FakeStore;
} {
  const store: FakeStore = {
    rows: initialRows.map(cloneRow),
    updates: [],
    insertError: null,
    selectError: null,
    updateError: null,
    markResolvedError: null,
    markResolvedThrow: false,
  };

  const client = {
    from: jest.fn().mockImplementation((name: string) => {
      if (name !== QUEUE_TABLE) {
        return {
          insert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          upsert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: null, error: null }) }),
        };
      }

      return {
        insert: jest.fn().mockImplementation((rows: Row | Row[]) => ({
          select: jest.fn().mockImplementation(() => {
            const batch = Array.isArray(rows) ? rows : [rows];
            if (store.insertError) {
              const result = { data: null, error: store.insertError };
              return {
                single: jest.fn().mockResolvedValue(result),
                then: (resolve: (value: unknown) => void): void => resolve(result),
              };
            }
            const inserted: Row[] = [];
            for (const row of batch) {
              const newRow = {
                ...row,
                id: row.id ?? `row-${store.rows.length + 1}`,
                status: row.status ?? 'pending',
                next_attempt_at: row.next_attempt_at ?? '2026-08-07T00:00:00Z',
              };
              store.rows.push(newRow);
              inserted.push(newRow);
            }
            const result = {
              data: inserted.map((row) => ({
                target_key: row.target_key,
                status: row.status,
                next_attempt_at: row.next_attempt_at,
              })),
              error: null,
            };
            return {
              single: jest.fn().mockResolvedValue({ data: result.data[0] ?? null, error: null }),
              then: (resolve: (value: unknown) => void): void => resolve(result),
            };
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
              return { data: store.rows.slice(0, n).map(cloneRow), error: null };
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
              resolve({ data: matches.map(cloneRow), error: null });
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
                if (!match) {
                  return Promise.resolve({ data: null, error: null });
                }
                Object.assign(match, data);
                store.updates.push({ id: match.id as string, data });
                return Promise.resolve({ data: match, error: null });
              }),
            })),
            then: (resolve: (value: unknown) => void): void => {
              if (store.markResolvedThrow) throw new Error('markResolved threw');
              if (store.markResolvedError) {
                resolve({ data: null, error: store.markResolvedError });
                return;
              }
              resolve({ data: null, error: null });
            },
          };
          return chain;
        }),
        delete: jest.fn(),
      };
    }),
  };

  return { client, store };
}

function makeSyncStaging(events: unknown[], syncLog: unknown = null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: syncLog, error: null });
  const range = jest.fn().mockResolvedValue({ data: events, error: null });
  const pageQuery = { range, lte: jest.fn(), order: jest.fn() };
  pageQuery.lte.mockReturnValue(pageQuery);
  pageQuery.order.mockReturnValue(pageQuery);
  const rawData = jest.fn().mockResolvedValue({
    data: (events as Record<string, unknown>[]).map((event) => ({
      external_id: event.external_id,
      updated_at: event.updated_at ?? null,
      raw_data: event.raw_data ?? null,
    })),
    error: null,
  });
  const eq = jest.fn().mockImplementation(() => ({
    maybeSingle,
    gte: jest.fn().mockReturnValue(pageQuery),
    in: rawData,
  }));
  const select = jest.fn().mockReturnValue({ eq });
  return {
    from: jest.fn().mockReturnValue({
      select,
      upsert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: null, error: null }) }),
    }),
  };
}

describe('PR #1013 review fixes', () => {
  let createService: typeof createCacheInvalidationQueueService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import('@/lib/events/cacheInvalidationQueue');
    createService = mod.createCacheInvalidationQueueService;
  });

  describe('idle draining', () => {
    it('zero-event sync still drains pending retries', async () => {
      const pendingRow = makeQueueRow({ expires_at: '2099-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([pendingRow]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const staging = makeSyncStaging([]);
      const prod = { from: jest.fn() };

      const result = await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets: () => [],
      });

      expect(result.synced).toBe(0);
      expect(result.queueProcessed).toBe(1);
      expect(result.queueResolved).toBe(1);
      expect(invalidate).toHaveBeenCalled();
      expect(store.rows[0].status).toBe('resolved');
    });

    it('zero-event sync still reconciles due dead letters', async () => {
      const deadRow = makeQueueRow({
        status: 'dead_letter',
        next_reconciliation_at: '2026-08-07T00:00:00Z',
      });
      const { client, store } = createFakeStaging([deadRow]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const staging = makeSyncStaging([]);
      const prod = { from: jest.fn() };

      const result = await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets: () => [],
      });

      expect(result.reconciled).toBe(1);
      expect(result.reconciledResolved).toBe(1);
      expect(store.rows[0].status).toBe('resolved');
    });

    it('zero-event sync does not advance cursor merely because scan was empty', async () => {
      const { client } = createFakeStaging();
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const staging = makeSyncStaging([]);
      const prod = { from: jest.fn() };

      const result = await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets: () => [],
      });

      expect(result.errors).toBe(0);
      expect(result.lastSyncedAt).toBe('1970-01-01T00:00:00.000Z');
    });
  });

  describe('production-only replay identities', () => {
    it('replay target never contains staging event ID', async () => {
      const stagingEvent = {
        id: 'staging-uuid-123',
        external_id: 'ext-1',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Friday',
        event_start_date: '2026-08-07',
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const productionRow = {
        id: 'prod-uuid-456',
        external_id: 'ext-1',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Friday',
        event_start_date: '2026-08-07',
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const { client, store } = createFakeStaging();
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const buildCacheTargets = jest.fn().mockImplementation(
        (changes: { before: unknown; after: unknown }[]) => {
          const targets: EventCacheTarget[] = [];
          for (const change of changes) {
            const event = change.after as Record<string, unknown>;
            targets.push({
              eventId: event['id'] as string,
              city: event['city'] as string,
              state: event['state'] as string,
              citySlug: 'savannah-ga',
              eventSlug: 'food-truck-friday-2026-08-07',
            });
          }
          return targets;
        },
      );

      const staging = makeSyncStaging([stagingEvent]);
      const prod = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [productionRow], error: null }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [productionRow], error: null }),
          }),
        }),
      };

      await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets,
      });

      const enqueued = store.rows[0];
      expect(enqueued.target_payload.eventId).toBe('prod-uuid-456');
      expect(enqueued.target_payload.eventId).not.toBe('staging-uuid-123');
      expect(enqueued.source_event_id).toBe('prod-uuid-456');
    });

    it('missing production identity does not fall back to staging', async () => {
      const stagingEvent = {
        id: 'staging-uuid-123',
        external_id: 'ext-1',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Friday',
        event_start_date: '2026-08-07',
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const { client, store } = createFakeStaging();
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const buildCacheTargets = jest.fn().mockImplementation(
        (changes: { before: unknown; after: unknown }[]) => {
          const targets: EventCacheTarget[] = [];
          for (const change of changes) {
            const event = change.after as Record<string, unknown>;
            targets.push({
              eventId: event['id'] as string,
              city: event['city'] as string,
              state: event['state'] as string,
              citySlug: 'savannah-ga',
              eventSlug: 'food-truck-friday-2026-08-07',
            });
          }
          return targets;
        },
      );

      const staging = makeSyncStaging([stagingEvent]);
      const prod = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };

      await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets,
      });

      expect(store.rows).toHaveLength(0);
      expect(invalidate).not.toHaveBeenCalled();
    });

    it('unchanged rows in a mixed batch keep their production identity', async () => {
      const changedStaging = {
        id: 'staging-changed',
        external_id: 'ext-changed',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Friday (updated)',
        event_start_date: '2026-08-07',
        content_hash: 'a'.repeat(64),
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const unchangedStaging = {
        id: 'staging-unchanged',
        external_id: 'ext-unchanged',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Saturday',
        event_start_date: '2026-08-08',
        content_hash: 'b'.repeat(64),
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const changedExisting = {
        id: 'prod-changed',
        external_id: 'ext-changed',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Friday',
        event_start_date: '2026-08-07',
        content_hash: 'a'.repeat(64),
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const unchangedExisting = {
        id: 'prod-unchanged',
        external_id: 'ext-unchanged',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Saturday',
        event_start_date: '2026-08-08',
        content_hash: 'b'.repeat(64),
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const { client, store } = createFakeStaging();
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const buildCacheTargets = jest.fn().mockImplementation(
        (changes: { before: unknown; after: unknown }[]) => {
          const targets: EventCacheTarget[] = [];
          for (const change of changes) {
            const event = change.after as Record<string, unknown>;
            targets.push({
              eventId: event['id'] as string,
              city: event['city'] as string,
              state: event['state'] as string,
              citySlug: 'savannah-ga',
              eventSlug: 'food-truck-friday-2026-08-07',
            });
          }
          return targets;
        },
      );

      const staging = makeSyncStaging([changedStaging, unchangedStaging]);
      const prod = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [changedExisting, unchangedExisting], error: null }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ ...changedExisting, title: 'Food Truck Friday (updated)' }],
              error: null,
            }),
          }),
        }),
      };

      await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets,
      });

      const enqueuedIds = store.rows.map((r) => (r.target_payload as { eventId: string }).eventId);
      expect(enqueuedIds).toContain('prod-changed');
      expect(enqueuedIds).toContain('prod-unchanged');
      expect(enqueuedIds).not.toContain('staging-changed');
      expect(enqueuedIds).not.toContain('staging-unchanged');
    });
  });

  describe('cursor safety', () => {
    it('pending-processing error blocks cursor advancement', async () => {
      const pendingRow = makeQueueRow({ expires_at: '2099-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([pendingRow]);
      store.updateError = { message: 'claim failed' };
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const staging = makeSyncStaging([]);
      const prod = { from: jest.fn() };

      const result = await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets: () => [],
      });

      expect(result.queuePersistenceError).toBe(true);
      expect(result.errors).toBe(1);
    });

    it('reconciliation error blocks cursor advancement', async () => {
      const deadRow = makeQueueRow({
        status: 'dead_letter',
        next_reconciliation_at: '2026-08-07T00:00:00Z',
      });
      const { client, store } = createFakeStaging([deadRow]);
      store.updateError = { message: 'reconcile claim failed' };
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const staging = makeSyncStaging([]);
      const prod = { from: jest.fn() };

      const result = await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets: () => [],
      });

      expect(result.queuePersistenceError).toBe(true);
      expect(result.errors).toBe(1);
    });

    it('queue persistence error blocks cursor advancement', async () => {
      const { client, store } = createFakeStaging();
      store.insertError = { code: '500', message: 'insert failed' };
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const event = {
        id: 'staging-1',
        external_id: 'ext-1',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Friday',
        event_start_date: '2026-08-07',
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const staging = makeSyncStaging([event]);
      const prod = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [{ id: 'prod-1', external_id: 'ext-1' }], error: null }),
          }),
        }),
      };

      const result = await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets: () => [
          { eventId: 'prod-1', city: 'Savannah', state: 'GA', citySlug: 'savannah-ga', eventSlug: 'food-truck-friday-2026-08-07' },
        ],
      });

      expect(result.queuePersistenceError).toBe(true);
      expect(result.errors).toBeGreaterThan(0);
    });

    it('rolls back the production upsert when queue persistence fails', async () => {
      const { client, store } = createFakeStaging();
      store.insertError = { code: '500', message: 'insert failed' };
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const event = {
        id: 'staging-1',
        external_id: 'ext-1',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Friday (updated)',
        event_start_date: '2026-08-07',
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const existingRow = {
        id: 'prod-1',
        external_id: 'ext-1',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Friday',
        event_start_date: '2026-08-07',
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const upsertCalls: unknown[][] = [];
      const staging = makeSyncStaging([event]);
      const prod = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [existingRow], error: null }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          upsert: jest.fn().mockImplementation((rows: unknown[]) => {
            upsertCalls.push(rows);
            return {
              select: jest.fn().mockResolvedValue({
                data: [{ ...existingRow, title: 'Food Truck Friday (updated)' }],
                error: null,
              }),
            };
          }),
        }),
      };

      const result = await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets: () => [
          { eventId: 'prod-1', city: 'Savannah', state: 'GA', citySlug: 'savannah-ga', eventSlug: 'food-truck-friday-2026-08-07' },
        ],
      });

      expect(result.queuePersistenceError).toBe(true);
      expect(upsertCalls).toHaveLength(2);
      const rollbackRows = upsertCalls[1] as Record<string, unknown>[];
      expect(rollbackRows[0]['title']).toBe('Food Truck Friday');
    });

    it('missing invalidator cannot report false success', async () => {
      const { client } = createFakeStaging();
      const service = createService(client as never);
      const staging = makeSyncStaging([]);
      const prod = { from: jest.fn() };

      const result = await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
      });

      expect(result.queuePersistenceError).toBe(true);
      expect(result.errors).toBe(1);
    });
  });

  describe('resolution error propagation', () => {
    it('eager markResolved failure blocks cursor advancement', async () => {
      const event = {
        id: 'staging-1',
        external_id: 'ext-1',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Friday',
        event_start_date: '2026-08-07',
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const { client, store } = createFakeStaging();
      store.markResolvedError = { message: 'mark resolved failed' };
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const staging = makeSyncStaging([event]);
      const prod = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ id: 'prod-1', external_id: 'ext-1' }],
              error: null,
            }),
          }),
        }),
      };

      const result = await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets: () => [
          {
            eventId: 'prod-1',
            city: 'Savannah',
            state: 'GA',
            citySlug: 'savannah-ga',
            eventSlug: 'food-truck-friday-2026-08-07',
          },
        ],
      });

      expect(result.queuePersistenceError).toBe(true);
      expect(result.lastSyncedAt).toBe('1970-01-01T00:00:00.000Z');
      expect(invalidate).toHaveBeenCalled();
    });

    it('replay markResolved failure blocks cursor advancement', async () => {
      const event = {
        id: 'event-1',
        external_id: 'ext-1',
        source: 'test_source',
        city: 'Savannah',
        state: 'GA',
        title: 'Food Truck Friday',
        event_start_date: '2026-08-07',
        content_hash: 'a'.repeat(64),
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const existing = { ...event, id: 'prod-1' };
      const { client, store } = createFakeStaging();
      store.markResolvedError = { message: 'mark resolved failed' };
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const buildCacheTargets = jest.fn().mockReturnValue([
        {
          eventId: 'prod-1',
          city: 'Savannah',
          state: 'GA',
          citySlug: 'savannah-ga',
          eventSlug: 'food-truck-friday-2026-08-07',
        },
      ]);
      const staging = makeSyncStaging([event]);
      const prod = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [existing], error: null }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [existing], error: null }),
          }),
        }),
      };

      const result = await syncExternalEventsToProd(staging as never, prod as never, {
        source: 'test_source',
        dryRun: false,
        queueService: service,
        onInvalidate: invalidate,
        buildCacheTargets,
      });

      expect(result.queuePersistenceError).toBe(true);
      expect(result.lastSyncedAt).toBe('1970-01-01T00:00:00.000Z');
      expect(invalidate).toHaveBeenCalled();
    });
  });

  describe('concurrent queue claims', () => {
    it('two workers race for the same pending row and exactly one claims it', async () => {
      const row = makeQueueRow({ expires_at: '2099-12-31T00:00:00Z' });
      const { client, store } = createFakeStaging([row]);
      const serviceA = createService(client as never);
      const serviceB = createService(client as never);
      const invalidateA = jest.fn().mockResolvedValue(undefined);
      const invalidateB = jest.fn().mockResolvedValue(undefined);

      const [resultA, resultB] = await Promise.all([
        serviceA.processPending(invalidateA),
        serviceB.processPending(invalidateB),
      ]);

      const totalResolved = resultA.resolved + resultB.resolved;
      expect(totalResolved).toBe(1);
      expect(invalidateA.mock.calls.length + invalidateB.mock.calls.length).toBe(1);
    });

    it('losing worker performs no invalidation', async () => {
      const row = makeQueueRow({ expires_at: '2099-12-31T00:00:00Z' });
      const { client } = createFakeStaging([row]);
      const serviceA = createService(client as never);
      const serviceB = createService(client as never);
      const invalidateA = jest.fn().mockResolvedValue(undefined);
      const invalidateB = jest.fn().mockResolvedValue(undefined);

      await Promise.all([
        serviceA.processPending(invalidateA),
        serviceB.processPending(invalidateB),
      ]);

      const totalCalls = invalidateA.mock.calls.length + invalidateB.mock.calls.length;
      expect(totalCalls).toBe(1);
    });

    it('stale worker cannot resolve after lease ownership changes', async () => {
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

    it('expired lease can be recovered', async () => {
      const expiredLease = new Date(Date.now() - QUEUE_LEASE_MS - 1000).toISOString();
      const row = makeQueueRow({
        expires_at: '2099-12-31T00:00:00Z',
        next_attempt_at: expiredLease,
      });
      const { client, store } = createFakeStaging([row]);
      const service = createService(client as never);
      const invalidate = jest.fn().mockResolvedValue(undefined);
      const result = await service.processPending(invalidate);
      expect(result.resolved).toBe(1);
      expect(store.rows[0].status).toBe('resolved');
    });

    it('timestamp precision is preserved in claim predicates', async () => {
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
  });
});
