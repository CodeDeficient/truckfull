import { jest } from '@jest/globals';
import { FoursquareService } from '@/lib/poi/foursquare';

globalThis.fetch = jest.fn();

describe('FoursquareService', () => {
  const mockApiKey = 'test-foursquare-api-key';

  beforeEach(() => {
    (globalThis.fetch as jest.Mock).mockClear();
    process.env.FOURSQUARE_API_KEY = mockApiKey;
  });

  afterEach(() => {
    delete process.env.FOURSQUARE_API_KEY;
  });

  describe('searchVenues', () => {
    it('should successfully retrieve venues by location', async () => {
      const mockVenues = {
        results: [
          {
            fsq_id: 'venue1',
            name: 'Taco Truck',
            location: {
              address: '123 Main St',
              locality: 'San Francisco',
              region: 'CA',
              postcode: '94102',
              country: 'US',
              formatted_address: '123 Main St, San Francisco, CA 94102',
            },
            geocodes: {
              main: {
                latitude: 37.7749,
                longitude: -122.4194,
              },
            },
            categories: [
              {
                id: 12345,
                name: 'Food Truck',
                icon: {
                  prefix: 'https://example.com/',
                  suffix: 'icon.png',
                },
              },
            ],
          },
        ],
        context: {
          region: {
            id: 'region1',
            name: 'San Francisco Bay Area',
          },
        },
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVenues,
        headers: {
          get: jest.fn(() => null),
        },
      });

      const service = new FoursquareService();
      const result = await service.searchVenues({
        latitude: 37.7749,
        longitude: -122.4194,
      });

      if (!result.success) {
        console.error('Test failed with error:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.venues).toHaveLength(1);
      expect(result.data?.venues[0].name).toBe('Taco Truck');
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.foursquare.com/v3/places/search'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: mockApiKey,
          }),
        }),
      );
    });

    it('should filter venues by category', async () => {
      const mockVenues = {
        results: [
          {
            fsq_id: 'venue1',
            name: 'Burger Joint',
            categories: [
              {
                id: 13377,
                name: 'Burger Joint',
              },
            ],
          },
          {
            fsq_id: 'venue2',
            name: 'Coffee Shop',
            categories: [
              {
                id: 11134,
                name: 'Coffee Shop',
              },
            ],
          },
        ],
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVenues,
        headers: {
          get: jest.fn(() => null),
        },
      });

      const service = new FoursquareService();
      const result = await service.searchVenues({
        latitude: 37.7749,
        longitude: -122.4194,
        categories: ['13377'],
      });

      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('categories=13377'),
        expect.anything(),
      );
    });

    it('should handle API errors gracefully', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
          error_detail: 'Invalid API key',
        }),
      });

      const service = new FoursquareService();
      const result = await service.searchVenues({
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const service = new FoursquareService();
      const result = await service.searchVenues({
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle missing API key', async () => {
      delete process.env.FOURSQUARE_API_KEY;

      const service = new FoursquareService();
      const result = await service.searchVenues({
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('FOURSQUARE_API_KEY');
    });
  });

  describe('getVenueDetails', () => {
    it('should successfully retrieve venue details', async () => {
      const mockVenue = {
        fsq_id: 'venue1',
        name: 'Taco Truck',
        location: {
          address: '123 Main St',
          locality: 'San Francisco',
          region: 'CA',
          postcode: '94102',
          country: 'US',
          formatted_address: '123 Main St, San Francisco, CA 94102',
        },
        geocodes: {
          main: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
        },
        categories: [
          {
            id: 12345,
            name: 'Food Truck',
            icon: {
              prefix: 'https://example.com/',
              suffix: 'icon.png',
            },
          },
        ],
        rating: 8.5,
        stats: {
          total_ratings: 150,
        },
        hours: {
          status: 'Open now',
          is_local_holiday: false,
        },
        tel: '+14155551234',
        website: 'https://www.tacotruck.example.com',
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVenue,
        headers: {
          get: jest.fn(() => null),
        },
      });

      const service = new FoursquareService();
      const result = await service.getVenueDetails('venue1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Taco Truck');
      expect(result.data?.rating).toBe(8.5);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.foursquare.com/v3/places/venue1'),
        expect.anything(),
      );
    });

    it('should handle venue not found error', async () => {
      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Not Found',
          error_detail: 'Venue not found',
        }),
      });

      const service = new FoursquareService();
      const result = await service.getVenueDetails('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('pagination', () => {
    it('should support pagination with limit and offset', async () => {
      const mockVenues = {
        results: [
          { fsq_id: 'venue1', name: 'Venue 1' },
          { fsq_id: 'venue2', name: 'Venue 2' },
        ],
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVenues,
        headers: {
          get: jest.fn(() => null),
        },
      });

      const service = new FoursquareService();
      const result = await service.searchVenues({
        latitude: 37.7749,
        longitude: -122.4194,
        limit: 10,
        offset: 20,
      });

      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.anything(),
      );
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=20'),
        expect.anything(),
      );
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limit headers', async () => {
      const mockVenues = { results: [] };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVenues,
        headers: {
          get: (name: string) => {
            if (name === 'X-RateLimit-Remaining') return '4900';
            if (name === 'X-RateLimit-Limit') return '5000';
            return null;
          },
        },
      });

      const service = new FoursquareService();
      await service.searchVenues({
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(service.getRateLimitStatus()).toEqual({
        remaining: 4900,
        limit: 5000,
      });
    });
  });

  describe('radius filtering', () => {
    it('should support radius parameter in search', async () => {
      const mockVenues = { results: [] };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVenues,
        headers: {
          get: jest.fn(() => null),
        },
      });

      const service = new FoursquareService();
      await service.searchVenues({
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 1000,
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('radius=1000'),
        expect.anything(),
      );
    });
  });

  describe('search with query', () => {
    it('should support search query string', async () => {
      const mockVenues = {
        results: [
          {
            fsq_id: 'venue1',
            name: 'Taco Truck',
          },
        ],
      };

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVenues,
        headers: {
          get: jest.fn(() => null),
        },
      });

      const service = new FoursquareService();
      const result = await service.searchVenues({
        latitude: 37.7749,
        longitude: -122.4194,
        query: 'tacos',
      });

      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('query=tacos'),
        expect.anything(),
      );
    });
  });
});
