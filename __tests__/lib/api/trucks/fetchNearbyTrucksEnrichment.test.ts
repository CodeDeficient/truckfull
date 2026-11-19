/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchNearbyTrucks } from '@/lib/api/trucks/fetchNearbyTrucks';

type Row = Record<string, unknown>;

const RPC_ROW: Row = {
  id: 'truck-1',
  name: 'Address Only Truck',
  owner_id: 'owner-1',
  current_location: { address: 'Aiken, SC' },
  status: 'offline',
  timezone: 'America/New_York',
  data_quality_score: 1,
};

const TABLES: Record<string, Row[]> = {
  food_trucks: [
    {
      id: 'truck-1',
      default_lat: 33.56,
      default_lng: -81.72,
      live_gps_lat: null,
      live_gps_lng: null,
      status: 'live',
    },
  ],
  profiles: [{ id: 'owner-1', subscription_tier: 'pro' }],
};

function fakeClient(): SupabaseClient {
  const rpcResult = { data: [RPC_ROW], error: null, count: 1 };
  return {
    rpc: () => ({ range: () => Promise.resolve(rpcResult) }),
    from: (table: string) => ({
      select: () => ({
        in: () => Promise.resolve({ data: TABLES[table] ?? [], error: null }),
      }),
    }),
  } as unknown as SupabaseClient;
}

async function fetchOne(enrichTiers: boolean): Promise<Row> {
  const [truck] = await fetchNearbyTrucks({
    lat: 33.5,
    lng: -81.7,
    radiusMiles: 25,
    client: fakeClient(),
    enrichTiers,
  });
  return truck as Row;
}

describe('fetchNearbyTrucks enrichment', () => {
  it('keeps both the backfilled location and the owner tier', async () => {
    const truck = await fetchOne(true);
    expect(truck).toMatchObject({
      default_lat: 33.56,
      default_lng: -81.72,
      status: 'live',
      subscription_tier: 'pro',
      timezone: 'America/New_York',
      is_claimed: true,
    });
    expect(truck).not.toHaveProperty('owner_id');
  });

  it('skips the tier lookup when tiers are not requested', async () => {
    const truck = await fetchOne(false);
    expect(truck).toMatchObject({ default_lat: 33.56, status: 'live' });
    expect(truck).not.toHaveProperty('subscription_tier');
  });
});
