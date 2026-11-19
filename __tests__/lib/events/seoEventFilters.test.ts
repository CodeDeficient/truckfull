import { describe, expect, it } from '@jest/globals';
import { getUpcomingEventFilters } from '@/lib/events/seoEventFilters';

describe('getUpcomingEventFilters', () => {
  it('returns the shared event-page eligibility contract', () => {
    expect(getUpcomingEventFilters(new Date('2026-07-22T12:00:00Z'))).toEqual({
      today: '2026-07-22',
      horizon: '2027-07-22',
      isFoodTruckRelevant: true,
      isHidden: false,
      minimumVettingScore: 30,
    });
  });
});
