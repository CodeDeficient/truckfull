import { describe, expect, it } from '@jest/globals';
import {
  buildCuisineTruckLists,
  findNearbyTrucks,
  type RawTruck,
} from '@/lib/truck-profile/relatedTrucks';
const createRawTruck = (id: string): RawTruck =>
  ({ id, name: id, cuisine_type: ['BBQ'] }) as RawTruck;
it('caps cuisine truck lists at twenty rows', () => {
  const rows = Array.from({ length: 21 }, (_, index) => createRawTruck(`${index}`));
  expect(buildCuisineTruckLists([{ cuisine: 'BBQ', rows }], null, '')[0].trucks).toHaveLength(20);
});

const at = (id: string, lat: number, lng: number): RawTruck =>
  ({ id, name: id, current_location: { lat, lng } }) as RawTruck;

describe('findNearbyTrucks', () => {
  const origin = { lat: 33.4735, lng: -82.0105 };

  it('returns trucks within twenty miles, nearest first, without the current truck', () => {
    const rows = [
      at('far', 33.95, -83.38),
      at('mid', 33.56, -81.72),
      at('self', 33.4735, -82.0105),
      at('near', 33.48, -82.02),
    ];
    const nearby = findNearbyTrucks(rows, origin, 'self');
    expect(nearby.map((truck) => truck.id)).toEqual(['near', 'mid']);
    expect(nearby[0].distanceMiles).toBeLessThan(1);
  });

  it('skips trucks without coordinates and breaks distance ties by id', () => {
    const rows = [
      { id: 'none', name: 'none', current_location: null } as RawTruck,
      at('b', 33.48, -82.02),
      at('a', 33.48, -82.02),
    ];
    expect(findNearbyTrucks(rows, origin, '').map((truck) => truck.id)).toEqual(['a', 'b']);
  });

  it('maps photo_url onto each related truck', () => {
    const rows = [{ ...at('a', 33.48, -82.02), photo_url: 'https://example.com/a.jpg' } as RawTruck];
    expect(findNearbyTrucks(rows, origin, '')[0].photoUrl).toBe('https://example.com/a.jpg');
  });

  it('caps the list at twenty trucks', () => {
    const rows = Array.from({ length: 25 }, (_, index) => at(`t${index}`, 33.48, -82.02));
    expect(findNearbyTrucks(rows, origin, '')).toHaveLength(20);
  });
});
