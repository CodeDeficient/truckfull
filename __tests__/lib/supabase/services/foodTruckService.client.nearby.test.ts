/**
 * @jest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const supabaseFrom = jest.fn();

jest.unstable_mockModule('@/lib/supabase/client', () => ({
  getSupabase: () => ({ from: supabaseFrom }),
}));

const { FoodTruckServiceClient } = await import(
  '@/lib/supabase/services/foodTruckService.client'
);

describe('FoodTruckServiceClient.getTrucksByLocation', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    supabaseFrom.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('reports a failed nearby lookup instead of reading trucks from Supabase', async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response('rate limited', { status: 429, statusText: 'Too Many Requests' }),
    ) as typeof fetch;

    await expect(FoodTruckServiceClient.getTrucksByLocation(32.08, -81.09, 10)).rejects.toThrow(
      'API route error: 429',
    );
    expect(supabaseFrom).not.toHaveBeenCalled();
  });

  it('reports an unreachable nearby API instead of reading trucks from Supabase', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;

    await expect(FoodTruckServiceClient.getTrucksByLocation(32.08, -81.09, 10)).rejects.toThrow(
      'Failed to fetch',
    );
    expect(supabaseFrom).not.toHaveBeenCalled();
  });
});
