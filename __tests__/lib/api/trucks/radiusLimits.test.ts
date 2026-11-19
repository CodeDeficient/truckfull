import {
  ANONYMOUS_MAX_RADIUS_MILES,
  SIGNED_IN_MAX_RADIUS_MILES,
  capRadiusMiles,
  maxRadiusMilesFor,
} from '@/lib/api/trucks/radiusLimits';

describe('radiusLimits', () => {
  it('allows anonymous visitors up to 50 miles', () => {
    expect(maxRadiusMilesFor(false)).toBe(50);
    expect(ANONYMOUS_MAX_RADIUS_MILES).toBe(50);
  });

  it('allows signed-in users up to 150 miles', () => {
    expect(maxRadiusMilesFor(true)).toBe(150);
    expect(SIGNED_IN_MAX_RADIUS_MILES).toBe(150);
  });

  it('caps an anonymous request above the limit', () => {
    expect(capRadiusMiles(300, false)).toBe(50);
  });

  it('caps a signed-in request above the limit', () => {
    expect(capRadiusMiles(10_000, true)).toBe(150);
  });

  it('keeps a request within the limit', () => {
    expect(capRadiusMiles(25, false)).toBe(25);
    expect(capRadiusMiles(100, true)).toBe(100);
  });
});
