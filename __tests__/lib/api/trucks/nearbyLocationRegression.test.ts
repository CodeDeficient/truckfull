/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { fetchNearbyTrucks, withoutOwnerId } from '@/lib/api/trucks/fetchNearbyTrucks';
import { fromDomainToFoodTruck, fromFoodTruckRow } from '@/lib/mappers/domain';
import { fromPublicViewToDomain } from '@/lib/mappers/publicView';
import { resolveActiveLocation } from '@/lib/services/activeLocation';
import { filterByDistance, filterBySearch } from '@/lib/utils/truckFiltering';
import type { FoodTruckMapperInput } from '@/lib/mappers/domain';

const row: FoodTruckMapperInput = {
  id: 'truck-location-regression',
  name: 'Sample Vegan Kitchen',
  slug: 'sample-vegan-kitchen',
  description: '',
  cuisine_type: ['Vegan'],
  city: 'Graniteville',
  state: 'SC',
  updated_at: null,
  contact_info: {},
  social_media: {},
  current_location: { address: 'Graniteville, SC' },
  default_lat: 33.5886699,
  default_lng: -81.7734359,
  live_gps_lat: 33.588725,
  live_gps_lng: -81.7733545,
  status: 'live',
  price_range: null,
  menu: [],
  operating_hours: null,
  timezone: 'America/New_York',
  is_active: true,
  average_rating: null,
  review_count: 0,
};
const origin = { lat: 33.47, lng: -81.975 };

describe('address-only trucks on the map', () => {
  it('preserves nearby distance and GPS through both client conversions', () => {
    const truck = fromDomainToFoodTruck(fromFoodTruckRow({ ...row, distance_miles: 14.23 }));
    expect(truck.distance_miles).toBe(14.23);
    expect(truck.live_gps_lat).toBe(row.live_gps_lat);
    expect(truck.live_gps_lng).toBe(row.live_gps_lng);
    expect(truck.status).toBe('live');
    expect(filterBySearch(filterByDistance([truck], origin, 50), 'sample vegan')).toHaveLength(1);
    expect(resolveActiveLocation(truck)).toMatchObject({
      lat: row.default_lat,
      lng: row.default_lng,
    });
  });

  it('keeps default-location trucks searchable on the all-trucks fallback', () => {
    const domain = fromPublicViewToDomain({
      id: row.id,
      name: row.name,
      current_location: { address: 'Graniteville, SC' },
      default_lat: row.default_lat,
      default_lng: row.default_lng,
      status: 'offline',
    });
    const truck = fromDomainToFoodTruck(domain);
    expect(filterBySearch(filterByDistance([truck], origin, 50), 'sample vegan')).toHaveLength(1);
    expect(filterByDistance([truck], origin, 5)).toHaveLength(0);
    expect(resolveActiveLocation(truck)).toMatchObject({
      lat: row.default_lat,
      lng: row.default_lng,
    });
  });

  it('hydrates missing RPC location columns from the table without losing distance', async () => {
    const rpcRow = { ...row, distance_miles: 14.23 };
    delete (rpcRow as Partial<typeof rpcRow>).default_lat;
    delete (rpcRow as Partial<typeof rpcRow>).default_lng;
    delete (rpcRow as Partial<typeof rpcRow>).live_gps_lat;
    delete (rpcRow as Partial<typeof rpcRow>).live_gps_lng;
    delete (rpcRow as Partial<typeof rpcRow>).status;
    const client = createClient('https://nearby-regression.invalid', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input): Promise<Response> => {
          const url = String(input);
          const location = {
            id: row.id,
            default_lat: row.default_lat,
            default_lng: row.default_lng,
            live_gps_lat: row.live_gps_lat,
            live_gps_lng: row.live_gps_lng,
            status: row.status,
          };
          const data = url.includes('/rpc/') ? [rpcRow] : [location];
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      },
    });
    const trucks = await fetchNearbyTrucks({
      ...origin,
      radiusMiles: 50,
      client,
      enrichTiers: false,
    });
    expect(trucks[0]).toMatchObject({
      default_lat: row.default_lat,
      live_gps_lat: row.live_gps_lat,
      status: 'live',
      distance_miles: 14.23,
    });
    const truck = fromDomainToFoodTruck(fromFoodTruckRow(trucks[0] as FoodTruckMapperInput));
    expect(filterBySearch(filterByDistance([truck], origin, 50), 'sample vegan')).toHaveLength(1);
    expect(resolveActiveLocation(truck)).toMatchObject({
      lat: row.default_lat,
      lng: row.default_lng,
    });
  });

  it('drops owner_id after tier enrichment and reports the truck as claimed', async () => {
    const ownerId = '00000000-0000-4000-8000-000000000001';
    const client = createClient('https://nearby-regression.invalid', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input): Promise<Response> => {
          const url = String(input);
          const data = url.includes('/rpc/')
            ? [
                {
                  ...row,
                  current_location: { lat: 33.58, lng: -81.77 },
                  owner_id: ownerId,
                  is_claimed: false,
                  timezone: 'America/New_York',
                },
              ]
            : [{ id: ownerId, subscription_tier: 'pro' }];
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      },
    });
    const trucks = await fetchNearbyTrucks({
      ...origin,
      radiusMiles: 50,
      client,
      enrichTiers: true,
    });
    expect(trucks[0]).not.toHaveProperty('owner_id');
    expect(trucks[0]).toMatchObject({ is_claimed: true, subscription_tier: 'pro' });
    expect(JSON.stringify(trucks)).not.toContain(ownerId);
  });

  it('leaves unowned trucks unclaimed without an owner_id key', () => {
    const truck = withoutOwnerId({ id: 'a', name: 'A', owner_id: null, is_claimed: false });
    expect(truck).toEqual({ id: 'a', name: 'A', is_claimed: false });
  });

  it('does not query location columns for RPC rows with valid coordinates', async () => {
    const client = createClient('https://nearby-regression.invalid', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input): Promise<Response> => {
          expect(String(input)).toContain('/rpc/find_trucks_within_radius');
          return new Response(
            JSON.stringify([
              { ...row, current_location: { lat: 33.58, lng: -81.77 }, distance_miles: 14 },
            ]),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          );
        },
      },
    });
    const trucks = await fetchNearbyTrucks({
      ...origin,
      radiusMiles: 50,
      client,
      enrichTiers: false,
    });
    expect(trucks[0].distance_miles).toBe(14);
  });

  it('batches location lookups and joins results by ID rather than response order', async () => {
    const rows = Array.from({ length: 201 }, (_, index) => ({
      ...row,
      id: `truck-${index}`,
      distance_miles: index / 10,
    }));
    const sizes: number[] = [];
    const client = createClient('https://nearby-regression.invalid', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (input): Promise<Response> => {
          const url = new URL(String(input));
          let data: unknown = rows;
          if (!url.pathname.includes('/rpc/')) {
            const ids = (url.searchParams.get('id') ?? '')
              .slice(4, -1)
              .split(',')
              .map((id) => id.replace(/^"|"$/g, ''));
            sizes.push(ids.length);
            data = ids
              .reverse()
              .map((id) => ({
                id,
                default_lat: 33 + Number(id.slice(6)) / 1000,
                default_lng: -81.77,
              }));
          }
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
          });
        },
      },
    });
    const trucks = await fetchNearbyTrucks({
      ...origin,
      radiusMiles: 50,
      client,
      enrichTiers: false,
    });
    expect(sizes).toEqual([100, 100, 1]);
    expect(trucks.map((truck) => truck.id)).toEqual(rows.map((truck) => truck.id));
    expect(trucks[200]).toMatchObject({ id: 'truck-200', default_lat: 33.2, distance_miles: 20 });
  });
});
