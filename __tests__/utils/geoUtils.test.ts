import { calculateDistance } from '@/lib/utils/geoUtils';

describe('calculateDistance', () => {
  it('should return 0 for the same point', () => {
    const distance = calculateDistance(33.5, -81.8, 33.5, -81.8);
    expect(distance).toBe(0);
  });

  it('should calculate distance correctly between Augusta GA and Atlanta GA (~145 miles)', () => {
    // Augusta GA: 33.4735, -81.9748
    // Atlanta GA: 33.749, -84.388
    const distance = calculateDistance(33.4735, -81.9748, 33.749, -84.388);
    // Should be approximately 140-150 miles
    expect(distance).toBeGreaterThan(130);
    expect(distance).toBeLessThan(160);
  });

  it('should calculate distance correctly for short distances (~1 mile)', () => {
    // Two points about 1 mile apart in Augusta GA
    const distance = calculateDistance(33.4735, -81.9748, 33.4735 + 0.0145, -81.9748);
    // 0.0145 degrees latitude ≈ 1 mile
    expect(distance).toBeGreaterThan(0.9);
    expect(distance).toBeLessThan(1.1);
  });

  it('should handle negative coordinates', () => {
    // Test with southern/western hemisphere coordinates
    const distance = calculateDistance(-33.8688, 151.2093, -34.0522, 151.2093);
    // Sydney to ~12 miles south
    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(15);
  });
});
