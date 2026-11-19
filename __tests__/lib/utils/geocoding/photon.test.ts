import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
const originalFetch = globalThis.fetch;

const { geocodeWithPhoton } = await import('@/lib/utils/geocoding/photon');

const PHOTON_RESPONSE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-81.0921, 32.079] },
      properties: {
        osm_type: 'R',
        osm_id: 119867,
        osm_key: 'place',
        osm_value: 'city',
        type: 'city',
        countrycode: 'US',
        name: 'Savannah',
        state: 'Georgia',
        country: 'United States',
      },
    },
  ],
};

describe('photon geocoder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('geocodeWithPhoton', () => {
    it('returns coordinates for a valid address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => PHOTON_RESPONSE,
      } as Response);

      const result = await geocodeWithPhoton('Savannah, GA');

      expect(result.success).toBe(true);
      expect(result.lat).toBeCloseTo(32.079, 3);
      expect(result.lng).toBeCloseTo(-81.0921, 3);
      expect(result.formatted_address).toContain('Savannah');
    });

    it('does not apply bias by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => PHOTON_RESPONSE,
      } as Response);

      await geocodeWithPhoton('123 Main St');

      const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
      expect(calledUrl.searchParams.get('lat')).toBeNull();
      expect(calledUrl.searchParams.get('lon')).toBeNull();
    });

    it('applies bias when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => PHOTON_RESPONSE,
      } as Response);

      await geocodeWithPhoton('123 Main St', { lat: 32.08, lng: -81.09 });

      const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
      expect(calledUrl.searchParams.get('lat')).toBe('32.08');
      expect(calledUrl.searchParams.get('lon')).toBe('-81.09');
    });

    it('returns failure for empty address', async () => {
      const result = await geocodeWithPhoton('');

      expect(result.success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns failure for whitespace-only address', async () => {
      const result = await geocodeWithPhoton('   ');

      expect(result.success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns failure when API returns empty features', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ type: 'FeatureCollection', features: [] }),
      } as Response);

      const result = await geocodeWithPhoton('xyznonexistentplace123');

      expect(result.success).toBe(false);
    });

    it('returns failure when API returns non-OK status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      const result = await geocodeWithPhoton('Savannah, GA');

      expect(result.success).toBe(false);
    });

    it('returns failure on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await geocodeWithPhoton('Savannah, GA');

      expect(result.success).toBe(false);
    });

    it('prefers house-level results over city-level', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [-81.088, 32.077] },
              properties: {
                osm_type: 'W',
                type: 'city',
                name: 'Savannah',
                countrycode: 'US',
              },
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [-81.0883, 32.0771] },
              properties: {
                osm_type: 'W',
                type: 'house',
                name: '123 State St',
                countrycode: 'US',
                city: 'Savannah',
              },
            },
          ],
        }),
      } as Response);

      const result = await geocodeWithPhoton('123 State Street, Savannah, GA');

      expect(result.success).toBe(true);
      expect(result.lat).toBeCloseTo(32.0771, 3);
      expect(result.lng).toBeCloseTo(-81.0883, 3);
    });

    it('uses location bias parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => PHOTON_RESPONSE,
      } as Response);

      await geocodeWithPhoton('Main St', { lat: 32.05, lng: -81.1 });

      const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
      expect(calledUrl.searchParams.get('lat')).toBe('32.05');
      expect(calledUrl.searchParams.get('lon')).toBe('-81.1');
    });

    it('limits results to configured number', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => PHOTON_RESPONSE,
      } as Response);

      await geocodeWithPhoton('Savannah, GA');

      const calledUrl = new URL(mockFetch.mock.calls[0][0] as string);
      expect(calledUrl.searchParams.get('limit')).toBeDefined();
    });
  });
});
