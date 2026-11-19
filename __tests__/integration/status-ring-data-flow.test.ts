/**
 * Integration Test: Status Ring Data Flow
 *
 * This test verifies the complete data flow from public truck payload to status ring display:
 * 1. Public truck payload includes subscription_tier (enriched via enrichWithSubscriptionTiers)
 * 2. fromPublicViewToDomain mapper preserves subscription_tier
 * 3. getStatusRingClass returns correct class based on tier and is_claimed
 *
 * REGRESSION TEST: Ensures pro trucks show green/red rings, not gray
 */

import { jest } from '@jest/globals';
import { fromPublicViewToDomain } from '@/lib/mappers/publicView';
import { getStatusRingClass, getTruckOpenStatus } from '@/lib/utils/statusRing';
import type { FoodTruckPublicView } from '@/lib/types/foodTruckPublicView';

// Mock view data as it comes from database
const createMockPublicView = (
  overrides: Partial<FoodTruckPublicView> = {},
): FoodTruckPublicView => ({
  id: 'test-truck-id',
  name: 'Test Pro Truck',
  slug: 'test-pro-truck',
  description: 'A claimed pro truck',
  current_location: { lat: 33.0, lng: -82.0, address: '123 Test St' },
  operating_hours: {
    sunday: { open: '00:00', close: '23:59' },
    monday: { open: '00:00', close: '23:59' },
    tuesday: { open: '00:00', close: '23:59' },
    wednesday: { open: '00:00', close: '23:59' },
    thursday: { open: '00:00', close: '23:59' },
    friday: { open: '00:00', close: '23:59' },
    saturday: { open: '00:00', close: '23:59' },
  },
  cuisine_type: ['Mexican'],
  contact_info: {},
  social_media: {},
  average_rating: 5,
  review_count: 10,
  data_quality_score: 100,
  verification_status: 'verified',
  is_active: true,
  is_claimed: true,
  owner_id: 'owner-123',
  subscription_tier: 'pro', // CRITICAL: Must be preserved through mapper
  view_count: 100,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_synced_at: new Date().toISOString(),
  ...overrides,
});

describe('Status Ring Data Flow Integration', () => {
  describe('View to Domain Mapper', () => {
    it('should preserve subscription_tier from public payload', () => {
      const viewData = createMockPublicView({
        subscription_tier: 'pro',
        is_claimed: true,
      });

      const domain = fromPublicViewToDomain(viewData);

      // CRITICAL: subscription_tier must be preserved
      expect(domain.subscription_tier).toBe('pro');
      expect(domain.is_claimed).toBe(true);
    });

    it('should handle null subscription_tier', () => {
      const viewData = createMockPublicView({
        subscription_tier: null,
        is_claimed: true,
      });

      const domain = fromPublicViewToDomain(viewData);

      expect(domain.subscription_tier).toBeUndefined();
    });

    it('should preserve is_claimed status', () => {
      const viewData = createMockPublicView({
        is_claimed: true,
        owner_id: 'owner-123',
      });

      const domain = fromPublicViewToDomain(viewData);

      expect(domain.is_claimed).toBe(true);
      expect(domain.owner_id).toBe('owner-123');
    });
  });

  describe('End-to-End: View → Domain → Status Ring', () => {
    it('should show green ring for claimed pro truck that is open', () => {
      // Step 1: Public payload (with subscription_tier enriched via enrichWithSubscriptionTiers)
      const viewData = createMockPublicView({
        is_claimed: true,
        subscription_tier: 'pro',
        owner_id: 'owner-123',
      });

      // Step 2: Convert to domain
      const domain = fromPublicViewToDomain(viewData);

      // Step 3: Get status ring class
      const statusClass = getStatusRingClass(domain);
      const openStatus = getTruckOpenStatus(domain);

      // Assertions
      expect(domain.subscription_tier).toBe('pro');
      expect(domain.is_claimed).toBe(true);
      expect(openStatus).toBe(true);
      expect(statusClass).toBe('open');
    });

    it('should show red ring for claimed pro truck that is closed', () => {
      const viewData = createMockPublicView({
        is_claimed: true,
        subscription_tier: 'pro',
        owner_id: 'owner-123',
        operating_hours: {
          sunday: { closed: true },
          monday: { closed: true },
          tuesday: { closed: true },
          wednesday: { closed: true },
          thursday: { closed: true },
          friday: { closed: true },
          saturday: { closed: true },
        },
      });

      const domain = fromPublicViewToDomain(viewData);
      const statusClass = getStatusRingClass(domain);
      const openStatus = getTruckOpenStatus(domain);

      expect(domain.subscription_tier).toBe('pro');
      expect(domain.is_claimed).toBe(true);
      expect(openStatus).toBe(false);
      expect(statusClass).toBe('closed');
    });

    it('should show gray ring for unclaimed truck', () => {
      const viewData = createMockPublicView({
        is_claimed: null,
        subscription_tier: null,
        owner_id: null,
      });

      const domain = fromPublicViewToDomain(viewData);
      const statusClass = getStatusRingClass(domain);

      expect(domain.is_claimed).toBeNull();
      expect(domain.subscription_tier).toBeUndefined();
      expect(statusClass).toBe('');
    });

    it('should show green ring for claimed free tier truck', () => {
      const viewData = createMockPublicView({
        is_claimed: true,
        subscription_tier: 'free',
        owner_id: 'owner-123',
      });

      const domain = fromPublicViewToDomain(viewData);
      const statusClass = getStatusRingClass(domain);

      expect(domain.subscription_tier).toBe('free');
      expect(domain.is_claimed).toBe(true);
      expect(statusClass).toBe('open');
    });
  });

  describe('REGRESSION: subscription_tier must not be undefined for pro trucks', () => {
    it('should NOT lose subscription_tier during mapper conversion', () => {
      const viewData = createMockPublicView({
        is_claimed: true,
        subscription_tier: 'pro',
      });

      const domain = fromPublicViewToDomain(viewData);

      // This was the bug: subscription_tier was becoming undefined
      expect(domain.subscription_tier).toBeDefined();
      expect(domain.subscription_tier).toBe('pro');
      expect(getStatusRingClass(domain)).toBe('open');
    });

    it('should show green ring for starter tier truck (treated same as free)', () => {
      const viewData = createMockPublicView({
        is_claimed: true,
        subscription_tier: 'starter',
      });

      const domain = fromPublicViewToDomain(viewData);

      expect(domain.subscription_tier).toBe('starter');
      expect(getStatusRingClass(domain)).toBe('open');
    });
  });
});
