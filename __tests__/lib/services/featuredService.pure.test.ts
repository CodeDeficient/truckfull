import { describe, expect, it } from '@jest/globals';
import {
  scoreFeaturedTruckAt,
  sortFeaturedByRecency,
  type FeaturedTruckCandidate,
} from '@/lib/services/featuredService.logic';

const NOW = Date.parse('2026-06-15T12:00:00.000Z');

const truck = (
  overrides: Partial<FeaturedTruckCandidate>,
): FeaturedTruckCandidate => ({ id: 'truck-id', name: 'Test Truck', ...overrides });

describe('featured scoring edge cases', () => {
  it('uses deterministic scores for claim states', () => {
    expect(scoreFeaturedTruckAt(truck({ is_claimed: false }), NOW)).toBe(0);
    expect(scoreFeaturedTruckAt(truck({ is_claimed: true, claimed_at: null }), NOW)).toBe(10);
    expect(scoreFeaturedTruckAt(truck({ is_claimed: true, claimed_at: 'not-a-date' }), NOW)).toBe(1);
  });

  it('does not mutate input while sorting', () => {
    const trucks = [
      truck({ id: 'unclaimed', is_claimed: false }),
      truck({ id: 'claimed', is_claimed: true, claimed_at: '2026-06-14T12:00:00.000Z' }),
    ];
    expect(sortFeaturedByRecency(trucks, NOW).map(({ id }) => id)).toEqual(['claimed', 'unclaimed']);
    expect(trucks.map(({ id }) => id)).toEqual(['unclaimed', 'claimed']);
  });
});
