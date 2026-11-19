import { describe, expect, it } from '@jest/globals';
import {
  filterFeaturedTrucksByDistance,
  isFeaturedPublicTruck,
  isTestTruckName,
} from '@/lib/api/client/trucks';
import type { PublicFoodTruck } from '@/lib/types';

function publicTruck(overrides: Partial<PublicFoodTruck> = {}): PublicFoodTruck {
  return {
    id: 'truck-id',
    name: 'Acme Food Truck',
    slug: 'acme-food-truck',
    cuisine_type: ['BBQ'],
    verification_status: 'verified',
    data_quality_score: 0.8,
    current_location: { lat: 33.75, lng: -84.39 },
    ...overrides,
  } as PublicFoodTruck;
}

describe('trucks API client', () => {
  describe('isFeaturedPublicTruck', () => {
    it('keeps verified trucks with finite non-negative quality scores', () => {
      expect(isFeaturedPublicTruck(publicTruck())).toBe(true);
      expect(isFeaturedPublicTruck(publicTruck({ verification_status: 'pending' }))).toBe(true);
      expect(isFeaturedPublicTruck(publicTruck({ data_quality_score: 0 }))).toBe(true);
    });

    it('blocks shadowbanned/rejected and low-quality scores; other statuses pass', () => {
      expect(isFeaturedPublicTruck(publicTruck({ verification_status: 'unverified' }))).toBe(true);
      expect(isFeaturedPublicTruck(publicTruck({ verification_status: 'staging' }))).toBe(true);
      expect(isFeaturedPublicTruck(publicTruck({ verification_status: 'shadowbanned' }))).toBe(false);
      expect(isFeaturedPublicTruck(publicTruck({ verification_status: 'rejected' }))).toBe(false);
      expect(isFeaturedPublicTruck(publicTruck({ data_quality_score: -1 }))).toBe(false);
      expect(isFeaturedPublicTruck(publicTruck({ data_quality_score: undefined }))).toBe(false);
      expect(isFeaturedPublicTruck(publicTruck({ data_quality_score: NaN }))).toBe(false);
      expect(isFeaturedPublicTruck(publicTruck({ data_quality_score: Infinity }))).toBe(false);
    });

    it('excludes trucks with test names from featured content', () => {
      expect(isFeaturedPublicTruck(publicTruck({ name: 'Test Truck' }))).toBe(false);
      expect(isFeaturedPublicTruck(publicTruck({ name: 'Saturday Market Test Truck' }))).toBe(false);
      expect(isFeaturedPublicTruck(publicTruck({ name: 'test truck lowercase' }))).toBe(false);
      expect(isFeaturedPublicTruck(publicTruck({ name: 'My TEST Food Truck' }))).toBe(false);
      expect(isFeaturedPublicTruck(publicTruck({ name: 'Contest Kitchen' }))).toBe(true);
    });

    it('does not check current_location shape (only isFeaturedPublicTruck filters)', () => {
      const truck = publicTruck({ current_location: { lat: NaN, lng: NaN } });
      expect(isFeaturedPublicTruck(truck)).toBe(true);
    });
  });

  describe('isTestTruckName', () => {
    it('returns true for names containing "test" as a whole word', () => {
      expect(isTestTruckName('Test Truck')).toBe(true);
      expect(isTestTruckName('Saturday Market Test Truck')).toBe(true);
      expect(isTestTruckName('test truck lowercase')).toBe(true);
      expect(isTestTruckName('My TEST Food Truck')).toBe(true);
      expect(isTestTruckName('TEST')).toBe(true);
    });

    it('returns false for names without "test" as a whole word', () => {
      expect(isTestTruckName('Contest Kitchen')).toBe(false);
      expect(isTestTruckName('Sample Vegan Kitchen')).toBe(false);
      expect(isTestTruckName('Protest BBQ')).toBe(false);
      expect(isTestTruckName('Atest Truck')).toBe(false);
      expect(isTestTruckName('Testy Eats')).toBe(false);
    });

    it('handles null, undefined, and empty strings', () => {
      expect(isTestTruckName(null)).toBe(false);
      expect(isTestTruckName(undefined)).toBe(false);
      expect(isTestTruckName('')).toBe(false);
    });
  });

  describe('filterFeaturedTrucksByDistance', () => {
    it('returns the input unchanged when no location is provided', () => {
      const trucks = [publicTruck({ id: 'a' }), publicTruck({ id: 'b' })];
      expect(filterFeaturedTrucksByDistance(trucks, undefined, 300).map(({ id }) => id)).toEqual([
        'a',
        'b',
      ]);
    });

    it('excludes trucks outside the radius and keeps trucks within', () => {
      const trucks = [
        publicTruck({ id: 'near', current_location: { lat: 33.75, lng: -84.39 } }),
        publicTruck({ id: 'far', current_location: { lat: 40.71, lng: -74.01 } }),
      ];
      expect(
        filterFeaturedTrucksByDistance(trucks, { lat: 33.749, lng: -84.388 }, 300).map(
          ({ id }) => id,
        ),
      ).toEqual(['near']);
    });

    it('drops trucks without a current_location when a location is provided', () => {
      const trucks = [
        publicTruck({ id: 'placed', current_location: { lat: 33.75, lng: -84.39 } }),
        publicTruck({ id: 'floating', current_location: null }),
      ];
      expect(
        filterFeaturedTrucksByDistance(trucks, { lat: 33.749, lng: -84.388 }, 300).map(
          ({ id }) => id,
        ),
      ).toEqual(['placed']);
    });

    it('returns no trucks when radius is zero, negative, or non-finite', () => {
      const trucks = [publicTruck({ id: 'a', current_location: { lat: 33.75, lng: -84.39 } })];
      const location = { lat: 33.749, lng: -84.388 };
      expect(filterFeaturedTrucksByDistance(trucks, location, 0)).toEqual([]);
      expect(filterFeaturedTrucksByDistance(trucks, location, -5)).toEqual([]);
      expect(filterFeaturedTrucksByDistance(trucks, location, Number.NaN)).toEqual([]);
      expect(filterFeaturedTrucksByDistance(trucks, location, Number.POSITIVE_INFINITY)).toEqual(
        [],
      );
    });
  });
});
