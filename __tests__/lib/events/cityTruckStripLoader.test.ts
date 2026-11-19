/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const getCachedPublicTruckCatalog = jest.fn<() => Promise<unknown[]>>();
const logError = jest.fn();

jest.unstable_mockModule('@/lib/services/publicTruckData.server', () => ({
  getCachedPublicTruckCatalog,
}));

jest.unstable_mockModule('@/lib/logging', () => ({
  logError,
  logMessage: jest.fn(),
  logWarning: jest.fn(),
}));

const { loadCityTruckStrip } = await import('@/lib/events/cityTruckStrip.server');

describe('loadCityTruckStrip', () => {
  beforeEach(() => {
    getCachedPublicTruckCatalog.mockReset();
    logError.mockReset();
  });

  it('builds the strip from the catalog', async () => {
    getCachedPublicTruckCatalog.mockResolvedValue([
      {
        id: 't1',
        name: 'Taco Spot',
        slug: 'taco-spot',
        city: 'Augusta',
        state: 'GA',
        photo_url: 'https://example.com/t1.jpg',
        data_quality_score: 90,
      },
    ]);

    const strip = await loadCityTruckStrip('Augusta', 'GA');

    expect(strip.totalInCity).toBe(1);
    expect(strip.trucks.map((truck) => truck.slug)).toEqual(['taco-spot']);
  });

  it('returns an empty strip and logs when the catalog load fails', async () => {
    getCachedPublicTruckCatalog.mockRejectedValue(new Error('rpc down'));

    const strip = await loadCityTruckStrip('Augusta', 'GA');

    expect(strip).toEqual({ trucks: [], totalInCity: 0 });
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
