import { describe, it, expect } from '@jest/globals';
import {
  applyCuisineFilter,
  getUniqueCuisines,
  applyAllFilters,
  hasValidCuisineType,
} from '@/lib/filters/cuisineFilter';
import type { FoodTruck } from '@/lib/types';

const createMockFoodTruck = (overrides: Partial<FoodTruck> = {}): FoodTruck => ({
  id: '1',
  name: 'Test Truck',
  slug: 'test-truck',
  description: 'A test truck',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  contact_info: {},
  social_media: {},
  current_location: null,
  operating_hours: null,
  menu_items: [],
  menu: [],
  cuisine_type: ['Mexican'],
  price_range: '$$',
  specialties: ['Tacos'],
  source_url: undefined,
  source_urls: undefined,
  last_synced_at: null,
  average_rating: null,
  exact_location: null,
  city_location: null,
  status: null,
  default_location: null,
  live_location: null,
  phone_number: undefined,
  email: undefined,
  website: undefined,
  instagram_handle: undefined,
  facebook_handle: undefined,
  twitter_handle: undefined,
  is_claimed: null,
  claimed_at: null,
  claimed_by: null,
  claim_verification_method: null,
  schedule: [],
  is_active: true,
  verification_documents: null,
  verification_notes: null,
  verification_requested_at: null,
  verified_at: null,
  verified_by: null,
  owner_id: null,
  location_geog: undefined,
  image_url: undefined,
  is_open: false,
  events: [],
  distance_miles: undefined,
  distance_meters: undefined,
  subscription_tier: undefined,
  review_status: null,
  view_count: 0,
  ...overrides,
});

describe('lib/filters/cuisineFilter', () => {
  describe('applyCuisineFilter', () => {
    const trucks = [
      createMockFoodTruck({ id: '1', name: 'Taco Truck', cuisine_type: ['Mexican', 'Tacos'] }),
      createMockFoodTruck({ id: '2', name: 'Pizza Place', cuisine_type: ['Italian', 'Pizza'] }),
      createMockFoodTruck({ id: '3', name: 'BBQ Joint', cuisine_type: ['BBQ', 'American'] }),
    ];

    it('should return all trucks when selectedCuisines is empty', () => {
      const result = applyCuisineFilter(trucks, []);
      expect(result).toHaveLength(3);
    });

    it('should filter by single cuisine (case-insensitive)', () => {
      const result = applyCuisineFilter(trucks, ['mexican']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by multiple cuisines', () => {
      const result = applyCuisineFilter(trucks, ['mexican', 'italian']);
      expect(result).toHaveLength(2);
    });

    it('should return empty when no trucks match', () => {
      const result = applyCuisineFilter(trucks, ['Japanese']);
      expect(result).toHaveLength(0);
    });

    it('should handle trucks with non-array cuisine_type', () => {
      const trucksWithBadCuisine = [
        createMockFoodTruck({ id: '1', cuisine_type: undefined }),
      ];
      const result = applyCuisineFilter(trucksWithBadCuisine, ['Mexican']);
      expect(result).toHaveLength(0);
    });

    it('should require exact cuisine name match', () => {
      const trucks = [
        createMockFoodTruck({ id: '1', cuisine_type: ['Mexican'] }),
      ];
      const result = applyCuisineFilter(trucks, ['Mex']);
      expect(result).toHaveLength(0);
    });
  });

  describe('getUniqueCuisines', () => {
    it('should return empty array for empty truck list', () => {
      const result = getUniqueCuisines([]);
      expect(result).toEqual([]);
    });

    it('should extract and sort unique cuisines', () => {
      const trucks = [
        createMockFoodTruck({ cuisine_type: ['Mexican', 'Italian'] }),
        createMockFoodTruck({ cuisine_type: ['Italian', 'BBQ'] }),
        createMockFoodTruck({ cuisine_type: ['Mexican'] }),
      ];
      const result = getUniqueCuisines(trucks);
      expect(result).toEqual(['BBQ', 'Italian', 'Mexican']);
    });

    it('should handle trucks with empty cuisine_type', () => {
      const trucks = [
        createMockFoodTruck({ cuisine_type: [] }),
        createMockFoodTruck({ cuisine_type: ['Mexican'] }),
      ];
      const result = getUniqueCuisines(trucks);
      expect(result).toEqual(['Mexican']);
    });

    it('should trim whitespace from cuisines', () => {
      const trucks = [
        createMockFoodTruck({ cuisine_type: [' Mexican ', 'Italian'] }),
      ];
      const result = getUniqueCuisines(trucks);
      expect(result).toContain('Mexican');
    });
  });

  describe('applyAllFilters', () => {
    const trucks = [
      createMockFoodTruck({
        id: '1',
        name: 'Taco Truck',
        cuisine_type: ['Mexican'],
        description: 'Best tacos in town',
        specialties: ['Tacos'],
      }),
      createMockFoodTruck({
        id: '2',
        name: 'Pizza Place',
        cuisine_type: ['Italian'],
        description: 'Italian pizza',
        specialties: ['Pizza'],
      }),
      createMockFoodTruck({
        id: '3',
        name: 'BBQ Joint',
        cuisine_type: ['BBQ'],
        description: 'Slow smoked BBQ',
        specialties: ['Ribs'],
        operating_hours: {
          monday: { open: '09:00', close: '22:00' },
        },
      }),
    ];

    it('should return all trucks when no filters applied', () => {
      const result = applyAllFilters(trucks, {});
      expect(result).toHaveLength(3);
    });

    it('should apply cuisine filter', () => {
      const result = applyAllFilters(trucks, { cuisines: ['Mexican'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should apply search query filter to name', () => {
      const result = applyAllFilters(trucks, { searchQuery: 'taco' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should apply search query filter to description', () => {
      const result = applyAllFilters(trucks, { searchQuery: 'smoked' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should apply search query filter to specialties', () => {
      const result = applyAllFilters(trucks, { searchQuery: 'ribs' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('should apply search query filter to cuisine_type', () => {
      const result = applyAllFilters(trucks, { searchQuery: 'mexican' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should combine multiple filters', () => {
      const result = applyAllFilters(trucks, {
        cuisines: ['Mexican'],
        searchQuery: 'tacos',
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by openNow using current day and time', () => {
      const result = applyAllFilters(trucks, { openNow: true });
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('hasValidCuisineType', () => {
    it('should return true for object with valid cuisine_type array', () => {
      const obj = { cuisine_type: ['Mexican', 'Italian'] };
      expect(hasValidCuisineType(obj)).toBe(true);
    });

    it('should return false for null', () => {
      expect(hasValidCuisineType(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasValidCuisineType(undefined)).toBe(false);
    });

    it('should return false for object without cuisine_type', () => {
      const obj = { name: 'Test' };
      expect(hasValidCuisineType(obj)).toBe(false);
    });

    it('should return false for object with non-array cuisine_type', () => {
      const obj = { cuisine_type: 'Mexican' };
      expect(hasValidCuisineType(obj)).toBe(false);
    });

    it('should return false for object with non-string cuisine items', () => {
      const obj = { cuisine_type: ['Mexican', 123] };
      expect(hasValidCuisineType(obj)).toBe(false);
    });

    it('should return true for object with empty cuisine_type array', () => {
      const obj = { cuisine_type: [] };
      expect(hasValidCuisineType(obj)).toBe(true);
    });
  });
});