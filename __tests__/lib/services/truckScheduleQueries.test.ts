/**
 * @jest-environment node
 */

import { describe, expect, it } from '@jest/globals';
import {
  TRUCK_ID_QUERY_CHUNK_SIZE,
  fetchInTruckIdChunks,
  fetchRecurrenceOccurrences,
  fetchSchedulesViaApi,
  fetchOverridesInRange,
  type ScheduleQueryBuilder,
  type ScheduleQueryClient,
  type ScheduleQueryError,
  type TruckIdChunkQuery,
} from '@/lib/services/truckScheduleQueries';
import {
  RECURRENCE_API_BATCH_LIMIT,
  expandPublicScheduleRecurrences,
} from '@/lib/services/publicScheduleRecurrence';
import { publicScheduleRecurrencesRequestSchema } from '@/lib/services/publicScheduleRecurrenceRequest';

const makeIds = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `truck-${String(index).padStart(3, '0')}`);

const makeUuid = (index: number): string =>
  `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

const makeUuidIds = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => makeUuid(i));

interface RecordedQuery {
  table: string;
  filters: Array<{ op: string; column: string; value: unknown }>;
  orders: Array<{ column: string; ascending: boolean }>;
}

/** A builder that records the exact wire-shape before resolving rows. */
function recordingClient(
  record: RecordedQuery[],
  rowsFor: (query: RecordedQuery) => unknown[],
  failWhen?: (query: RecordedQuery) => ScheduleQueryError | null,
): ScheduleQueryClient {
  return {
    from(table: string): ScheduleQueryBuilder {
      const query: RecordedQuery = { table, filters: [], orders: [] };
      record.push(query);
      const builder: ScheduleQueryBuilder = {
        select() {
          return builder;
        },
        in(column, values) {
          query.filters.push({ op: 'in', column, value: [...values] });
          return builder;
        },
        gte(column, value) {
          query.filters.push({ op: 'gte', column, value });
          return builder;
        },
        lte(column, value) {
          query.filters.push({ op: 'lte', column, value });
          return builder;
        },
        order(column, options) {
          query.orders.push({ column, ascending: options?.ascending ?? true });
          return builder;
        },
        then(onfulfilled, onrejected) {
          const error = failWhen?.(query) ?? null;
          const result = { data: error ? null : rowsFor(query), error };
          return Promise.resolve(result).then(onfulfilled, onrejected);
        },
      };
      return builder;
    },
  };
}

function overrideRow(foodTruckId: string, serviceDate: string): Record<string, unknown> {
  return {
    food_truck_id: foodTruckId,
    service_date: serviceDate,
    is_closed: false,
    is_all_day: false,
    start_time: '09:00:00',
    end_time: '17:00:00',
    ends_next_day: false,
    timezone: 'America/New_York',
    location_data: null,
  };
}

function recurrenceRow(
  foodTruckId: string,
  seriesId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: seriesId,
    food_truck_id: foodTruckId,
    frequency: 'daily',
    monthly_mode: null,
    start_date: '2026-09-16',
    occurrences: null,
    start_time: '09:00:00',
    end_time: '17:00:00',
    ends_next_day: false,
    location_data: null,
    ...overrides,
  };
}

function chunkedTruckIds(query: RecordedQuery): string[] {
  const filter = query.filters.find((entry) => entry.column === 'food_truck_id');
  return (filter?.value as string[]) ?? [];
}

describe('TRUCK_ID_QUERY_CHUNK_SIZE', () => {
  it('keeps the serialized id filter far below the 16 KiB response-header ceiling', () => {
    // 449 UUIDs contribute ~16,613 chars; the full request URL measured 17,812
    // once select fields, filters, and ordering were included.
    const uuidChars = 36;
    const unchunkedIdChars = 449 * (uuidChars + 1);
    const chunkedIdChars = TRUCK_ID_QUERY_CHUNK_SIZE * (uuidChars + 1);

    expect(TRUCK_ID_QUERY_CHUNK_SIZE).toBe(100);
    expect(unchunkedIdChars).toBeGreaterThan(16_384);
    expect(chunkedIdChars).toBeLessThan(8_192);
  });
});

describe('fetchInTruckIdChunks', () => {
  it('divides 449 ids into five queries that never exceed the shared chunk size', async () => {
    const ids = makeIds(449);
    const chunks: string[][] = [];

    await fetchInTruckIdChunks(ids, (chunk) => {
      chunks.push([...chunk]);
      return Promise.resolve([]);
    });

    expect(chunks).toHaveLength(5);
    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 100, 100, 100, 49]);
    expect(chunks.every((chunk) => chunk.length <= TRUCK_ID_QUERY_CHUNK_SIZE)).toBe(true);
  });

  it('merges every chunk result in chunk order', async () => {
    const ids = makeIds(250);

    const merged = await fetchInTruckIdChunks(ids, (chunk) =>
      Promise.resolve(chunk.map((id) => ({ id }))),
    );

    expect(merged.map((row) => row.id)).toEqual(ids);
  });

  it('deduplicates ids before querying so repeated ids never repeat query values', async () => {
    const chunks: string[][] = [];

    const merged = await fetchInTruckIdChunks(['a', 'b', 'a', 'c', 'b'], (chunk) => {
      chunks.push([...chunk]);
      return Promise.resolve(chunk);
    });

    expect(chunks).toEqual([['a', 'b', 'c']]);
    expect(merged).toEqual(['a', 'b', 'c']);
  });

  it('rejects as a whole when any chunk fails instead of returning partial rows', async () => {
    const queryChunk: TruckIdChunkQuery<string> = (chunk) =>
      chunk[0] === 'truck-400'
        ? Promise.reject(new Error('final chunk failed'))
        : Promise.resolve(chunk);

    await expect(fetchInTruckIdChunks(makeIds(449), queryChunk)).rejects.toThrow(
      'final chunk failed',
    );
  });

  it('returns no rows for empty input without querying', async () => {
    const chunks: string[][] = [];

    const merged = await fetchInTruckIdChunks([], (chunk) => {
      chunks.push([...chunk]);
      return Promise.resolve(chunk);
    });

    expect(merged).toEqual([]);
    expect(chunks).toEqual([]);
  });
});

describe('fetchOverridesInRange', () => {
  it('chunks the truck ids and merges the rows from every chunk', async () => {
    const ids = makeIds(449);
    const record: RecordedQuery[] = [];

    const rows = await fetchOverridesInRange(
      recordingClient(record, (query) =>
        chunkedTruckIds(query).map((id) => overrideRow(id, '2026-09-18')),
      ),
      ids,
      '2026-09-16',
      '2026-09-22',
    );

    expect(record).toHaveLength(5);
    expect(record.map((query) => chunkedTruckIds(query).length)).toEqual([100, 100, 100, 100, 49]);
    expect(record.every((query) => query.table === 'food_truck_schedule_overrides')).toBe(true);
    expect(rows).toHaveLength(449);
    expect(rows.at(-1)).toMatchObject({ food_truck_id: 'truck-448', service_date: '2026-09-18' });
    const ops = record[0]?.filters.map((entry) => entry.op);
    expect(ops).toContain('gte');
    expect(ops).toContain('lte');
  });

  it('propagates a chunk failure instead of returning the chunks that succeeded', async () => {
    const record: RecordedQuery[] = [];

    await expect(
      fetchOverridesInRange(
        recordingClient(
          record,
          (query) => chunkedTruckIds(query).map((id) => overrideRow(id, '2026-09-18')),
          (query) =>
            chunkedTruckIds(query)[0] === 'truck-200'
              ? { message: 'upcoming override query failed' }
              : null,
        ),
        makeIds(300),
        '2026-09-16',
        '2026-09-22',
      ),
    ).rejects.toThrow('upcoming override query failed');
  });
});

describe('fetchRecurrenceOccurrences', () => {
  it('chunks the truck ids and expands occurrences from every chunk', async () => {
    const ids = makeIds(449);
    const record: RecordedQuery[] = [];

    const occurrences = await fetchRecurrenceOccurrences(
      recordingClient(record, (query) =>
        chunkedTruckIds(query).map((id) => recurrenceRow(id, `series-${id}`)),
      ),
      ids,
      '2026-09-16',
      '2026-09-16',
    );

    expect(record).toHaveLength(5);
    expect(record.map((query) => chunkedTruckIds(query).length)).toEqual([100, 100, 100, 100, 49]);
    expect(record.every((query) => query.table === 'food_truck_recurrences')).toBe(true);
    expect(Object.keys(occurrences)).toHaveLength(449);
  });

  it('preserves the deterministic three-key row ordering per chunk', async () => {
    const record: RecordedQuery[] = [];

    await fetchRecurrenceOccurrences(
      recordingClient(record, (query) =>
        chunkedTruckIds(query).map((id) => recurrenceRow(id, `series-${id}`)),
      ),
      ['truck-1'],
      '2026-09-16',
      '2026-09-16',
    );

    expect(record[0]?.orders).toEqual([
      { column: 'start_date', ascending: true },
      { column: 'created_at', ascending: true },
      { column: 'id', ascending: true },
    ]);
  });

  it('keeps per-truck series ordering so the newest deterministic series wins', async () => {
    const occurrences = await fetchRecurrenceOccurrences(
      recordingClient([], () => [
        recurrenceRow('truck-1', 'series-old'),
        recurrenceRow('truck-1', 'series-new', { start_time: '12:00:00', end_time: '20:00:00' }),
      ]),
      ['truck-1'],
      '2026-09-16',
      '2026-09-16',
    );

    expect(occurrences['truck-1:2026-09-16']).toMatchObject({
      start_time: '12:00:00',
      end_time: '20:00:00',
    });
  });

  it('propagates a chunk failure instead of returning partial occurrences', async () => {
    const record: RecordedQuery[] = [];

    await expect(
      fetchRecurrenceOccurrences(
        recordingClient(
          record,
          (query) => chunkedTruckIds(query).map((id) => recurrenceRow(id, `series-${id}`)),
          (query) =>
            chunkedTruckIds(query)[0] === 'truck-200'
              ? { message: 'recurrence query failed' }
              : null,
        ),
        makeIds(300),
        '2026-09-16',
        '2026-09-16',
      ),
    ).rejects.toThrow('recurrence query failed');
  });

  it('still degrades to no recurrences when the table itself is missing', async () => {
    const occurrences = await fetchRecurrenceOccurrences(
      recordingClient(
        [],
        () => [],
        () => ({
          message: "Could not find the table 'public.food_truck_recurrences' in the schema cache",
          code: 'PGRST205',
        }),
      ),
      makeIds(150),
      '2026-09-16',
      '2026-09-16',
    );

    expect(occurrences).toEqual({});
  });
});

describe('shared chunking across schedule query paths', () => {
  it('applies the same chunk boundaries to both paths', async () => {
    const ids = makeIds(449);
    const upcoming: RecordedQuery[] = [];
    const recurrence: RecordedQuery[] = [];

    await fetchOverridesInRange(
      recordingClient(upcoming, () => []),
      ids,
      '2026-09-16',
      '2026-09-22',
    );
    await fetchRecurrenceOccurrences(
      recordingClient(recurrence, () => []),
      ids,
      '2026-09-16',
      '2026-09-16',
    );

    const boundaries = (record: RecordedQuery[]) =>
      record.map((query) => chunkedTruckIds(query).length);
    expect(boundaries(upcoming)).toEqual([100, 100, 100, 100, 49]);
    expect(boundaries(recurrence)).toEqual([100, 100, 100, 100, 49]);
  });
});

describe('RECURRENCE_API_BATCH_LIMIT shared contract', () => {
  const validBody = (truckIds: string[]) => ({
    truckIds,
    fromDate: '2026-09-16',
    toDate: '2026-09-16',
  });

  it('is the single exported limit the route schema validates against', () => {
    expect(
      publicScheduleRecurrencesRequestSchema.safeParse(
        validBody(makeUuidIds(RECURRENCE_API_BATCH_LIMIT)),
      ).success,
    ).toBe(true);
    expect(
      publicScheduleRecurrencesRequestSchema.safeParse(
        validBody(makeUuidIds(RECURRENCE_API_BATCH_LIMIT + 1)),
      ).success,
    ).toBe(false);
  });

  it('lets one full 449-truck list through the route contract as a single POST', async () => {
    const ids = makeUuidIds(449);
    expect(publicScheduleRecurrencesRequestSchema.safeParse(validBody(ids)).success).toBe(true);

    const apiRequests: string[][] = [];
    await fetchSchedulesViaApi(
      async ({ truckIds }) => {
        apiRequests.push([...truckIds]);
        return { recurrences: {} };
      },
      ids,
      '2026-09-16',
      '2026-09-16',
    );
    expect(apiRequests).toHaveLength(1);
  });
});

describe('fetchSchedulesViaApi', () => {
  // Mirrors the route: validate each batch with the real schema, then fan out
  // into 100-id reads.
  function apiRoute() {
    const apiRequests: Array<readonly string[]> = [];
    const dbQueries: RecordedQuery[] = [];
    const fetchPage = async (request: {
      truckIds: readonly string[];
      fromDate: string;
      toDate: string;
    }) => {
      const parsed = publicScheduleRecurrencesRequestSchema.safeParse(request);
      if (!parsed.success) {
        throw new Error(`route rejected the client batch: ${parsed.error.message}`);
      }
      apiRequests.push([...request.truckIds]);
      const recurrences = await fetchRecurrenceOccurrences(
        recordingClient(dbQueries, (query) =>
          chunkedTruckIds(query).map((id) => recurrenceRow(id, `series-${id}`)),
        ),
        request.truckIds,
        request.fromDate,
        request.toDate,
      );
      return { recurrences };
    };
    return { apiRequests, dbQueries, fetchPage };
  }

  it('issues exactly one API POST for 449 ids, which fans out into five DB queries', async () => {
    const ids = makeUuidIds(449);
    const route = apiRoute();

    const { recurrences: occurrences } = await fetchSchedulesViaApi(
      route.fetchPage,
      ids,
      '2026-09-16',
      '2026-09-16',
    );

    expect(route.apiRequests).toHaveLength(1);
    expect(route.apiRequests[0]).toHaveLength(449);
    const dbBoundaries = route.dbQueries.map((query) => chunkedTruckIds(query).length);
    expect(dbBoundaries).toEqual([100, 100, 100, 100, 49]);
    expect(dbBoundaries.every((size) => size <= TRUCK_ID_QUERY_CHUNK_SIZE)).toBe(true);
    expect(Object.keys(occurrences)).toHaveLength(449);
  });

  it('splits inputs above 500 into API requests of at most 500 ids', async () => {
    const ids = makeUuidIds(1001);
    const route = apiRoute();

    await fetchSchedulesViaApi(route.fetchPage, ids, '2026-09-16', '2026-09-16');

    expect(route.apiRequests.map((page) => page.length)).toEqual([500, 500, 1]);
    expect(route.apiRequests.every((page) => page.length <= RECURRENCE_API_BATCH_LIMIT)).toBe(true);
  });

  it('merges recurrences from every API page', async () => {
    const ids = makeUuidIds(600);

    const { recurrences: occurrences } = await fetchSchedulesViaApi(
      async ({ truckIds: chunk, fromDate, toDate }) => ({
        recurrences: expandPublicScheduleRecurrences(
          chunk.map((id) => recurrenceRow(id, `series-${id}`) as never),
          fromDate,
          toDate,
        ),
      }),
      ids,
      '2026-09-16',
      '2026-09-16',
    );

    expect(Object.keys(occurrences)).toHaveLength(600);
  });

  it('deduplicates ids across the API batch', async () => {
    const route = apiRoute();
    const [a, b, c] = makeUuidIds(3);

    await fetchSchedulesViaApi(route.fetchPage, [a, b, a, c], '2026-09-16', '2026-09-16');

    expect(route.apiRequests).toEqual([[a, b, c]]);
  });

  it('rejects as a whole when any API page fails instead of returning partial results', async () => {
    const dispatched: Array<readonly string[]> = [];

    await expect(
      fetchSchedulesViaApi(
        async ({ truckIds: page }) => {
          dispatched.push([...page]);
          if (page[0] === 'truck-500') throw new Error('second page failed');
          return { recurrences: {} };
        },
        makeIds(1001),
        '2026-09-16',
        '2026-09-16',
      ),
    ).rejects.toThrow('second page failed');
    // Every page is dispatched in parallel; the batch fails as a unit and the
    // successful pages' recurrences are discarded rather than partially returned.
    expect(dispatched.map((page) => page.length)).toEqual([500, 500, 1]);
  });

  it('forwards the override end date and merges overrides from every API page', async () => {
    const ids = makeUuidIds(600);
    const requested: Array<string | undefined> = [];

    const { overrides } = await fetchSchedulesViaApi(
      async ({ truckIds: chunk, overridesToDate }) => {
        requested.push(overridesToDate);
        return {
          recurrences: {},
          overrides: chunk.map((id) => overrideRow(id, '2026-09-18') as never),
        };
      },
      ids,
      '2026-09-15',
      '2026-09-16',
      '2026-09-22',
    );

    expect(requested).toEqual(['2026-09-22', '2026-09-22']);
    expect(overrides).toHaveLength(600);
  });

  it('returns no recurrences for empty input without calling the API', async () => {
    const route = apiRoute();

    const { recurrences: occurrences } = await fetchSchedulesViaApi(
      route.fetchPage,
      [],
      '2026-09-16',
      '2026-09-16',
    );

    expect(occurrences).toEqual({});
    expect(route.apiRequests).toEqual([]);
  });
});
