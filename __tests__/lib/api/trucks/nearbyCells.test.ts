/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';
import {
  NEARBY_CELL_PADDING_MILES,
  narrowToRadius,
  nearbyCell,
  paddedCellRadiusMiles,
} from '@/lib/api/trucks/nearbyCells';
import { haversineMiles } from '@/lib/events/radiusFilter';

const AUGUSTA = { lat: 33.4735, lng: -82.0105 };

function truckAt(id: string, lat: number, lng: number, cellMiles = 0): Record<string, unknown> {
  return {
    id,
    name: id,
    current_location: { lat, lng },
    distance_miles: cellMiles,
    distance_meters: cellMiles * 1609.34,
  };
}

describe('nearbyCell', () => {
  it('snaps nearby points to the same cell', () => {
    expect(nearbyCell(33.4735, -82.0105)).toEqual(nearbyCell(33.4912, -81.9811));
  });

  it('keeps every point within the padding of its cell center', () => {
    for (const [lat, lng] of [
      [33.449, -82.049],
      [33.551, -81.951],
      [47.649, -122.349],
      [25.751, -80.151],
    ]) {
      const cell = nearbyCell(lat, lng);
      expect(haversineMiles(lat, lng, cell.lat, cell.lng)).toBeLessThan(NEARBY_CELL_PADDING_MILES);
    }
  });
});

describe('paddedCellRadiusMiles', () => {
  it('widens the search by the cell padding', () => {
    expect(paddedCellRadiusMiles(25)).toBe(25 + NEARBY_CELL_PADDING_MILES);
  });

  it('rounds fractional radii up so they share a cache entry', () => {
    expect(paddedCellRadiusMiles(10.1)).toBe(11 + NEARBY_CELL_PADDING_MILES);
    expect(paddedCellRadiusMiles(10.111)).toBe(paddedCellRadiusMiles(10.9));
  });
});

describe('narrowToRadius', () => {
  it('drops trucks outside the radius from the real origin and recomputes distance', () => {
    const near = truckAt('near', 33.5, -82.0);
    const far = truckAt('far', 34.0, -82.0);

    const result = narrowToRadius([far, near], AUGUSTA, 10);

    expect(result.map((truck) => truck.id)).toEqual(['near']);
    const expected = haversineMiles(AUGUSTA.lat, AUGUSTA.lng, 33.5, -82.0);
    expect(result[0].distance_miles).toBeCloseTo(expected, 6);
    expect(result[0].distance_meters).toBeCloseTo(expected * 1609.344, 3);
  });

  it('sorts by distance from the real origin, then id', () => {
    const b = truckAt('b', 33.48, -82.0);
    const a = truckAt('a', 33.48, -82.0);
    const closer = truckAt('c', 33.474, -82.01);

    const result = narrowToRadius([b, a, closer], AUGUSTA, 25);

    expect(result.map((truck) => truck.id)).toEqual(['c', 'a', 'b']);
  });

  it('uses default coordinates when the current location is missing', () => {
    const truck = {
      id: 'd',
      name: 'd',
      current_location: null,
      default_lat: 33.5,
      default_lng: -82.0,
    };

    expect(narrowToRadius([truck], AUGUSTA, 10).map((row) => row.id)).toEqual(['d']);
  });

  it('keeps a truck without coordinates only when the cell distance proves it is inside', () => {
    const inside = { id: 'in', name: 'in', current_location: null, distance_miles: 3 };
    const unsure = { id: 'unsure', name: 'unsure', current_location: null, distance_miles: 8 };

    const result = narrowToRadius([inside, unsure], AUGUSTA, 10);

    expect(result.map((row) => row.id)).toEqual(['in']);
  });

  it('does not mutate cached rows', () => {
    const truck = Object.freeze(truckAt('frozen', 33.5, -82.0, 2));

    const result = narrowToRadius([truck], AUGUSTA, 10);

    expect(truck.distance_miles).toBe(2);
    expect(result[0]).not.toBe(truck);
  });
});
