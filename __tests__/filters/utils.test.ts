import { describe, it, expect } from '@jest/globals';
import {
  parseBooleanParam,
  parseNumberParam,
  parseArrayParam,
  parseLocationParams,
  serializeArrayParam,
  hasActiveFilters,
  countActiveFilters,
  getFilterSummary,
  mergeWithDefaults,
  sanitizeFilters,
  calculateDistance,
} from '@/lib/filters/utils';
import { DEFAULT_FILTERS } from '@/lib/filters/types';
import type { FiltersState } from '@/lib/filters/types';

describe('lib/filters/utils', () => {
  describe('parseBooleanParam', () => {
    it('should return undefined for null', () => {
      expect(parseBooleanParam(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseBooleanParam(undefined)).toBeUndefined();
    });

    it('should return true for "1"', () => {
      expect(parseBooleanParam('1')).toBe(true);
    });

    it('should return true for "true"', () => {
      expect(parseBooleanParam('true')).toBe(true);
    });

    it('should return false for "0"', () => {
      expect(parseBooleanParam('0')).toBe(false);
    });

    it('should return false for "false"', () => {
      expect(parseBooleanParam('false')).toBe(false);
    });
  });

  describe('parseNumberParam', () => {
    it('should return undefined for null', () => {
      expect(parseNumberParam(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(parseNumberParam(undefined)).toBeUndefined();
    });

    it('should parse valid number string', () => {
      expect(parseNumberParam('42')).toBe(42);
    });

    it('should parse decimal number string', () => {
      expect(parseNumberParam('3.14')).toBe(3.14);
    });

    it('should return undefined for NaN string', () => {
      expect(parseNumberParam('abc')).toBeUndefined();
    });
  });

  describe('parseArrayParam', () => {
    it('should return empty array for null', () => {
      expect(parseArrayParam(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(parseArrayParam(undefined)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseArrayParam('')).toEqual([]);
    });

    it('should split comma-separated values', () => {
      expect(parseArrayParam('Mexican,Italian,BBQ')).toEqual(['Mexican', 'Italian', 'BBQ']);
    });

    it('should filter empty strings', () => {
      expect(parseArrayParam('Mexican,,Italian,')).toEqual(['Mexican', 'Italian']);
    });
  });

  describe('parseLocationParams', () => {
    it('should return undefined for null lat', () => {
      expect(parseLocationParams(null, '-122.4194')).toBeUndefined();
    });

    it('should return undefined for null lng', () => {
      expect(parseLocationParams('37.7749', null)).toBeUndefined();
    });

    it('should return undefined for empty string lat', () => {
      expect(parseLocationParams('', '-122.4194')).toBeUndefined();
    });

    it('should return undefined for invalid lat', () => {
      expect(parseLocationParams('invalid', '-122.4194')).toBeUndefined();
    });

    it('should return undefined for lat out of range', () => {
      expect(parseLocationParams('91', '-122.4194')).toBeUndefined();
    });

    it('should return undefined for lng out of range', () => {
      expect(parseLocationParams('37.7749', '181')).toBeUndefined();
    });

    it('should parse valid coordinates', () => {
      const result = parseLocationParams('37.7749', '-122.4194');
      expect(result).toEqual({ lat: 37.7749, lng: -122.4194 });
    });

    it('should handle negative coordinates', () => {
      const result = parseLocationParams('-33.8688', '-151.2093');
      expect(result).toEqual({ lat: -33.8688, lng: -151.2093 });
    });
  });

  describe('serializeArrayParam', () => {
    it('should return empty string for empty array', () => {
      expect(serializeArrayParam([])).toBe('');
    });

    it('should join values with comma', () => {
      expect(serializeArrayParam(['Mexican', 'Italian'])).toBe('Mexican,Italian');
    });

    it('should filter empty strings', () => {
      expect(serializeArrayParam(['Mexican', '', 'Italian'])).toBe('Mexican,Italian');
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false for default filters', () => {
      expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    });

    it('should return true when favoritesOnly is true', () => {
      const filters = { ...DEFAULT_FILTERS, favoritesOnly: true };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when cuisines is not empty', () => {
      const filters = { ...DEFAULT_FILTERS, cuisines: ['Mexican'] };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when searchQuery is set', () => {
      const filters = { ...DEFAULT_FILTERS, searchQuery: 'tacos' };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when openNow is true', () => {
      const filters = { ...DEFAULT_FILTERS, openNow: true };
      expect(hasActiveFilters(filters)).toBe(true);
    });
  });

  describe('countActiveFilters', () => {
    it('should return 0 for default filters', () => {
      expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    });

    it('should count favoritesOnly', () => {
      const filters = { ...DEFAULT_FILTERS, favoritesOnly: true };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('should count cuisines', () => {
      const filters = { ...DEFAULT_FILTERS, cuisines: ['Mexican', 'Italian'] };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('should count searchQuery', () => {
      const filters = { ...DEFAULT_FILTERS, searchQuery: 'tacos' };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('should count openNow', () => {
      const filters = { ...DEFAULT_FILTERS, openNow: true };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('should count priceRange', () => {
      const filters = { ...DEFAULT_FILTERS, priceRange: 2 };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('should count multiple filters', () => {
      const filters = {
        ...DEFAULT_FILTERS,
        favoritesOnly: true,
        cuisines: ['Mexican'],
        searchQuery: 'tacos',
        openNow: true,
      };
      expect(countActiveFilters(filters)).toBe(4);
    });
  });

  describe('getFilterSummary', () => {
    it('should return empty array for default filters', () => {
      expect(getFilterSummary(DEFAULT_FILTERS)).toEqual([]);
    });

    it('should include "Favorites only"', () => {
      const filters = { ...DEFAULT_FILTERS, favoritesOnly: true };
      expect(getFilterSummary(filters)).toContain('Favorites only');
    });

    it('should say "Mexican cuisine" for single cuisine', () => {
      const filters = { ...DEFAULT_FILTERS, cuisines: ['Mexican'] };
      expect(getFilterSummary(filters)).toContain('Mexican cuisine');
    });

    it('should say "2 cuisines" for multiple cuisines', () => {
      const filters = { ...DEFAULT_FILTERS, cuisines: ['Mexican', 'Italian'] };
      expect(getFilterSummary(filters)).toContain('2 cuisines');
    });

    it('should include search query with quotes', () => {
      const filters = { ...DEFAULT_FILTERS, searchQuery: 'tacos' };
      expect(getFilterSummary(filters)).toContain('"tacos"');
    });

    it('should include "Open now"', () => {
      const filters = { ...DEFAULT_FILTERS, openNow: true };
      expect(getFilterSummary(filters)).toContain('Open now');
    });

    it('should include radius when non-default', () => {
      const filters = { ...DEFAULT_FILTERS, radiusMiles: 10 };
      expect(getFilterSummary(filters)).toContain('Within 10 miles');
    });
  });

  describe('mergeWithDefaults', () => {
    it('should return default filters when partial is empty', () => {
      const result = mergeWithDefaults({});
      expect(result).toEqual(DEFAULT_FILTERS);
    });

    it('should override specific fields', () => {
      const result = mergeWithDefaults({ cuisines: ['Mexican'] });
      expect(result.cuisines).toEqual(['Mexican']);
      expect(result.favoritesOnly).toBe(DEFAULT_FILTERS.favoritesOnly);
    });
  });

  describe('sanitizeFilters', () => {
    it('should return empty object for empty input', () => {
      expect(sanitizeFilters({})).toEqual({});
    });

    it('should sanitize favoritesOnly as boolean', () => {
      const result = sanitizeFilters({ favoritesOnly: 'yes' as unknown as boolean });
      expect(result.favoritesOnly).toBe(true);
    });

    it('should sanitize cuisines as array of strings', () => {
      const result = sanitizeFilters({ cuisines: ['Mexican', 'Italian'] });
      expect(result.cuisines).toEqual(['Mexican', 'Italian']);
    });

    it('should filter non-string items from cuisines', () => {
      const result = sanitizeFilters({ cuisines: ['Mexican', 123, 'Italian'] as unknown as string[] });
      expect(result.cuisines).toEqual(['Mexican', 'Italian']);
    });

    it('should sanitize valid radius', () => {
      const result = sanitizeFilters({ radiusMiles: 25 });
      expect(result.radiusMiles).toBe(25);
    });

    it('should ignore radius out of valid range', () => {
      const result = sanitizeFilters({ radiusMiles: 150 });
      expect(result.radiusMiles).toBeUndefined();
    });

    it('should ignore negative radius', () => {
      const result = sanitizeFilters({ radiusMiles: -5 });
      expect(result.radiusMiles).toBeUndefined();
    });

    it('should sanitize valid location', () => {
      const result = sanitizeFilters({ userLocation: { lat: 37.7749, lng: -122.4194 } });
      expect(result.userLocation).toEqual({ lat: 37.7749, lng: -122.4194 });
    });

    it('should ignore location with invalid lat', () => {
      const result = sanitizeFilters({ userLocation: { lat: 100, lng: -122.4194 } });
      expect(result.userLocation).toBeUndefined();
    });

    it('should ignore location with invalid lng', () => {
      const result = sanitizeFilters({ userLocation: { lat: 37.7749, lng: 200 } });
      expect(result.userLocation).toBeUndefined();
    });

    it('should truncate search query to 100 chars', () => {
      const longQuery = 'a'.repeat(150);
      const result = sanitizeFilters({ searchQuery: longQuery });
      expect(result.searchQuery).toHaveLength(100);
    });

    it('should trim search query', () => {
      const result = sanitizeFilters({ searchQuery: '  tacos  ' });
      expect(result.searchQuery).toBe('tacos');
    });

    it('should ignore empty search query after trim', () => {
      const result = sanitizeFilters({ searchQuery: '   ' });
      expect(result.searchQuery).toBeUndefined();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two locations', () => {
      const loc1 = { lat: 37.7749, lng: -122.4194 };
      const loc2 = { lat: 34.0522, lng: -118.2437 };
      const distance = calculateDistance(loc1, loc2);
      expect(distance).toBeGreaterThan(300);
      expect(distance).toBeLessThan(400);
    });

    it('should return 0 for same location', () => {
      const loc = { lat: 37.7749, lng: -122.4194 };
      const distance = calculateDistance(loc, loc);
      expect(distance).toBe(0);
    });
  });
});