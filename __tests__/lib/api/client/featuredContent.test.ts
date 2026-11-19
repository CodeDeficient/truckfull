import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  buildFeaturedContentRequest,
  fetchFeaturedContentData,
} from '@/lib/api/client/featuredContent';
import type { PublicFoodTruck } from '@/lib/types';

function publicTruck(overrides: Partial<PublicFoodTruck> = {}): PublicFoodTruck {
  return {
    id: 'truck-id',
    name: 'Test Truck',
    slug: 'test-truck',
    description: 'Test truck',
    created_at: '2026-06-15T00:00:00.000Z',
    contact_info: {},
    social_media: {},
    cuisine_type: ['BBQ'],
    verification_status: 'verified',
    data_quality_score: 0.8,
    ...overrides,
  } as PublicFoodTruck;
}

describe('featured content API client', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('builds a featured-content request without location', () => {
    expect(buildFeaturedContentRequest(undefined, 30)).toEqual({
      url: '/api/featured-content?radius=30',
    });
  });

  it('builds a featured-content request with location and radius', () => {
    const { url } = buildFeaturedContentRequest({ lat: 33.75, lng: -84.39 }, 300);
    expect(url).toContain('/api/featured-content?');
    expect(url).toContain('lat=33.75');
    expect(url).toContain('lng=-84.39');
    expect(url).toContain('radius=300');
  });

  it('fetches featured and trending content from the dedicated endpoint', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        featuredTrucks: [
          {
            ...publicTruck({ id: 'featured-1' }),
            score: 100,
            rating: 4.8,
            image_url: 'https://example.com/featured.jpg',
          },
        ],
        trendingItems: [
          {
            id: 'trending-1',
            name: 'Trending Truck',
            rank: 1,
            image: 'https://example.com/trending.jpg',
            truck: publicTruck({ id: 'trending-1', name: 'Trending Truck' }),
          },
        ],
      }),
    })) as unknown as typeof fetch;

    globalThis.fetch = fetchMock;

    const result = await fetchFeaturedContentData({ lat: 33.75, lng: -84.39 }, 300);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = (fetchMock.mock.calls[0]?.[0] as string) ?? '';
    expect(calledUrl).toContain('/api/featured-content?');
    expect(calledUrl).toContain('lat=33.75');
    expect(calledUrl).toContain('lng=-84.39');
    expect(calledUrl).toContain('radius=300');
    expect(result.featuredTrucks.map(({ id }) => id)).toEqual(['featured-1']);
    expect(result.trendingItems.map(({ id }) => id)).toEqual(['trending-1']);
  });

  it('throws when the featured-content response is not ok', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: 'service unavailable' }),
    })) as unknown as typeof fetch;

    await expect(fetchFeaturedContentData(undefined, 30)).rejects.toThrow(/status 503/);
  });
});
