/**
 * Test: toPublicFoodTruck should preserve subscription_tier
 *
 * This test verifies that when converting FoodTruck to PublicFoodTruck,
 * the subscription_tier field is preserved for status ring display.
 */

import { toPublicFoodTruck } from '@/lib/mappers/publicView';
import { INTERNAL_TRUCK_FIELDS } from '@/lib/types';
import type { FoodTruck } from '@/lib/types';

const createMockFoodTruck = (overrides: Partial<FoodTruck> = {}): FoodTruck => {
  return {
    id: 'truck-1',
    name: 'Test Truck',
    slug: 'test-truck',
    description: 'A test food truck',
    current_location: { lat: 33.0, lng: -82.0 },
    operating_hours: null,
    contact_info: {},
    social_media: {},
    menu_items: [],
    cuisine_type: [],
    average_rating: 5,
    is_claimed: true,
    subscription_tier: 'pro',
    owner_id: 'owner-123',
    ...overrides,
  } as FoodTruck;
};

describe('toPublicFoodTruck', () => {
  it('should preserve subscription_tier when converting to public payload', () => {
    const truck = createMockFoodTruck({
      subscription_tier: 'pro',
      is_claimed: true,
      owner_id: 'owner-123',
    });

    const publicTruck = toPublicFoodTruck(truck);

    // subscription_tier should be preserved
    expect(publicTruck.subscription_tier).toBe('pro');
    // owner_id should be stripped (internal field)
    expect((publicTruck as any).owner_id).toBeUndefined();
  });

  it('should preserve is_claimed for status ring calculation', () => {
    const truck = createMockFoodTruck({
      is_claimed: true,
      subscription_tier: 'starter',
    });

    const publicTruck = toPublicFoodTruck(truck);

    expect(publicTruck.is_claimed).toBe(true);
    expect(publicTruck.subscription_tier).toBe('starter');
  });

  it('should handle null/undefined subscription_tier', () => {
    const truck = createMockFoodTruck({
      subscription_tier: undefined,
    });

    const publicTruck = toPublicFoodTruck(truck);

    expect(publicTruck.subscription_tier).toBeUndefined();
  });

  it('strips every internal field and keeps public ones', () => {
    const internal = Object.fromEntries(INTERNAL_TRUCK_FIELDS.map((field) => [field, 'private']));
    const truck = createMockFoodTruck(internal as Partial<FoodTruck>);

    const publicTruck = toPublicFoodTruck(truck) as Record<string, unknown>;

    for (const field of INTERNAL_TRUCK_FIELDS) {
      expect(publicTruck).not.toHaveProperty(field);
    }
    expect(publicTruck).toMatchObject({ id: 'truck-1', name: 'Test Truck', slug: 'test-truck' });
  });

  it('strips user, claim, editor and Facebook linkage fields', () => {
    expect(INTERNAL_TRUCK_FIELDS).toEqual(
      expect.arrayContaining([
        'owner_id',
        'user_id',
        'claimed_by',
        'claim_verification_method',
        'menu_updated_by',
        'location_updated_by',
        'schedule_updated_by',
        'facebook_page_id',
      ]),
    );
  });
});
