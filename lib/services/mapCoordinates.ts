import { hasValidCoordinates, resolveActiveLocation } from '@/lib/services/activeLocation';
import type { FoodTruck, FoodTruckDomain } from '@/lib/types';

export function resolveMapCoordinates(truck: FoodTruck | FoodTruckDomain): {
  lat: number | undefined;
  lng: number | undefined;
} {
  const gps = { lat: truck.live_gps_lat ?? undefined, lng: truck.live_gps_lng ?? undefined };
  const location =
    truck.status === 'live' && hasValidCoordinates(gps) ? gps : resolveActiveLocation(truck);
  return hasValidCoordinates(location)
    ? { lat: location.lat, lng: location.lng }
    : { lat: undefined, lng: undefined };
}
