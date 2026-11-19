import { describe, expect, it } from '@jest/globals';
import { resolveMapCoordinates } from '@/lib/services/mapCoordinates';
import { fromDomainToFoodTruck, fromFoodTruckRow } from '@/lib/mappers/domain';
import type { FoodTruckMapperInput } from '@/lib/mappers/domain';

describe('map coordinates for trucks with address-only current_location', () => {
  it.each(['live', 'offline'] as const)(
    'places the %s truck at its saved coordinates',
    (status) => {
      const row = {
        id: 'address-only-truck',
        name: 'Sample Vegan Kitchen',
        status,
        current_location: { address: 'Graniteville, SC' },
        default_lat: 33.5886699,
        default_lng: -81.7734359,
        live_gps_lat: 33.588725,
        live_gps_lng: -81.7733545,
        contact_info: {},
        social_media: {},
        menu: [],
        distance_miles: 14.23,
      } as FoodTruckMapperInput;
      const truck = fromDomainToFoodTruck(fromFoodTruckRow(row));
      expect(resolveMapCoordinates(truck)).toEqual(
        status === 'live'
          ? { lng: row.live_gps_lng, lat: row.live_gps_lat }
          : { lng: row.default_lng, lat: row.default_lat },
      );
    },
  );

  it('rejects missing coordinates rather than inventing a map position', () => {
    const truck = fromDomainToFoodTruck(
      fromFoodTruckRow({
        id: 'no-location',
        name: 'No Location',
        current_location: { address: 'Address only' },
        contact_info: {},
        social_media: {},
        menu: [],
      } as FoodTruckMapperInput),
    );
    expect(resolveMapCoordinates(truck)).toEqual({ lat: undefined, lng: undefined });
  });

  it('uses valid defaults when a live GPS pair is invalid', () => {
    const truck = fromDomainToFoodTruck(
      fromFoodTruckRow({
        id: 'invalid-gps',
        name: 'Invalid GPS',
        status: 'live',
        current_location: { address: 'Address only' },
        live_gps_lat: Infinity,
        live_gps_lng: -81.7,
        default_lat: 0,
        default_lng: 0,
        contact_info: {},
        social_media: {},
        menu: [],
      } as FoodTruckMapperInput),
    );
    expect(resolveMapCoordinates(truck)).toEqual({ lat: 0, lng: 0 });
  });
});
