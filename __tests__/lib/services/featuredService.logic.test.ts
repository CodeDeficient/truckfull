import { describe, expect, it } from '@jest/globals';
import {
  buildFeaturedTrucks,
  buildTrendingItems,
  scoreFeaturedTruckAt,
  sortFeaturedByRecency,
  type FeaturedTruckCandidate,
} from '@/lib/services/featuredService.logic';
import {
  filterFeaturedTrucksByDistance,
  isFeaturedPublicTruck,
} from '@/lib/api/client/trucks';
import type { PublicFoodTruck } from '@/lib/types';

const NOW = Date.parse('2026-06-15T12:00:00.000Z');

function candidate(overrides: Partial<FeaturedTruckCandidate>): FeaturedTruckCandidate {
  return {
    id: 'truck-id',
    name: 'Acme Food Truck',
    ...overrides,
  };
}

function publicTruck(overrides: Partial<PublicFoodTruck>): PublicFoodTruck {
  return {
    id: 'truck-id',
    name: 'Acme Food Truck',
    slug: 'acme-food-truck',
    description: 'Acme food truck',
    created_at: '2026-06-15T00:00:00.000Z',
    current_location: { lat: 33.75, lng: -84.39 },
    cuisine_type: ['BBQ'],
    data_quality_score: 0.8,
    verification_status: 'verified',
    ...overrides,
  } as PublicFoodTruck;
}

describe('featured truck behavior', () => {
  it('keeps only public-eligible trucks for featured content', () => {
    expect(isFeaturedPublicTruck(publicTruck({ verification_status: 'verified' }))).toBe(true);
    expect(isFeaturedPublicTruck(publicTruck({ verification_status: 'pending' }))).toBe(true);
    expect(isFeaturedPublicTruck(publicTruck({ verification_status: 'unverified' }))).toBe(true);
    expect(isFeaturedPublicTruck(publicTruck({ verification_status: 'staging' }))).toBe(true);
    expect(isFeaturedPublicTruck(publicTruck({ verification_status: 'shadowbanned' }))).toBe(false);
    expect(isFeaturedPublicTruck(publicTruck({ data_quality_score: -1 }))).toBe(false);
    expect(isFeaturedPublicTruck(publicTruck({ data_quality_score: undefined }))).toBe(false);
  });

  it('excludes trucks with test names from featured content', () => {
    expect(isFeaturedPublicTruck(publicTruck({ name: 'Test Truck' }))).toBe(false);
    expect(isFeaturedPublicTruck(publicTruck({ name: 'Saturday Market Test Truck' }))).toBe(false);
    expect(isFeaturedPublicTruck(publicTruck({ name: 'test truck lowercase' }))).toBe(false);
    expect(isFeaturedPublicTruck(publicTruck({ name: 'My TEST Food Truck' }))).toBe(false);
    expect(isFeaturedPublicTruck(publicTruck({ name: 'Sample Vegan Kitchen' }))).toBe(true);
    expect(isFeaturedPublicTruck(publicTruck({ name: 'Laziza Street Eats' }))).toBe(true);
  });

  it('applies the user-selected radius without the API query cap', () => {
    const trucks = [
      publicTruck({ id: 'near', current_location: { lat: 33.75, lng: -84.39 } }),
      publicTruck({ id: 'far', current_location: { lat: 40.71, lng: -74.01 } }),
    ];

    expect(
      filterFeaturedTrucksByDistance(trucks, { lat: 33.749, lng: -84.388 }, 300).map(({ id }) => id),
    ).toEqual(['near']);
  });

  it('scores recent claims above old claims without using the system clock', () => {
    const recent = scoreFeaturedTruckAt(
      candidate({ is_claimed: true, claimed_at: '2026-06-14T12:00:00.000Z' }),
      NOW,
    );
    const old = scoreFeaturedTruckAt(
      candidate({ is_claimed: true, claimed_at: '2026-05-20T12:00:00.000Z' }),
      NOW,
    );

    expect(recent).toBeGreaterThan(old);
  });

  it('sorts claimed trucks ahead of unclaimed trucks deterministically', () => {
    const trucks = [
      candidate({ id: 'unclaimed', is_claimed: false, updated_at: '2026-06-15T00:00:00.000Z' }),
      candidate({ id: 'older', is_claimed: true, claimed_at: '2026-06-01T00:00:00.000Z' }),
      candidate({ id: 'newer', is_claimed: true, claimed_at: '2026-06-14T00:00:00.000Z' }),
    ];

    expect(sortFeaturedByRecency(trucks, NOW).map(({ id }) => id)).toEqual([
      'newer',
      'older',
      'unclaimed',
    ]);
  });

  it('builds featured from all trucks sorted by claim recency (no Pro filter)', () => {
    const trucks = [
      candidate({
        id: 'claimed-pro',
        is_claimed: true,
        claimed_at: '2026-06-14T00:00:00.000Z',
        subscription_tier: 'pro',
      }),
      candidate({
        id: 'free-truck',
        is_claimed: true,
        claimed_at: '2026-06-10T00:00:00.000Z',
        subscription_tier: 'free',
      }),
      candidate({
        id: 'older-pro',
        is_claimed: true,
        claimed_at: '2026-06-01T00:00:00.000Z',
        subscription_tier: 'pro',
      }),
    ];

    const featured = buildFeaturedTrucks(trucks, 5, NOW);

    expect(featured.map(({ id }) => id)).toEqual(['claimed-pro', 'free-truck', 'older-pro']);
  });

  it('builds trending from all trucks sorted by view_count (no Pro filter)', () => {
    const trucks = [
      candidate({ id: 'popular', is_claimed: false, view_count: 100 }),
      candidate({ id: 'claimed', is_claimed: true, claimed_at: '2026-06-14T00:00:00.000Z', view_count: 10 }),
    ];

    expect(buildTrendingItems(trucks, 5).map(({ id }) => id)).toEqual([
      'popular',
      'claimed',
    ]);
  });

  it('does not mutate the input array while sorting trending trucks', () => {
    const trucks = [
      candidate({ id: 'first', view_count: 1 }),
      candidate({ id: 'second', view_count: 2 }),
    ];

    buildTrendingItems(trucks, 5);

    expect(trucks.map(({ id }) => id)).toEqual(['first', 'second']);
  });
});
