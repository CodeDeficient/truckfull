import { describe, it, expect } from '@jest/globals';
import { calculateDistance } from '../../../lib/utils/location';

describe('calculateDistance', () => {
  it('should return 0 for same coordinates', () => {
    const result = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
    expect(result).toBe(0);
  });

  it('should calculate distance between New York and Los Angeles approximately', () => {
    const result = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(result).toBeCloseTo(2446, 0);
  });

  it('should calculate distance between London and Paris approximately', () => {
    const result = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(result).toBeCloseTo(213, 0);
  });

  it('should handle negative latitudes (southern hemisphere)', () => {
    const result = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(result).toBeCloseTo(443, 0);
  });

  it('should handle crossing the equator', () => {
    const result = calculateDistance(10, 0, -10, 0);
    expect(result).toBeGreaterThan(0);
  });

  it('should be symmetric (A to B equals B to A)', () => {
    const distance1 = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
    const distance2 = calculateDistance(34.0522, -118.2437, 40.7128, -74.006);
    expect(distance1).toBeCloseTo(distance2, 10);
  });

  it('should handle crossing the international date line', () => {
    const result = calculateDistance(35.6762, 139.6503, 35.6762, -139.6503);
    expect(result).toBeGreaterThan(0);
  });

  it('should handle very small distances', () => {
    const result = calculateDistance(40.7128, -74.006, 40.7129, -74.006);
    expect(result).toBeLessThan(0.01);
  });

  it('should return positive values only', () => {
    const result = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(result).toBeGreaterThan(0);
  });
});