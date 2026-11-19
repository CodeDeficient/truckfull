/**
 * Tests for lib/mappers/publicView.ts
 * Tests mapping from the public truck payload to FoodTruckDomain
 */

import { fromPublicViewToDomain } from '../publicView';
import type { FoodTruckPublicView } from '@/lib/types/foodTruckPublicView';
import type { FoodTruckDomain } from '@/lib/types';

describe('fromPublicViewToDomain', () => {
  const createMockViewData = (
    overrides: Partial<FoodTruckPublicView> = {},
  ): FoodTruckPublicView => ({
    id: 'test-id',
    name: 'Test Truck',
    description: 'Test Description',
    current_location: null,
    operating_hours: null,
    contact_info: {},
    social_media: {},
    average_rating: 4.5,
    review_count: 10,
    data_quality_score: 0.8,
    verification_status: 'verified',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_synced_at: '2024-01-01T00:00:00Z',
    menu: [],
    cuisine_type: ['burgers'],
    price_range: '$$',
    specialties: ['Burgers'],
    state: 'GA',
    location_geog: null,
    lat: 33.4735,
    lng: -82.0383,
    is_claimed: true,
    owner_id: 'owner-id',
    subscription_tier: 'premium',
    view_count: 100,
    ...overrides,
  });

  describe('Issue 1: slug field mapping', () => {
    it('should map slug from view data to domain', () => {
      const viewData = createMockViewData({ slug: 'test-truck' });
      const result = fromPublicViewToDomain(viewData);

      expect(result).toHaveProperty('slug', 'test-truck');
    });

    it('should handle missing slug', () => {
      const viewData = createMockViewData({ slug: undefined });
      const result = fromPublicViewToDomain(viewData);

      expect(result.slug).toBeUndefined();
    });
  });

  describe('Issue 4: is_active should use actual value', () => {
    it('should map is_active: false from view data', () => {
      const viewData = createMockViewData({ is_active: false });
      const result = fromPublicViewToDomain(viewData);

      expect(result.is_active).toBe(false);
    });

    it('should map is_active: true from view data', () => {
      const viewData = createMockViewData({ is_active: true });
      const result = fromPublicViewToDomain(viewData);

      expect(result.is_active).toBe(true);
    });

    it('should default is_active to true when undefined', () => {
      const viewData = createMockViewData({ is_active: undefined });
      const result = fromPublicViewToDomain(viewData);

      expect(result.is_active).toBe(true);
    });
  });

  describe('Issue 3: subscription_tier should use view value directly', () => {
    it('should map subscription_tier from view data (no profiles fallback)', () => {
      const viewData = createMockViewData({ subscription_tier: 'free' });
      const result = fromPublicViewToDomain(viewData);

      expect(result.subscription_tier).toBe('free');
    });

    it('should handle null subscription_tier', () => {
      const viewData = createMockViewData({ subscription_tier: null });
      const result = fromPublicViewToDomain(viewData);

      expect(result.subscription_tier).toBeUndefined();
    });

    it('should handle undefined subscription_tier', () => {
      const viewData = createMockViewData({ subscription_tier: undefined });
      const result = fromPublicViewToDomain(viewData);

      expect(result.subscription_tier).toBeUndefined();
    });
  });
});
