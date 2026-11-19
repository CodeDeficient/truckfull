import { describe, expect, it } from '@jest/globals';
import {
  hasValidCoordinates,
  resolveActiveLocation,
  type ActiveLocationTruck,
} from '@/lib/services/activeLocation';

const base: ActiveLocationTruck = {
  current_location: { lat: 33.4735, lng: -82.0105, address: 'Augusta, GA' },
};

const overrideToday: NonNullable<ActiveLocationTruck['current_day_location']> = {
  lat: 33.4817723,
  lng: -81.9792202,
  address: '8th and Reynolds St',
  city: 'Augusta',
  state: 'GA',
};

describe('hasValidCoordinates', () => {
  it('accepts finite in-range coordinates', () => {
    expect(hasValidCoordinates({ lat: 33.4, lng: -82.0 })).toBe(true);
  });

  it('rejects null, non-finite, and out-of-range coordinates', () => {
    expect(hasValidCoordinates(null)).toBe(false);
    expect(hasValidCoordinates({ lat: Number.NaN, lng: -82 })).toBe(false);
    expect(hasValidCoordinates({ lat: 91, lng: -82 })).toBe(false);
    expect(hasValidCoordinates({ lat: 33, lng: -181 })).toBe(false);
  });
});

describe('resolveActiveLocation', () => {
  it('prefers today’s override location when it carries coordinates', () => {
    const resolved = resolveActiveLocation({ ...base, current_day_location: overrideToday });
    expect(resolved).toEqual(overrideToday);
  });

  it('falls back to the base location when the override has no coordinates', () => {
    const resolved = resolveActiveLocation({
      ...base,
      current_day_location: { ...overrideToday, lat: undefined, lng: undefined },
    });
    expect(resolved).toEqual(base.current_location);
  });

  it('falls back to the base location on a plain day (no override)', () => {
    expect(resolveActiveLocation(base)).toEqual(base.current_location);
  });

  it('falls back to default coordinates when no location object is available', () => {
    expect(resolveActiveLocation({ default_lat: 34.1, default_lng: -80.9 })).toEqual({
      lat: 34.1,
      lng: -80.9,
    });
  });

  it('returns null when only an invalid coordinate set exists', () => {
    expect(
      resolveActiveLocation({
        current_location: null,
        current_day_location: { lat: Number.NaN, lng: -82 },
      }),
    ).toBeNull();
  });

  it('falls back when the override is only a fuzzy words-only landmark', () => {
    const resolved = resolveActiveLocation({
      ...base,
      current_day_location: { address: 'Forsyth Park' },
    });
    expect(resolved).toEqual(base.current_location);
  });
});
