/**
 * @jest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const supabaseFrom = jest.fn();

jest.unstable_mockModule('@/lib/supabase/client', () => ({
  getSupabase: () => ({ from: supabaseFrom }),
}));

const { FoodTruckServiceClient } = await import('@/lib/supabase/services/foodTruckService.client');

describe('FoodTruckServiceClient.getPublicTrucks', () => {
  const realFetch = globalThis.fetch;
  let requestedUrls: string[];

  beforeEach(() => {
    supabaseFrom.mockReset();
    requestedUrls = [];
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function respondWith(response: Response): void {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      return response;
    }) as typeof fetch;
  }

  it('loads the truck list from the public trucks API', async () => {
    respondWith(
      Response.json({
        trucks: [
          { id: 'truck-1', name: 'First', data_quality_score: 0.9 },
          { id: 'truck-2', name: 'Second', data_quality_score: 0.5 },
        ],
      }),
    );

    const result = await FoodTruckServiceClient.getPublicTrucks(20, 40);

    expect(requestedUrls).toEqual(['/api/trucks/public?limit=20&offset=40']);
    expect(result.trucks.map((truck) => truck.id)).toEqual(['truck-1', 'truck-2']);
    expect(result.totalCount).toBe(2);
    expect(supabaseFrom).not.toHaveBeenCalled();
  });

  it('reports a failed API call instead of reading trucks from Supabase', async () => {
    respondWith(new Response('error', { status: 500 }));

    const result = await FoodTruckServiceClient.getPublicTrucks();

    expect(requestedUrls).toEqual(['/api/trucks/public?limit=500&offset=0']);
    expect(result).toEqual({
      trucks: [],
      totalCount: 0,
      error: 'Public truck list API returned 500',
    });
    expect(supabaseFrom).not.toHaveBeenCalled();
  });

  it('loads dated overrides through the schedules API instead of Supabase', async () => {
    const truckId = '00000000-0000-4000-8000-000000000001';
    const today = new Date().toISOString().slice(0, 10);
    const day = (offset: number): string =>
      new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
    const scheduleBodies: unknown[] = [];
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrls.push(String(input));
      if (String(input) === '/api/trucks/current-schedules') {
        scheduleBodies.push(JSON.parse(String(init?.body)));
        return Response.json({
          recurrences: {},
          overrides: [
            {
              food_truck_id: truckId,
              service_date: day(2),
              is_closed: true,
              is_all_day: false,
              start_time: null,
              end_time: null,
              ends_next_day: false,
              timezone: 'UTC',
              location_data: null,
            },
          ],
        });
      }
      return Response.json({ trucks: [{ id: truckId, name: 'First', timezone: 'UTC' }] });
    }) as typeof fetch;

    const result = await FoodTruckServiceClient.getPublicTrucks(20, 0);

    expect(scheduleBodies).toEqual([
      { truckIds: [truckId], fromDate: day(-1), toDate: today, overridesToDate: day(6) },
    ]);
    expect(result.trucks[0]?.upcoming_overrides).toHaveLength(1);
    expect(supabaseFrom).not.toHaveBeenCalled();
  });
});
