import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const getEventsForCityOrThrow = jest.fn<() => Promise<unknown[]>>();
const cachedLoaders: (() => Promise<unknown>)[] = [];

jest.unstable_mockModule('@/lib/events/eventPageData', () => ({ getEventsForCityOrThrow }));
jest.unstable_mockModule('next/cache', () => ({
  unstable_cache: (loader: () => Promise<unknown>) => {
    cachedLoaders.push(loader);
    return loader;
  },
}));

const { getCityPageEvents } = await import('@/lib/city/cityEvents.server');

describe('getCityPageEvents', () => {
  beforeEach(() => {
    getEventsForCityOrThrow.mockReset();
    cachedLoaders.length = 0;
  });

  it('lets a failed lookup reject inside the cache so it is not stored, and shows no events', async () => {
    getEventsForCityOrThrow.mockRejectedValue(new Error('City events query failed: timeout'));
    await expect(getCityPageEvents('augusta-ga', 'Augusta', 'GA')).resolves.toEqual({
      total: 0,
      upcoming: [],
    });
    await expect(cachedLoaders[0]?.()).rejects.toThrow('City events query failed');
  });

  it('returns the first events with their city event paths', async () => {
    getEventsForCityOrThrow.mockResolvedValue([
      {
        id: 'e1',
        title: 'Food Truck Friday',
        eventStartDate: '2026-11-06',
        eventEndDate: null,
        locationAddress: null,
      },
    ]);
    const result = await getCityPageEvents('augusta-ga', 'Augusta', 'GA');
    expect(result.total).toBe(1);
    expect(result.upcoming[0]?.path).toMatch(/^\/events\/augusta-ga\/food-truck-friday/);
  });
});
