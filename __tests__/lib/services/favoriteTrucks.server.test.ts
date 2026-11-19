/**
 * @jest-environment node
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type TableResult = { data: unknown[] | null; error: { message: string } | null };

const tableResults = new Map<string, TableResult>();
const selectedColumns = new Map<string, string>();

function queryFor(table: string): Record<string, unknown> {
  const result = (): TableResult => tableResults.get(table) ?? { data: [], error: null };
  const query: Record<string, unknown> = {
    select: (columns: string) => {
      selectedColumns.set(table, columns);
      return query;
    },
    eq: () => query,
    in: () => query,
    order: () => query,
    then: (resolve: (value: TableResult) => unknown) => Promise.resolve(resolve(result())),
  };
  return query;
}

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => queryFor(table) }),
}));

const { listFavoriteTrucks } = await import('@/lib/services/favoriteTrucks.server');

describe('listFavoriteTrucks', () => {
  beforeEach(() => {
    tableResults.clear();
    selectedColumns.clear();
  });

  it('returns favorited trucks newest first without owner fields', async () => {
    tableResults.set('user_favorites', {
      data: [
        { id: 'fav-2', created_at: '2026-10-02', food_truck_id: 'truck-b' },
        { id: 'fav-1', created_at: '2026-10-01', food_truck_id: 'truck-a' },
      ],
      error: null,
    });
    tableResults.set('food_trucks', {
      data: [
        { id: 'truck-a', name: 'A', owner_id: 'owner-1', claimed_by: 'owner-1' },
        { id: 'truck-b', name: 'B', owner_id: 'owner-2', claimed_by: 'owner-2' },
      ],
      error: null,
    });

    const trucks = await listFavoriteTrucks('user-1');

    expect(trucks.map((truck) => [truck.id, truck.favorite_id])).toEqual([
      ['truck-b', 'fav-2'],
      ['truck-a', 'fav-1'],
    ]);
    expect(trucks.every((truck) => !('owner_id' in truck) && !('claimed_by' in truck))).toBe(true);
    expect(selectedColumns.get('food_trucks')).not.toBe('*');
  });

  it('skips favorites whose truck no longer exists', async () => {
    tableResults.set('user_favorites', {
      data: [{ id: 'fav-1', created_at: '2026-10-01', food_truck_id: 'gone' }],
      error: null,
    });

    expect(await listFavoriteTrucks('user-1')).toEqual([]);
  });

  it('throws when the favorites lookup fails', async () => {
    tableResults.set('user_favorites', { data: null, error: { message: 'boom' } });

    await expect(listFavoriteTrucks('user-1')).rejects.toThrow('Favorite lookup failed: boom');
  });
});
