import type { PublicFoodTruck } from '@/lib/types';
import { isPublicTruckListCandidate } from '@/lib/api/trucks/eligibility';
import { calculateDistance } from '@/lib/utils/geoUtils';

export interface NearbyTruckLocation {
  lat: number;
  lng: number;
}

export const TEST_TRUCK_PATTERN = /\btest\b/i;

export function isTestTruckName(name: string | null | undefined): boolean {
  return TEST_TRUCK_PATTERN.test(name ?? '');
}

export function isFeaturedPublicTruck(truck: PublicFoodTruck): boolean {
  if (isTestTruckName(truck.name)) return false;
  return isPublicTruckListCandidate(truck);
}

function getDistanceMiles(
  truck: PublicFoodTruck,
  location: NearbyTruckLocation | undefined,
): number | undefined {
  if (!location) return undefined;

  const truckLocation = truck.current_location;
  if (
    truckLocation !== null &&
    truckLocation !== undefined &&
    typeof truckLocation.lat === 'number' &&
    typeof truckLocation.lng === 'number'
  ) {
    return calculateDistance(location.lat, location.lng, truckLocation.lat, truckLocation.lng);
  }

  return undefined;
}

export function filterFeaturedTrucksByDistance(
  trucks: readonly PublicFoodTruck[],
  location: NearbyTruckLocation | undefined,
  radiusMiles: number,
): PublicFoodTruck[] {
  if (!location) return [...trucks];
  if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) return [];

  return trucks.filter((truck) => {
    const distanceMiles = getDistanceMiles(truck, location);
    return typeof distanceMiles === 'number' && distanceMiles <= radiusMiles;
  });
}
