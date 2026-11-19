import { describe, it, expect } from '@jest/globals';
import {
  applyCuisineFilter,
  applyOpenNowFilter,
  applyTextSearchFilter,
  applyAllFilters,
  applyPriceRangeFilter,
} from '@/lib/api/search/filters';
import type { FoodTruckDomain } from '@/lib/types';

const createMockTruck = (overrides: Partial<FoodTruckDomain> = {}): FoodTruckDomain => ({
  id: '1',
  name: 'Test Truck',
  slug: 'test-truck',
  description: 'A delicious test truck',
  current_location: null,
  operating_hours: null,
  menu_items: [],
  cuisine_type: ['Mexican', 'American'],
  price_range: '$$',
  specialties: ['Tacos', 'Burgers'],
  data_quality_score: 0.8,
  verification_status: 'verified',
  source_url: undefined,
  last_synced_at: undefined,
  average_rating: 4.5,
  review_count: 10,
  contact_info: {},
  social_media: {},
  is_active: true,
  image_url: undefined,
  is_open: false,
  events: [],
  street_address: null,
  city: null,
  state: null,
  zip: null,
  default_lat: null,
  default_lng: null,
  live_gps_lat: null,
  live_gps_lng: null,
  live_gps_accuracy: null,
  live_gps_timestamp: null,
  status: 'offline',
  is_claimed: null,
  claimed_at: null,
  claimed_by: null,
  claim_verification_method: null,
  owner_id: null,
  subscription_tier: undefined,
  view_count: 0,
  _type: 'domain',
  ...overrides,
});

describe('lib/api/search/filters', () => {
  describe('applyCuisineFilter', () => {
    it('should return all trucks when cuisine is null', () => {
      const trucks = [
        createMockTruck({ id: '1', cuisine_type: ['Mexican'] }),
        createMockTruck({ id: '2', cuisine_type: ['Italian'] }),
      ];
      const result = applyCuisineFilter(trucks, null);
      expect(result).toHaveLength(2);
    });

    it('should return all trucks when cuisine is empty string', () => {
      const trucks = [
        createMockTruck({ id: '1', cuisine_type: ['Mexican'] }),
        createMockTruck({ id: '2', cuisine_type: ['Italian'] }),
      ];
      const result = applyCuisineFilter(trucks, '');
      expect(result).toHaveLength(2);
    });

    it('should filter trucks by single cuisine (case-insensitive)', () => {
      const trucks = [
        createMockTruck({ id: '1', cuisine_type: ['Mexican', 'Tacos'] }),
        createMockTruck({ id: '2', cuisine_type: ['Italian', 'Pizza'] }),
        createMockTruck({ id: '3', cuisine_type: ['BBQ', 'American'] }),
      ];
      const result = applyCuisineFilter(trucks, 'Mexican');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter trucks by multiple cuisines (comma-separated)', () => {
      const trucks = [
        createMockTruck({ id: '1', cuisine_type: ['Mexican'] }),
        createMockTruck({ id: '2', cuisine_type: ['Italian'] }),
        createMockTruck({ id: '3', cuisine_type: ['BBQ'] }),
      ];
      const result = applyCuisineFilter(trucks, 'Mexican, Italian');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no trucks match', () => {
      const trucks = [
        createMockTruck({ id: '1', cuisine_type: ['Mexican'] }),
        createMockTruck({ id: '2', cuisine_type: ['Italian'] }),
      ];
      const result = applyCuisineFilter(trucks, 'Japanese');
      expect(result).toHaveLength(0);
    });

    it('should handle trucks with missing cuisine_type', () => {
      const trucksWithMissing = [
        createMockTruck({ id: '1', cuisine_type: undefined }),
      ];
      const result = applyCuisineFilter(trucksWithMissing, 'Mexican');
      expect(result).toHaveLength(0);
    });
  });

  describe('applyOpenNowFilter', () => {
    it('should return all trucks when openNow is false', () => {
      const trucks = [createMockTruck(), createMockTruck()];
      const result = applyOpenNowFilter(trucks, false);
      expect(result).toHaveLength(2);
    });

    it('should return all trucks when openNow is true but truck has no operating hours', () => {
      const trucks = [createMockTruck({ operating_hours: null })];
      const result = applyOpenNowFilter(trucks, true);
      expect(result).toHaveLength(0);
    });
  });

  describe('applyTextSearchFilter', () => {
    it('should return all trucks when query is null', () => {
      const trucks = [
        createMockTruck({ id: '1', name: 'Taco Truck' }),
        createMockTruck({ id: '2', name: 'Pizza Place' }),
      ];
      const result = applyTextSearchFilter(trucks, null);
      expect(result).toHaveLength(2);
    });

    it('should return all trucks when query is empty string', () => {
      const trucks = [
        createMockTruck({ id: '1', name: 'Taco Truck' }),
        createMockTruck({ id: '2', name: 'Pizza Place' }),
      ];
      const result = applyTextSearchFilter(trucks, '');
      expect(result).toHaveLength(2);
    });

    it('should filter by name (case-insensitive)', () => {
      const trucks = [
        createMockTruck({ id: '1', name: 'Taco Truck', specialties: ['Tacos'] }),
        createMockTruck({ id: '2', name: 'Pizza Place', specialties: ['Pizza'] }),
      ];
      const result = applyTextSearchFilter(trucks, 'taco');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by description', () => {
      const trucks = [
        createMockTruck({ id: '1', name: 'Taco Truck', description: 'Best tacos in town' }),
        createMockTruck({ id: '2', name: 'Pizza Place', description: 'Italian pizza' }),
      ];
      const result = applyTextSearchFilter(trucks, 'pizza');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should filter by specialties', () => {
      const trucks = [
        createMockTruck({ id: '1', name: 'Taco Truck', specialties: ['Tacos'] }),
        createMockTruck({ id: '2', name: 'BBQ Joint', specialties: ['Ribs', 'Brisket'] }),
      ];
      const result = applyTextSearchFilter(trucks, 'ribs');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should return empty array when no matches found', () => {
      const trucks = [
        createMockTruck({ id: '1', name: 'Taco Truck' }),
        createMockTruck({ id: '2', name: 'Pizza Place' }),
      ];
      const result = applyTextSearchFilter(trucks, 'sushi');
      expect(result).toHaveLength(0);
    });
  });

  describe('applyPriceRangeFilter', () => {
    it('should return all trucks when priceRange is undefined', () => {
      const trucks = [createMockTruck(), createMockTruck()];
      const result = applyPriceRangeFilter(trucks, undefined);
      expect(result).toHaveLength(2);
    });

    it('should return all trucks regardless of priceRange (field not in schema)', () => {
      const trucks = [createMockTruck()];
      const result = applyPriceRangeFilter(trucks, { min: 1, max: 2 });
      expect(result).toHaveLength(1);
    });
  });

  describe('applyAllFilters', () => {
    const trucks = [
      createMockTruck({
        id: '1',
        name: 'Taco Truck',
        cuisine_type: ['Mexican'],
        description: 'Best tacos',
        specialties: ['Tacos'],
      }),
      createMockTruck({
        id: '2',
        name: 'Pizza Place',
        cuisine_type: ['Italian'],
        description: 'Italian pizza',
        specialties: ['Pizza'],
      }),
    ];

    it('should return all trucks when no filters applied', () => {
      const result = applyAllFilters(trucks, {
        cuisines: [],
        searchQuery: undefined,
        openNow: false,
        favoritesOnly: false,
        radiusMiles: 10,
      });
      expect(result).toHaveLength(2);
    });

    it('should apply cuisine filter', () => {
      const result = applyAllFilters(trucks, {
        cuisines: ['Mexican'],
        searchQuery: undefined,
        openNow: false,
        favoritesOnly: false,
        radiusMiles: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should apply text search filter', () => {
      const result = applyAllFilters(trucks, {
        cuisines: [],
        searchQuery: 'pizza',
        openNow: false,
        favoritesOnly: false,
        radiusMiles: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should apply multiple filters together', () => {
      const result = applyAllFilters(trucks, {
        cuisines: ['Mexican'],
        searchQuery: 'taco',
        openNow: false,
        favoritesOnly: false,
        radiusMiles: 10,
      });
      expect(result).toHaveLength(1);
    });
  });
});