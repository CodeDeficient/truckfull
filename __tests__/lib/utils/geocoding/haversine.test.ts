import { describe, it, expect } from '@jest/globals';
import { haversineDistance } from '@/lib/utils/geocoding/haversine';

describe('haversineDistance', () => {
  it('returns meters (not kilometers)', () => {
    const nycToLa = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(nycToLa).toBeGreaterThan(3_900_000);
    expect(nycToLa).toBeLessThan(4_000_000);
  });

  it('returns NaN for invalid coordinates', () => {
    expect(haversineDistance(NaN, 0, 0, 0)).toBeNaN();
    expect(haversineDistance(0, NaN, 0, 0)).toBeNaN();
    expect(haversineDistance(0, 0, Infinity, 0)).toBeNaN();
  });

  it('returns ~0 for same point', () => {
    const dist = haversineDistance(33.5, -82.2, 33.5, -82.2);
    expect(dist).toBeLessThan(1);
  });

  it('calculates short distance correctly (within Augusta GA)', () => {
    const downtown = haversineDistance(33.4710, -81.9646, 33.4820, -81.9800);
    expect(downtown).toBeGreaterThan(1000);
    expect(downtown).toBeLessThan(3000);
  });
});
