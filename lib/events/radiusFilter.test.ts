import { describe, it, expect } from '@jest/globals';
import { haversineMiles, filterByRadius, formatRadius } from '@/lib/events/radiusFilter';

describe('haversineMiles', () => {
  it('returns 0 for same coordinates', () => {
    expect(haversineMiles(33.4735, -82.0105, 33.4735, -82.0105)).toBe(0);
  });

  it('calculates distance between Augusta, GA and Columbia, SC (~70mi)', () => {
    const dist = haversineMiles(33.4735, -82.0105, 34.0007, -81.0348);
    expect(dist).toBeGreaterThan(60);
    expect(dist).toBeLessThan(80);
  });

  it('calculates distance between Augusta, GA and Atlanta, GA (~140mi)', () => {
    const dist = haversineMiles(33.4735, -82.0105, 33.749, -84.388);
    expect(dist).toBeGreaterThan(130);
    expect(dist).toBeLessThan(160);
  });

  it('is symmetric (A to B equals B to A)', () => {
    const a = haversineMiles(33.0, -82.0, 35.0, -81.0);
    const b = haversineMiles(35.0, -81.0, 33.0, -82.0);
    expect(a).toBeCloseTo(b, 10);
  });

  it('handles crossing the equator', () => {
    const dist = haversineMiles(-1.0, 36.0, 1.0, 36.0);
    expect(dist).toBeGreaterThan(130);
    expect(dist).toBeLessThan(150);
  });
});

describe('filterByRadius', () => {
  const originLat = 33.4735;
  const originLng = -82.0105;

  it('includes events within radius', () => {
    const events = [
      { id: '1', location_data: { lat: 33.48, lng: -82.02 } },
      { id: '2', location_data: { lat: 33.49, lng: -82.03 } },
    ] as Array<{ id: string; location_data: { lat: number; lng: number } }>;

    const result = filterByRadius(events, originLat, originLng, 50);
    expect(result).toHaveLength(2);
  });

  it('excludes events outside radius', () => {
    const events = [
      { id: 'nearby', location_data: { lat: 33.48, lng: -82.02 } },
      { id: 'far', location_data: { lat: 33.749, lng: -84.388 } },
    ] as Array<{ id: string; location_data: { lat: number; lng: number } }>;

    const result = filterByRadius(events, originLat, originLng, 50);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('nearby');
  });

  it('returns empty array for empty input', () => {
    expect(filterByRadius([], originLat, originLng, 50)).toHaveLength(0);
  });

  it('includes events with null location_data in result', () => {
    const events = [
      { id: '1', location_data: { lat: 33.48, lng: -82.02 } },
      { id: '2', location_data: null },
      { id: '3', location_data: { lat: null, lng: -82.02 } as unknown as { lat: number; lng: number } },
    ] as Array<{ id: string; location_data: { lat: number; lng: number } | null }>;

    const result = filterByRadius(events, originLat, originLng, 50);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns all events when radius is 0 (no filter)', () => {
    const events = [
      { id: '1', location_data: { lat: 33.48, lng: -82.02 } },
      { id: '2', location_data: { lat: 33.749, lng: -84.388 } },
    ] as Array<{ id: string; location_data: { lat: number; lng: number } }>;

    const result = filterByRadius(events, originLat, originLng, 0);
    expect(result).toHaveLength(2);
  });
});

describe('formatRadius', () => {
  it('formats small values as plain miles', () => {
    expect(formatRadius(5)).toBe('5 mi');
    expect(formatRadius(50)).toBe('50 mi');
    expect(formatRadius(250)).toBe('250 mi');
  });

  it('formats values >= 1000 with k suffix', () => {
    expect(formatRadius(1000)).toBe('1k mi');
    expect(formatRadius(2500)).toBe('2.5k mi');
  });

  it('formats round thousands without decimals', () => {
    expect(formatRadius(2000)).toBe('2k mi');
  });
});
