import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildNearbyBoundingBox,
  selectNearbyCities,
  type NearbyEventRow,
} from '@/lib/events/nearbyCities';

const ORIGIN = { lat: 33.75, lng: -84.39 };
const SOURCE = readFileSync(resolve(process.cwd(), 'lib/events/nearbyCities.ts'), 'utf8');

function event(overrides: Partial<NearbyEventRow> = {}): NearbyEventRow {
  return {
    city: 'Savannah',
    state: 'GA',
    location_lat: 32.08,
    location_lng: -81.09,
    ...overrides,
  };
}

describe('buildNearbyBoundingBox', () => {
  it('clamps latitude at the poles and removes longitude bounds there', () => {
    const box = buildNearbyBoundingBox(89.9, 0, 30);

    expect(box.minLat).toBeGreaterThanOrEqual(-90);
    expect(box.maxLat).toBe(90);
    expect(box.longitude).toBeNull();
  });

  it('keeps a wrapped longitude range explicit', () => {
    const box = buildNearbyBoundingBox(0, 179.9, 30);

    expect(box.longitude?.wrapsAntimeridian).toBe(true);
    expect(box.longitude?.min).toBeGreaterThan(0);
    expect(box.longitude?.max).toBeLessThan(0);
  });

  it('uses the poleward edge when calculating high-latitude longitude bounds', () => {
    const originLat = 80;
    const radiusMiles = 60;
    const box = buildNearbyBoundingBox(originLat, 0, radiusMiles);
    const polewardLat = originLat + radiusMiles / 69;
    const expectedDelta = radiusMiles / (69.172 * Math.cos((polewardLat * Math.PI) / 180));

    expect(box.longitude?.max).toBeCloseTo(expectedDelta, 6);
  });
});

describe('selectNearbyCities', () => {
  it('excludes the current city only when both city and state match', () => {
    const rows = [
      event({
        city: 'Springfield',
        state: 'GA',
        location_lat: ORIGIN.lat,
        location_lng: ORIGIN.lng,
      }),
      event({
        city: 'Springfield',
        state: 'IL',
        location_lat: ORIGIN.lat,
        location_lng: ORIGIN.lng,
      }),
    ];

    const result = selectNearbyCities(rows, ORIGIN, 'springfield', 'ga', 30);

    expect(result).toMatchObject([{ city: 'Springfield', state: 'IL', slug: 'springfield-il' }]);
  });

  it('keeps the closest event distance for each city and sorts deterministically', () => {
    const rows = [
      event({ city: 'B City', state: 'GA', location_lat: 33.8, location_lng: -84.39 }),
      event({ city: 'A City', state: 'GA', location_lat: 33.8, location_lng: -84.39 }),
      event({ city: 'B City', state: 'GA', location_lat: 33.76, location_lng: -84.39 }),
    ];

    const result = selectNearbyCities(rows, ORIGIN, 'Atlanta', 'GA', 30);

    expect(result.map((city) => city.city)).toEqual(['B City', 'A City']);
    expect(result[0]?.minimumDistance).toBeLessThan(result[1]?.minimumDistance ?? 0);
  });

  it('rejects rows outside the radius and rows without coordinates', () => {
    const rows = [
      event({ city: 'Far City', location_lat: 34.5, location_lng: -84.39 }),
      event({ city: 'Unknown City', location_lat: null, location_lng: null }),
    ];

    expect(selectNearbyCities(rows, ORIGIN, 'Atlanta', 'GA', 30)).toEqual([]);
  });
});

describe('event page nearby-city reads', () => {
  it('shares nearby-city results between metadata and page rendering', () => {
    expect(SOURCE).toMatch(/export const getNearbyCities = cache\(getCachedNearbyCities\);/);
  });

  it('uses the approved 180-day fallback instead of hourly regeneration', () => {
    expect(SOURCE).not.toMatch(/NEARBY_CITIES_REVALIDATE_SECONDS\s*=\s*3600/);
    expect(SOURCE).toMatch(/revalidate:\s*EVENT_SECONDARY_REVALIDATE_SECONDS/);
    expect(SOURCE).toMatch(/eventNearbyCitiesCacheTag\(eventId\)/);
    expect(SOURCE).toMatch(/EVENT_NEARBY_CITIES_CACHE_TAG/);
  });
});
