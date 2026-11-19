import type { FoodTruck, FoodTruckDomain, PublicFoodTruck } from '@/lib/types';
import { CachedFoodTruckService } from '@/lib/performance/databaseCache';
import { toPublicFoodTruck } from '@/lib/mappers/publicView';
import { toPublicTruckList } from '@/lib/mappers/publicListView';
import { isPublicTruckListCandidate } from '@/lib/api/trucks/eligibility';

/**
 * Retrieves and filters food trucks based on specified location and radius.
 * @example
 * getAndFilterFoodTrucks("37.7749", "-122.4194", "5")
 * [FoodTruckDomain, FoodTruckDomain, FoodTruckDomain]
 * @param {string | null} lat - Latitude of the user's location.
 * @param {string | null} lng - Longitude of the user's location.
 * @param {string | null} radius - Search radius in kilometers.
 * @returns {Promise<FoodTruckDomain[]>} List of food trucks within the specified location and radius.
 * @description
 *   - Parses latitude, longitude, and radius from strings to floats for calculations.
 *   - If latitude or longitude are not provided, fetches all cached food trucks.
 *   - Defaults radius to 10 kilometers if not provided.
 */
export async function getAndFilterFoodTrucks(
  lat: string | null,
  lng: string | null,
  radius: string | null,
): Promise<FoodTruckDomain[]> {
  let trucks: FoodTruckDomain[] = [];

  if (lat != undefined && lng != undefined) {
    const userLat = Number.parseFloat(lat);
    const userLng = Number.parseFloat(lng);
    const radiusKm = Number.parseFloat(radius ?? '10');
    // Type assertion to convert FoodTruck[] to FoodTruckDomain[]
    trucks = (await CachedFoodTruckService.getTrucksByLocationCached(
      userLat,
      userLng,
      radiusKm,
    )) as unknown as FoodTruckDomain[];
  } else {
    const result = await CachedFoodTruckService.getAllTrucksCached();
    // Type assertion to convert FoodTruck[] to FoodTruckDomain[]
    trucks = result.trucks as unknown as FoodTruckDomain[];
  }
  return trucks;
}

export function sortFoodTrucksByQuality(trucks: FoodTruckDomain[]): FoodTruckDomain[] {
  return [...trucks].sort(
    (a: FoodTruckDomain, b: FoodTruckDomain) =>
      (b.data_quality_score ?? 0) - (a.data_quality_score ?? 0),
  );
}

export function toPublicSearchTrucks(trucks: readonly FoodTruckDomain[]): PublicFoodTruck[] {
  return toPublicTruckList(
    trucks
      .map((truck) => toPublicFoodTruck(truck as unknown as FoodTruck))
      .filter((truck) => isPublicTruckListCandidate(truck)),
  );
}
