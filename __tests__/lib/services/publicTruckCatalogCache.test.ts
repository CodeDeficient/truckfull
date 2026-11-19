/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

interface CacheCall {
  readonly fn: () => Promise<unknown>;
  readonly keyParts: readonly string[];
  readonly options: { readonly revalidate: number; readonly tags: readonly string[] };
}

interface RpcCall {
  readonly name: string;
  readonly args: { readonly p_limit: number };
}

const cacheCalls: CacheCall[] = [];
const rpcCalls: RpcCall[] = [];
let catalogRows: Array<{ readonly id: string }> = [];

jest.unstable_mockModule('next/cache', () => ({
  unstable_cache: (
    fn: () => Promise<unknown>,
    keyParts: readonly string[],
    options: { readonly revalidate: number; readonly tags: readonly string[] },
  ): (() => Promise<unknown>) => {
    cacheCalls.push({ fn, keyParts, options });
    return fn;
  },
}));

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabasePublicReader: () => ({
    rpc: (name: string, args: { p_limit: number }) => {
      rpcCalls.push({ name, args });
      const builder = {
        select: () => builder,
        order: () => builder,
        abortSignal: () => builder,
        range: (from: number, to: number): Promise<{ data: unknown[]; error: null }> =>
          Promise.resolve({ data: catalogRows.slice(from, to + 1), error: null }),
      };
      return builder;
    },
  }),
}));

type ImportedModule = typeof import('@/lib/services/publicTruckData.server');

let publicTruckData: ImportedModule;

beforeAll(async () => {
  publicTruckData = await import('@/lib/services/publicTruckData.server');
});

beforeEach(() => {
  rpcCalls.length = 0;
  catalogRows = [{ id: 'truck-a' }, { id: 'truck-b' }];
});

describe('getCachedPublicTruckCatalog persistent cache registration', () => {
  it('registers exactly one unstable_cache entry for the catalog', () => {
    expect(cacheCalls).toHaveLength(1);
  });

  it('keys the entry by tag, catalog function and row shape so a changed shape never reads old rows', () => {
    expect(cacheCalls[0]?.keyParts).toEqual([
      'public-truck-catalog',
      'get_public_truck_catalog_v2',
      'lean-v1',
    ]);
  });

  it('revalidates once per day', () => {
    expect(publicTruckData.PUBLIC_TRUCK_CATALOG_REVALIDATE_SECONDS).toBe(86_400);
    expect(cacheCalls[0]?.options.revalidate).toBe(86_400);
  });

  it('tags the entry only with public-truck-catalog, not the per-edit public-trucks tag', () => {
    expect(cacheCalls[0]?.options.tags).toEqual(['public-truck-catalog']);
    expect(cacheCalls[0]?.options.tags).not.toContain('public-trucks');
  });
});

describe('getCachedPublicTruckCatalog behavior', () => {
  it('runs the catalog rpc with the full limit and returns its rows', async () => {
    const rows = await publicTruckData.getCachedPublicTruckCatalog();

    expect(rpcCalls.length).toBeGreaterThan(0);
    expect(rpcCalls.every((call) => call.name === 'get_public_truck_catalog_v2')).toBe(true);
    expect(rpcCalls.every((call) => call.args.p_limit === 10_000)).toBe(true);
    expect(rows).toEqual([
      { id: 'truck-a', current_location: null },
      { id: 'truck-b', current_location: null },
    ]);
  });
});

describe('getCachedPublicTruckCatalog process-wide sharing', () => {
  it('serves every request the same frozen catalog instead of a fresh parsed copy each', async () => {
    const [first, second, third] = await Promise.all([
      publicTruckData.getCachedPublicTruckCatalog(),
      publicTruckData.getCachedPublicTruckCatalog(),
      publicTruckData.getCachedPublicTruckCatalog(),
    ]);
    const later = await publicTruckData.getCachedPublicTruckCatalog();

    expect(rpcCalls.length).toBeLessThanOrEqual(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(later).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.every((row) => Object.isFrozen(row))).toBe(true);
  });

  it('keeps the shared copy for five minutes', () => {
    expect(publicTruckData.PUBLIC_TRUCK_CATALOG_SHARE_MS).toBe(300_000);
  });
});
