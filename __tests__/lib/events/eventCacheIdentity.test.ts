import { describe, expect, it } from '@jest/globals';
import {
  EVENT_INDEX_PATH,
  EVENT_SECONDARY_REVALIDATE_SECONDS,
  eventCanonicalPath,
  eventCityCacheTag,
  eventCityPath,
  eventDetailCacheTag,
  eventNearbyCitiesCacheTag,
} from '@/lib/events/eventCacheIdentity';

describe('event cache identities', () => {
  it('builds a canonical detail path from the public route slugs', () => {
    expect(eventCanonicalPath('augusta-ga', 'food-fest-2026-05-01')).toBe(
      '/events/augusta-ga/food-fest-2026-05-01',
    );
  });

  it('builds a city listing path from the city slug', () => {
    expect(eventCityPath('augusta-ga')).toBe('/events/augusta-ga');
  });

  it('keeps the events index path constant', () => {
    expect(EVENT_INDEX_PATH).toBe('/events');
  });

  it('keeps detail, city-list, and nearby cache tags independent', () => {
    expect(eventDetailCacheTag('augusta-ga', 'food-fest-2026-05-01')).toBe(
      'event-detail:augusta-ga:food-fest-2026-05-01',
    );
    expect(eventCityCacheTag('Augusta', 'GA')).toBe('event-city:augusta:ga');
    expect(eventNearbyCitiesCacheTag('event-1')).toBe('event-nearby:event-1');
  });

  it('uses a 180-day fallback only for secondary event-page data', () => {
    expect(EVENT_SECONDARY_REVALIDATE_SECONDS).toBe(180 * 24 * 60 * 60);
  });
});
