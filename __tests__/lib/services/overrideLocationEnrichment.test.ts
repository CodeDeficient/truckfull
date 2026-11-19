import { describe, expect, it } from '@jest/globals';
import {
  enrichOverrideLocation,
  isGeocodableLocation,
  mergeCoordinatesIntoLocation,
  type OverrideGeocodeResult,
} from '@/lib/services/overrideLocationEnrichment';
import type { OverrideLocation } from '@/lib/services/scheduleOverride';

const located: OverrideLocation = {
  address: '8th and Reynolds St',
  city: 'Augusta',
  state: 'GA',
  fuzzy: false,
};

const geocoder = (result: Partial<OverrideGeocodeResult>) => async () => ({
  lat: 33.4735,
  lng: -82.0105,
  success: true,
  ...result,
});

describe('isGeocodableLocation', () => {
  it('accepts a concrete address without coordinates', () => {
    expect(isGeocodableLocation(located)).toBe(true);
  });

  it('rejects an already-geocoded location', () => {
    expect(isGeocodableLocation({ ...located, lat: 33.4735, lng: -82.0105 })).toBe(false);
  });

  it('rejects a fuzzy landmark reference', () => {
    expect(isGeocodableLocation({ ...located, fuzzy: true })).toBe(false);
  });

  it('rejects a location without a street address', () => {
    expect(isGeocodableLocation({ city: 'Augusta', state: 'GA', fuzzy: false })).toBe(false);
  });

  it('rejects null or blank locations', () => {
    expect(isGeocodableLocation(null)).toBe(false);
    expect(isGeocodableLocation({ address: '   ', fuzzy: false })).toBe(false);
  });
});

describe('mergeCoordinatesIntoLocation', () => {
  it('adds coordinates while preserving every descriptive field', () => {
    const merged = mergeCoordinatesIntoLocation(located, 33.4735, -82.0105);
    expect(merged).toEqual({ ...located, lat: 33.4735, lng: -82.0105 });
  });

  it('returns the location unchanged for non-finite coordinates', () => {
    expect(mergeCoordinatesIntoLocation(located, Number.NaN, -82.0105)).toEqual(located);
  });
});

describe('enrichOverrideLocation', () => {
  it('geocodes an eligible address and returns coordinates', async () => {
    const result = await enrichOverrideLocation(located, geocoder({}));
    expect(result).toEqual({ ...located, lat: 33.4735, lng: -82.0105 });
  });

  it('keeps the words-only location when geocoding fails', async () => {
    const result = await enrichOverrideLocation(
      located,
      geocoder({ success: false, lat: Number.NaN, lng: Number.NaN }),
    );
    expect(result).toEqual(located);
  });

  it('skips geocoding entirely for ineligible locations', async () => {
    let called = 0;
    const counting = async (): Promise<OverrideGeocodeResult> => {
      called += 1;
      return { lat: 0, lng: 0, success: true };
    };
    const fuzzy = { ...located, fuzzy: true };
    await enrichOverrideLocation(fuzzy, counting);
    await enrichOverrideLocation(null, counting);
    expect(called).toBe(0);
  });
});
