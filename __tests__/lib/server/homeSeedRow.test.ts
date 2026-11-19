import { describe, expect, it } from '@jest/globals';
import { toHomeSeedRow } from '@/lib/server/homeInitialTrucks';
import { fromDomainToFoodTruck, fromFoodTruckRow } from '@/lib/mappers/domain';
import { filterBySearch } from '@/lib/utils/truckFiltering';
import type { TruckFromRPC } from '@/lib/api/trucks/fetchNearbyTrucks';

const FULL_ROW: TruckFromRPC = {
  id: 'truck-1',
  name: 'Taco Wagon',
  slug: 'taco-wagon',
  description: 'Street tacos',
  cuisine_type: ['Mexican'],
  menu_keywords: ['taco', 'burrito', 'quesadilla'],
  specialties: ['al pastor'],
  current_location: { lat: 33.47, lng: -82.01, address: '1 Broad St' },
  default_lat: 33.47,
  default_lng: -82.01,
  operating_hours: { monday: { open: '11:00', close: '14:00' } },
  social_media: { instagram: 'tacowagon' },
  contact_info: { phone: '555-0100' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  last_synced_at: '2026-01-03T00:00:00Z',
  distance_miles: 1.5,
  distance_meters: 2414,
  is_claimed: true,
  has_menu: true,
  owner_id: 'owner-1',
  subscription_tier: 'pro',
  status: 'active',
  timezone: 'America/New_York',
};

describe('toHomeSeedRow', () => {
  it('drops the fields the finder never reads', () => {
    const row = toHomeSeedRow(FULL_ROW);
    expect(row).not.toHaveProperty('specialties');
    expect(FULL_ROW).toHaveProperty('specialties');
    expect(row.menu_keywords).toEqual(FULL_ROW.menu_keywords);
  });

  it('gives the finder exactly the same truck as the full row', () => {
    expect(fromFoodTruckRow(toHomeSeedRow(FULL_ROW) as never)).toEqual(
      fromFoodTruckRow(FULL_ROW as never),
    );
  });
});

describe('menu item search on converted trucks', () => {
  it('finds a truck by a dish that only appears in its menu keywords', () => {
    const truck = fromDomainToFoodTruck(fromFoodTruckRow(toHomeSeedRow(FULL_ROW) as never));
    expect(truck.menu_keywords).toEqual(['taco', 'burrito', 'quesadilla']);
    expect(filterBySearch([truck], 'quesadilla').map((match) => match.id)).toEqual(['truck-1']);
  });

  it('ignores keyword values that are not strings', () => {
    const row = { ...FULL_ROW, menu_keywords: ['taco', 42, null] } as unknown as TruckFromRPC;
    expect(fromFoodTruckRow(row as never).menu_keywords).toEqual(['taco']);
  });
});
