import { describe, expect, it } from '@jest/globals';
import {
  INITIAL_RADIUS_MILES,
  needsBackgroundRadiusLoad,
  resolveInitialRadiusMiles,
  resolveMobileDefaultRadiusMiles,
  seedCoversSearch,
} from '@/lib/filters/nearbyLoadPlan';

describe('resolveInitialRadiusMiles', () => {
  it('caps the first fetch at the initial radius for a wide selection', () => {
    expect(resolveInitialRadiusMiles(300)).toBe(INITIAL_RADIUS_MILES);
  });

  it('keeps a selection smaller than the initial radius', () => {
    expect(resolveInitialRadiusMiles(10)).toBe(10);
  });

  it('uses the initial radius for an invalid selection', () => {
    expect(resolveInitialRadiusMiles(0)).toBe(INITIAL_RADIUS_MILES);
    expect(resolveInitialRadiusMiles(Number.NaN)).toBe(INITIAL_RADIUS_MILES);
  });
});

describe('needsBackgroundRadiusLoad', () => {
  it('requires a background load when the selection exceeds the initial radius', () => {
    expect(needsBackgroundRadiusLoad(300)).toBe(true);
  });

  it('does not require a background load when the selection fits the initial radius', () => {
    expect(needsBackgroundRadiusLoad(25)).toBe(false);
    expect(needsBackgroundRadiusLoad(10)).toBe(false);
  });
});

describe('resolveMobileDefaultRadiusMiles', () => {
  it('uses the maximal public radius when a truck is linked so far-away links stay reachable', () => {
    expect(resolveMobileDefaultRadiusMiles(true, 300)).toBe(300);
  });

  it('uses the tight initial radius for a normal mobile load', () => {
    expect(resolveMobileDefaultRadiusMiles(false, 300)).toBe(INITIAL_RADIUS_MILES);
  });
});

describe('seedCoversSearch', () => {
  const seed = { lat: 33.4728, lng: -82.0105, radiusMiles: 50, trucks: [{ id: 'a' }] };

  it('covers a search centered on the seed that fits its radius', () => {
    expect(seedCoversSearch(seed, { lat: 33.4728, lng: -82.0105 }, 25)).toBe(true);
    expect(seedCoversSearch(seed, { lat: 33.4728, lng: -82.0105 }, 50)).toBe(true);
  });

  it('covers a nearby search only while the whole circle stays inside the seed', () => {
    const tenMilesNorth = { lat: 33.4728 + 10 / 69.05, lng: -82.0105 };
    expect(seedCoversSearch(seed, tenMilesNorth, 25)).toBe(true);
    expect(seedCoversSearch(seed, tenMilesNorth, 45)).toBe(false);
  });

  it('does not cover a search in another city', () => {
    expect(seedCoversSearch(seed, { lat: 33.749, lng: -84.388 }, 25)).toBe(false);
  });

  it('does not cover a wider radius than the seed holds', () => {
    expect(seedCoversSearch(seed, { lat: 33.4728, lng: -82.0105 }, 100)).toBe(false);
  });

  it('does not cover anything without a usable seed or radius', () => {
    expect(seedCoversSearch(undefined, { lat: 33.4728, lng: -82.0105 }, 25)).toBe(false);
    expect(seedCoversSearch({ ...seed, trucks: [] }, { lat: 33.4728, lng: -82.0105 }, 25)).toBe(
      false,
    );
    expect(seedCoversSearch(seed, { lat: 33.4728, lng: -82.0105 }, 0)).toBe(false);
    expect(seedCoversSearch(seed, { lat: 33.4728, lng: -82.0105 }, Number.NaN)).toBe(false);
  });
});
