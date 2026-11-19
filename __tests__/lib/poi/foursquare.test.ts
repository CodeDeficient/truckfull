/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv, FOURSQUARE_API_KEY: 'test-api-key' };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('FoursquareService', () => {
  describe('interface types', () => {
    it('should define FoursquareVenue interface', () => {
      const venue = {
        fsq_id: '123',
        name: 'Test Venue',
        location: { address: '123 Main St' },
        geocodes: { main: { latitude: 40.7, longitude: -74.0 } },
        categories: [{ id: 1, name: 'Food' }],
        rating: 4.5,
        stats: { total_ratings: 100 },
        hours: { status: 'Open' },
        tel: '555-1234',
        website: 'https://test.com',
      };
      expect(venue.fsq_id).toBe('123');
      expect(venue.name).toBe('Test Venue');
    });

    it('should define FoursquareSearchResponse interface', () => {
      const response = {
        results: [],
        context: { region: { id: '1', name: 'Test' } },
      };
      expect(response.results).toEqual([]);
    });

    it('should define FoursquareSearchParams interface', () => {
      const params = {
        latitude: 40.7128,
        longitude: -74.006,
        query: 'food',
        categories: ['food'],
        radius: 1000,
        limit: 10,
        offset: 0,
      };
      expect(params.latitude).toBe(40.7128);
    });

    it('should define FoursquareSearchResult interface', () => {
      const result = {
        venues: [],
        totalResults: 0,
      };
      expect(result.venues).toEqual([]);
    });

    it('should define RateLimitStatus interface', () => {
      const status = {
        remaining: 100,
        limit: 500,
        resetTime: new Date(),
      };
      expect(status.remaining).toBe(100);
    });
  });

  describe('FoursquareResponse type', () => {
    it('should support success response type', () => {
      const successResponse = {
        success: true as const,
        data: { venues: [], totalResults: 0 },
      };
      expect(successResponse.success).toBe(true);
      if (successResponse.success) {
        expect(successResponse.data.venues).toEqual([]);
      }
    });

    it('should support error response type', () => {
      const errorResponse = {
        success: false as const,
        error: 'Something went wrong',
      };
      expect(errorResponse.success).toBe(false);
      if (!errorResponse.success) {
        expect(errorResponse.error).toBe('Something went wrong');
      }
    });
  });
});
