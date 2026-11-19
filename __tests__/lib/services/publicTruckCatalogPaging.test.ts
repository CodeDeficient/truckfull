/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

interface FakeCatalogRow {
  readonly id: string;
  readonly current_location?: unknown;
  readonly description?: string;
}

interface RpcCall {
  readonly name: string;
  readonly args: { readonly p_limit: number };
}

interface FakeRpcLog {
  readonly rpcCalls: RpcCall[];
  readonly selectCalls: string[];
  readonly orderCalls: Array<[string, unknown]>;
  readonly rangeCalls: Array<[number, number]>;
  readonly signals: AbortSignal[];
}

interface FakeRangeResult {
  readonly data: FakeCatalogRow[] | null;
  readonly error: unknown;
}

interface FakeRangeBuilder {
  select(columns: string): FakeRangeBuilder;
  order(column: string, options: unknown): FakeRangeBuilder;
  abortSignal(signal: AbortSignal): FakeRangeBuilder;
  range(from: number, to: number): Promise<FakeRangeResult>;
}

const PAGE_ERROR = { message: 'page two exploded' };

let log: FakeRpcLog;
let failingRangeFrom: number | null;
let catalogRows: FakeCatalogRow[];

function resetFakeState(): void {
  log = { rpcCalls: [], selectCalls: [], orderCalls: [], rangeCalls: [], signals: [] };
  failingRangeFrom = null;
  catalogRows = [];
}

function makeCatalogRows(count: number): FakeCatalogRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `truck-${index}`,
    current_location: null,
  }));
}

function fakeRpc(name: string, args: { p_limit: number }): FakeRangeBuilder {
  log.rpcCalls.push({ name, args });
  const available = catalogRows.slice(0, args.p_limit);
  const builder: FakeRangeBuilder = {
    select: (columns: string): FakeRangeBuilder => {
      log.selectCalls.push(columns);
      return builder;
    },
    order: (column: string, options: unknown): FakeRangeBuilder => {
      log.orderCalls.push([column, options]);
      return builder;
    },
    abortSignal: (signal: AbortSignal): FakeRangeBuilder => {
      log.signals.push(signal);
      return builder;
    },
    range: (from: number, to: number): Promise<FakeRangeResult> => {
      log.rangeCalls.push([from, to]);
      if (from === failingRangeFrom) {
        return Promise.resolve({ data: null, error: PAGE_ERROR });
      }
      return Promise.resolve({ data: available.slice(from, to + 1), error: null });
    },
  };
  return builder;
}

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabasePublicReader: () => ({ rpc: fakeRpc }),
}));

type ImportedModule = typeof import('@/lib/services/publicTruckData.server');

let publicTruckData: ImportedModule;

beforeEach(async () => {
  resetFakeState();
  publicTruckData = await import('@/lib/services/publicTruckData.server');
});

describe('getPublicTruckCatalog paging', () => {
  it('uses a 1,000-row page size', () => {
    expect(publicTruckData.PUBLIC_TRUCK_CATALOG_PAGE_SIZE).toBe(1000);
  });

  it('fetches 2,500 rows in three pages and returns them in order', async () => {
    catalogRows = makeCatalogRows(2500);

    const rows = await publicTruckData.getPublicTruckCatalog(5000);

    expect(log.rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(rows).toHaveLength(2500);
    expect(rows).toEqual(catalogRows);
  });

  it('never requests past the limit and returns exactly limit rows', async () => {
    catalogRows = makeCatalogRows(5000);

    const rows = await publicTruckData.getPublicTruckCatalog(1500);

    expect(log.rangeCalls).toEqual([
      [0, 999],
      [1000, 1499],
    ]);
    expect(rows).toHaveLength(1500);
    expect(rows).toEqual(catalogRows.slice(0, 1500));
  });

  it('stops after an empty page when the total is an exact multiple of the page size', async () => {
    catalogRows = makeCatalogRows(2000);

    const rows = await publicTruckData.getPublicTruckCatalog(5000);

    expect(log.rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(rows).toHaveLength(2000);
  });

  it('rejects with the page error when a later page fails', async () => {
    catalogRows = makeCatalogRows(2500);
    failingRangeFrom = 1000;

    await expect(publicTruckData.getPublicTruckCatalog(5000)).rejects.toBe(PAGE_ERROR);
    expect(log.rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('gives every page its own time limit', async () => {
    catalogRows = makeCatalogRows(2500);
    await publicTruckData.getPublicTruckCatalog(2500);
    expect(log.signals).toHaveLength(log.rangeCalls.length);
    expect(log.signals.every((signal) => signal instanceof AbortSignal && !signal.aborted)).toBe(
      true,
    );
  });

  it('orders by data quality score then id on every page', async () => {
    catalogRows = makeCatalogRows(1200);

    await publicTruckData.getPublicTruckCatalog(5000);

    const expectedOrders: Array<[string, unknown]> = [
      ['data_quality_score', { ascending: false, nullsFirst: true }],
      ['id', { ascending: true }],
    ];
    expect(log.orderCalls).toEqual([...expectedOrders, ...expectedOrders]);
  });

  it('passes the limit through to the rpc call', async () => {
    catalogRows = makeCatalogRows(10);

    await publicTruckData.getPublicTruckCatalog(1500);

    expect(log.rpcCalls.every((call) => call.name === 'get_public_truck_catalog_v2')).toBe(true);
    expect(log.rpcCalls.every((call) => call.args.p_limit === 1500)).toBe(true);
  });
});

describe('getPublicTruckCatalog row shape', () => {
  it('asks only for the columns public pages read', async () => {
    catalogRows = makeCatalogRows(3);

    await publicTruckData.getPublicTruckCatalog(5000);

    expect(log.selectCalls).toEqual([publicTruckData.PUBLIC_TRUCK_CATALOG_COLUMNS]);
    expect(publicTruckData.PUBLIC_TRUCK_CATALOG_COLUMNS).not.toMatch(/has_(social|menu)/);
  });

  it('keeps only the coordinates from each location and still redacts descriptions', async () => {
    catalogRows = [
      {
        id: 'truck-0',
        current_location: { lat: 33.47, lng: -81.97, address: '123 Broad St', city: 'Augusta' },
        description: 'Call 706-555-0100 for catering',
      },
    ];

    const [row] = await publicTruckData.getPublicTruckCatalog(5000);

    expect(row?.current_location).toEqual({ lat: 33.47, lng: -81.97 });
    expect(row?.description).not.toContain('706-555-0100');
  });
});
