import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import { convertToDomain } from '@/lib/utils/foodTruckUtils';
import { isViableTruck, calculateDistance, isTruckOpen } from '@/lib/utils/foodTruckHelpers';
import { hasValidCoordinates } from '@/lib/services/activeLocation';
import { resolveMapCoordinates } from '@/lib/services/mapCoordinates';

export type DistanceFilterable = (FoodTruck | FoodTruckDomain) & {
  distance_miles?: number | null;
};

export function isWithinRadius(
  truck: DistanceFilterable,
  userLocation: { lat: number; lng: number },
  radiusMiles: number,
): boolean {
  if (typeof truck.distance_miles === 'number' && Number.isFinite(truck.distance_miles)) {
    return truck.distance_miles <= radiusMiles;
  }

  const location = resolveMapCoordinates(truck);
  if (!hasValidCoordinates(location)) {
    return false;
  }

  return (
    calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng) <=
    radiusMiles
  );
}

export function filterByViability(trucks: FoodTruck[]): FoodTruck[] {
  return trucks.filter((truck) => {
    const truckDomain = convertToDomain(truck);
    return isViableTruck(truckDomain);
  });
}

export function filterByDistance(
  trucks: FoodTruck[],
  userLocation?: { lat: number; lng: number },
  radiusMiles?: number,
): FoodTruck[] {
  if (!userLocation || typeof radiusMiles !== 'number') {
    return trucks;
  }

  return trucks.filter((truck) => isWithinRadius(truck, userLocation, radiusMiles));
}

export function filterByPrice(trucks: FoodTruck[], priceRange?: number): FoodTruck[] {
  if (typeof priceRange !== 'number' || priceRange <= 0) {
    return trucks;
  }

  return trucks.filter((truck) => {
    if (!truck.price_range) {
      return false;
    }
    const truckPriceLevel = truck.price_range.length;
    return truckPriceLevel <= priceRange;
  });
}

export function filterByOpenNow(trucks: FoodTruck[], openNow?: boolean): FoodTruck[] {
  if (!openNow) {
    return trucks;
  }

  return trucks.filter((truck) => {
    const truckDomain = convertToDomain(truck);
    return isTruckOpen(truckDomain);
  });
}

export function filterBySearch(trucks: FoodTruck[], searchQuery?: string): FoodTruck[] {
  if (!searchQuery || searchQuery.trim() === '') {
    return trucks;
  }

  const query = searchQuery.toLowerCase();

  return trucks.filter((truck) => {
    const nameMatch = truck.name.toLowerCase().includes(query);
    const descriptionMatch = (truck.description ?? '').toLowerCase().includes(query);
    const cuisineMatch =
      Array.isArray(truck.cuisine_type) &&
      truck.cuisine_type.some((cuisine) => cuisine.toLowerCase().includes(query));

    const menuKeywords = truck.menu_keywords as string[] | undefined;
    const menuMatch =
      Array.isArray(menuKeywords) && menuKeywords.some((keyword) => keyword.includes(query));

    const emailVal = Array.isArray(truck.contact_info.email)
      ? truck.contact_info.email.join(', ')
      : truck.contact_info.email;
    const contactMatch =
      truck.contact_info &&
      (truck.contact_info.phone?.toLowerCase().includes(query) ||
        emailVal?.toLowerCase().includes(query) ||
        truck.contact_info.website?.toLowerCase().includes(query));

    const socialMatch =
      truck.social_media &&
      (truck.social_media.facebook?.toLowerCase().includes(query) ||
        truck.social_media.instagram?.toLowerCase().includes(query));

    const locationMatch =
      truck.current_location && truck.current_location.address?.toLowerCase().includes(query);

    return (
      nameMatch ||
      descriptionMatch ||
      cuisineMatch ||
      menuMatch ||
      contactMatch ||
      socialMatch ||
      locationMatch
    );
  });
}
