import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getIpLocation } from '@/lib/location/ipLocation';

const mockFetch = jest.fn<typeof global.fetch>();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
});

describe('getIpLocation', () => {
  it('returns lat/lng/source from the ip-location endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lat: 33.47, lng: -82.01, city: 'Augusta', country: 'US', source: 'fallback' }),
    } as Response);

    const result = await getIpLocation();

    expect(result).toEqual({ lat: 33.47, lng: -82.01, city: 'Augusta' });
    expect(mockFetch).toHaveBeenCalledWith('/api/geo/ip-location');
  });

  it('returns a null city when the edge reports it as Unknown', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ lat: 33.75, lng: -84.39, city: 'Unknown', source: 'cf-geo' }),
    } as Response);

    const result = await getIpLocation();

    expect(result).toEqual({ lat: 33.75, lng: -84.39, city: null });
  });

  it('returns null when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await getIpLocation();

    expect(result).toBeNull();
  });

  it('returns null when response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await getIpLocation();

    expect(result).toBeNull();
  });

    it('returns null when lat/lng are NaN', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ lat: NaN, lng: NaN, source: 'fallback' }),
      } as Response);

      const result = await getIpLocation();

      expect(result).toBeNull();
    });

    it('returns null when lat/lng are missing from response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ city: 'Augusta' }),
    } as Response);

    const result = await getIpLocation();

    expect(result).toBeNull();
  });
});
