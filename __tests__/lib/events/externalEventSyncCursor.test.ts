import { describe, expect, it } from '@jest/globals';
import { getLatestSyncCursor, syncExternalEventsToProd } from '@/lib/events/externalEventSync';

interface QueryResult {
  readonly data: unknown;
  readonly error: { message: string } | null;
}

class FakeQuery {
  readonly filters: string[] = [];
  readonly orderings: string[] = [];
  readonly ranges: Array<[number, number]> = [];
  readonly upserts: unknown[] = [];
  private pageIndex = 0;

  constructor(
    private readonly result: QueryResult,
    private readonly singleData: unknown = null,
    private readonly pages: readonly QueryResult[] = [],
    private readonly inResult: QueryResult = { data: [], error: null },
  ) {}

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push(`eq:${column}=${String(value)}`);
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push(`gt:${column}=${String(value)}`);
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push(`gte:${column}=${String(value)}`);
    return this;
  }

  or(filter: string): this {
    this.filters.push(`or:${filter}`);
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push(`lte:${column}=${String(value)}`);
    return this;
  }

  order(column: string, options: { ascending: boolean }): this {
    this.orderings.push(`${column}:${options.ascending ? 'asc' : 'desc'}`);
    return this;
  }

  range(start: number, end: number): Promise<QueryResult> {
    this.ranges.push([start, end]);
    const page = this.pages[this.pageIndex];
    this.pageIndex++;
    return Promise.resolve(page ?? this.result);
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve({ data: this.singleData, error: this.result.error });
  }

  in(_column: string, _values: readonly unknown[]): Promise<QueryResult> {
    return Promise.resolve(this.inResult);
  }

  upsert(value: unknown): { select: () => Promise<QueryResult> } {
    this.upserts.push(value);
    return {
      select: () => Promise.resolve({ data: null, error: this.result.error }),
    };
  }
}

class FakeClient {
  constructor(private readonly queries: ReadonlyMap<string, FakeQuery>) {}

  from(table: string): FakeQuery {
    const query = this.queries.get(table);
    if (!query) throw new Error(`Unexpected table: ${table}`);
    return query;
  }
}

describe('external event sync cursor', () => {
  it('uses a fixed high-water bound and deterministic event ordering', async () => {
    const syncLog = new FakeQuery({ data: [], error: null });
    const events = new FakeQuery({ data: [], error: null });
    const staging = new FakeClient(
      new Map([
        ['external_events_sync_log', syncLog],
        ['external_events', events],
      ]),
    );
    const production = new FakeClient(new Map());
    const startedAt = Date.now();

    const result = await syncExternalEventsToProd(staging as never, production as never, {
      source: 'test_source',
      dryRun: false,
    });

    const finishedAt = Date.now();
    expect(result.errors).toBe(0);
    expect(events.filters.some((filter) => filter.startsWith('lte:updated_at='))).toBe(true);
    expect(events.orderings).toEqual(['updated_at:asc', 'id:asc']);
    expect(syncLog.upserts).toHaveLength(0);
    expect(new Date(result.lastSyncedAt).getTime()).toBeLessThan(startedAt);
    expect(new Date(result.lastSyncedAt).getTime()).toBeLessThanOrEqual(finishedAt);
  });

  it('does not advance the cursor when the bounded event read fails', async () => {
    const syncLog = new FakeQuery(
      { data: [], error: null },
      { last_synced_at: '2026-08-01T00:00:00.000Z' },
    );
    const events = new FakeQuery({ data: null, error: { message: 'read failed' } });
    const staging = new FakeClient(
      new Map([
        ['external_events_sync_log', syncLog],
        ['external_events', events],
      ]),
    );

    const result = await syncExternalEventsToProd(
      staging as never,
      new FakeClient(new Map()) as never,
      {
        source: 'test_source',
        dryRun: false,
      },
    );

    expect(result.errors).toBeGreaterThan(0);
    expect(syncLog.upserts).toHaveLength(0);
  });

  it('does not advance the cursor for an empty page', async () => {
    const storedCursor = { last_synced_at: '2026-08-01T00:10:00.000Z' };
    const syncLog = new FakeQuery({ data: [], error: null }, storedCursor);
    const events = new FakeQuery({ data: [], error: null });
    const staging = new FakeClient(
      new Map([
        ['external_events_sync_log', syncLog],
        ['external_events', events],
      ]),
    );

    const result = await syncExternalEventsToProd(
      staging as never,
      new FakeClient(new Map()) as never,
      {
        source: 'test_source',
        dryRun: false,
      },
    );

    expect(result.lastSyncedAt).toBe(storedCursor.last_synced_at);
    expect(syncLog.upserts).toHaveLength(0);
  });

  it('advances to the final tuple from a successful incomplete page', async () => {
    const finalEvent = {
      id: '00000000-0000-0000-0000-000000000007',
      external_id: 'event-7',
      source: 'test_source',
      updated_at: '2026-08-01T00:11:00.123456Z',
    };
    const syncLog = new FakeQuery({ data: [], error: null });
    const events = new FakeQuery(
      { data: [], error: null },
      null,
      [{ data: [finalEvent], error: null }],
      { data: [{ ...finalEvent, raw_data: null }], error: null },
    );
    const staging = new FakeClient(
      new Map([
        ['external_events_sync_log', syncLog],
        ['external_events', events],
      ]),
    );

    const production = new FakeClient(
      new Map([['external_events', new FakeQuery({ data: [], error: null })]]),
    );
    const result = await syncExternalEventsToProd(staging as never, production as never, {
      source: 'test_source',
      dryRun: false,
    });

    expect(result.lastSyncedAt).toBe(finalEvent.updated_at);
  });

  it('does not advance the cursor when a page row is missing a tuple value', async () => {
    const syncLog = new FakeQuery({ data: [], error: null });
    const events = new FakeQuery({ data: [], error: null }, null, [
      { data: [{ id: 'event-1', updated_at: null }], error: null },
    ]);
    const staging = new FakeClient(
      new Map([
        ['external_events_sync_log', syncLog],
        ['external_events', events],
      ]),
    );

    const result = await syncExternalEventsToProd(
      staging as never,
      new FakeClient(new Map()) as never,
      {
        source: 'test_source',
        dryRun: false,
      },
    );

    expect(result.errors).toBeGreaterThan(0);
    expect(syncLog.upserts).toHaveLength(0);
  });

  it('overlaps the stored cursor window to include late commits', async () => {
    const syncLog = new FakeQuery(
      { data: [], error: null },
      {
        last_synced_at: '2026-08-01T00:10:00.000Z',
        last_synced_event_id: '00000000-0000-0000-0000-000000000001',
      },
    );
    const events = new FakeQuery({ data: [], error: null });
    const staging = new FakeClient(
      new Map([
        ['external_events_sync_log', syncLog],
        ['external_events', events],
      ]),
    );

    await syncExternalEventsToProd(staging as never, new FakeClient(new Map()) as never, {
      source: 'test_source',
      dryRun: false,
    });

    expect(events.filters).toContain('gte:updated_at=2026-08-01T00:05:00.000Z');
    expect(events.filters.some((filter) => filter.startsWith('or:'))).toBe(false);
  });

  it('does not move the stored cursor backwards for overlap-only rows', async () => {
    const storedCursor = {
      last_synced_at: '2026-08-01T00:10:00.000Z',
      last_synced_event_id: '00000000-0000-0000-0000-000000000002',
    };
    const olderEvent = {
      id: '00000000-0000-0000-0000-000000000001',
      external_id: 'event-1',
      source: 'test_source',
      updated_at: '2026-08-01T00:09:00.000Z',
    };
    const syncLog = new FakeQuery({ data: [], error: null }, storedCursor);
    const events = new FakeQuery({ data: [], error: null }, null, [
      { data: [olderEvent], error: null },
    ]);
    const staging = new FakeClient(
      new Map([
        ['external_events_sync_log', syncLog],
        ['external_events', events],
      ]),
    );

    const result = await syncExternalEventsToProd(
      staging as never,
      new FakeClient(new Map()) as never,
      {
        source: 'test_source',
        dryRun: true,
      },
    );

    expect(result.errors).toBe(0);
    expect(syncLog.upserts).toHaveLength(0);
  });

  it('orders microsecond timestamps before using the event ID tie-breaker', () => {
    const storedCursor = {
      updatedAt: '2026-08-01T00:10:00.123456Z',
      id: '00000000-0000-0000-0000-000000000002',
    };
    const observedCursor = {
      updatedAt: '2026-08-01T00:10:00.123789Z',
      id: '00000000-0000-0000-0000-000000000001',
    };

    expect(getLatestSyncCursor(storedCursor, observedCursor)).toEqual(observedCursor);
  });

  it('uses a keyset cursor instead of moving offset pages', async () => {
    const syncLog = new FakeQuery({ data: [], error: null });
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `event-${String(index).padStart(4, '0')}`,
      updated_at: '2026-08-01T00:00:00.000Z',
    }));
    const events = new FakeQuery({ data: [], error: null }, null, [
      { data: firstPage, error: null },
      { data: [{ id: 'event-0500', updated_at: '2026-08-01T00:01:00.000Z' }], error: null },
    ]);
    const staging = new FakeClient(
      new Map([
        ['external_events_sync_log', syncLog],
        ['external_events', events],
      ]),
    );

    const result = await syncExternalEventsToProd(
      staging as never,
      new FakeClient(new Map()) as never,
      {
        source: 'test_source',
        dryRun: true,
      },
    );

    expect(result.synced).toBe(501);
    expect(events.ranges).toEqual([
      [0, 499],
      [0, 499],
    ]);
    expect(events.filters.some((filter) => filter.startsWith('or:'))).toBe(true);
  });
});
