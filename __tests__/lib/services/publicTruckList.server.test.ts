/**
 * @jest-environment node
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type QueryResult = { data: unknown; error: unknown };

const calls: Array<[string, unknown[]]> = [];
let truckResult: QueryResult = { data: [], error: null };
let profileResult: QueryResult = { data: [], error: null };

function chain(table: string): Record<string, unknown> {
  const result = table === 'profiles' ? profileResult : truckResult;
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'gte', 'not', 'range', 'order', 'in']) {
    builder[method] = (...args: unknown[]): Record<string, unknown> => {
      calls.push([`${table}.${method}`, args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: QueryResult) => unknown): unknown => resolve(result);
  return builder;
}

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => chain(table) }),
}));

const { getPublicTruckListPage, parsePublicTruckListParams } =
  await import('@/lib/services/publicTruckList.server');
const { PUBLIC_TRUCK_CLIENT_COLUMNS } =
  await import('@/lib/supabase/services/foodTruckService.client.helpers');

beforeEach(() => {
  calls.length = 0;
  truckResult = { data: [], error: null };
  profileResult = { data: [], error: null };
});

describe('parsePublicTruckListParams', () => {
  it('defaults to the first 500 trucks', () => {
    expect(parsePublicTruckListParams(new URLSearchParams())).toEqual({ limit: 500, offset: 0 });
  });

  it('caps the limit at 10,000 and keeps it at least 1', () => {
    expect(parsePublicTruckListParams(new URLSearchParams('limit=50000')).limit).toBe(5000);
    expect(parsePublicTruckListParams(new URLSearchParams('limit=0')).limit).toBe(1);
  });

  it('ignores values that are not whole numbers', () => {
    expect(parsePublicTruckListParams(new URLSearchParams('limit=-5&offset=abc'))).toEqual({
      limit: 500,
      offset: 0,
    });
    expect(parsePublicTruckListParams(new URLSearchParams('limit=20&offset=40'))).toEqual({
      limit: 20,
      offset: 40,
    });
  });
});

describe('getPublicTruckListPage', () => {
  it('runs the browser list query with the server key', async () => {
    await getPublicTruckListPage({ limit: 20, offset: 40 });

    expect(calls).toEqual([
      ['food_trucks.select', [PUBLIC_TRUCK_CLIENT_COLUMNS]],
      ['food_trucks.gte', ['data_quality_score', 0]],
      ['food_trucks.not', ['verification_status', 'in', '("shadowbanned","rejected")']],
      ['food_trucks.range', [40, 59]],
      ['food_trucks.order', ['data_quality_score', { ascending: false }]],
    ]);
  });

  it('adds subscription tiers and drops owner ids', async () => {
    truckResult = {
      data: [
        { id: 'claimed', name: 'Claimed', owner_id: 'owner-1', is_claimed: true },
        { id: 'unclaimed', name: 'Unclaimed', owner_id: null, is_claimed: false },
      ],
      error: null,
    };
    profileResult = { data: [{ id: 'owner-1', subscription_tier: 'pro' }], error: null };

    const trucks = await getPublicTruckListPage({ limit: 500, offset: 0 });

    expect(trucks).toEqual([
      {
        id: 'claimed',
        name: 'Claimed',
        is_claimed: true,
        subscription_tier: 'pro',
        has_menu: false,
        menu_keywords: [],
      },
      { id: 'unclaimed', name: 'Unclaimed', is_claimed: false, has_menu: false, menu_keywords: [] },
    ]);
  });

  it('throws when the truck query fails', async () => {
    truckResult = { data: null, error: new Error('query failed') };

    await expect(getPublicTruckListPage({ limit: 500, offset: 0 })).rejects.toThrow('query failed');
  });
});
