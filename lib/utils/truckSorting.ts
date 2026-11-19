/**
 * Centralized truck sorting utility
 *
 * Sort priority:
 * 1. Distance (primary - when user location available)
 * 2. Data quality: Gold (>=0.8) > Silver (>=0.5) > Bronze (<0.5)
 */

import { calculateDistance } from './geoUtils';

export type SortOption = 'distance' | 'name' | 'status' | 'rating';

interface TruckForSorting {
  id: string;
  name?: string | null;
  is_open?: boolean | null;
  average_rating?: number | null;
  data_quality_score?: number | null;
  current_location?: {
    lat?: number | null;
    lng?: number | null;
  } | null;
}

interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Get numeric priority for data quality tier (higher = better)
 * Gold (>=0.8) = 3, Silver (>=0.5) = 2, Bronze (<0.5) = 1
 */
function getQualityPriority(score: number | null | undefined): number {
  if (score == null) return 0;
  if (score >= 0.8) return 3; // Gold
  if (score >= 0.5) return 2; // Silver
  return 1; // Bronze
}

/**
 * Calculate distance from user to truck, returns Infinity if coords unavailable
 */
function getTruckDistance(
  truck: TruckForSorting,
  userLocation: UserLocation | null | undefined,
): number {
  if (!userLocation) return 0; // No distance sorting without user location
  const lat = truck.current_location?.lat;
  const lng = truck.current_location?.lng;
  if (lat == null || lng == null) return Infinity;
  return calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
}

/**
 * Compare two trucks using combined priority (quality as secondary sort after distance)
 * Returns negative if a should come before b, positive if b should come before a
 */
function compareTruckPriority(a: TruckForSorting, b: TruckForSorting): number {
  // Compare by data quality
  const qualityDiff =
    getQualityPriority(b.data_quality_score) - getQualityPriority(a.data_quality_score);
  return qualityDiff;
}

/**
 * Sort trucks by distance with secondary priority sorting
 */
export function sortTrucksByDistance<T extends TruckForSorting>(
  trucks: T[],
  userLocation: UserLocation | null | undefined,
): T[] {
  return [...trucks].sort((a, b) => {
    // Primary: distance
    const distA = getTruckDistance(a, userLocation);
    const distB = getTruckDistance(b, userLocation);

    // If distances are effectively the same (within 0.1 miles), use priority
    if (Math.abs(distA - distB) < 0.1) {
      return compareTruckPriority(a, b);
    }

    return distA - distB;
  });
}

/**
 * Sort trucks by name with secondary priority sorting
 */
export function sortTrucksByName<T extends TruckForSorting>(trucks: T[]): T[] {
  return [...trucks].sort((a, b) => {
    const nameA = a.name?.toLowerCase() ?? '';
    const nameB = b.name?.toLowerCase() ?? '';
    const nameCompare = nameA.localeCompare(nameB);

    // If names are the same, use priority
    if (nameCompare === 0) {
      return compareTruckPriority(a, b);
    }

    return nameCompare;
  });
}

/**
 * Sort trucks by open status with secondary priority sorting
 */
export function sortTrucksByStatus<T extends TruckForSorting>(trucks: T[]): T[] {
  return [...trucks].sort((a, b) => {
    const statusA = a.is_open === true ? 0 : 1;
    const statusB = b.is_open === true ? 0 : 1;

    if (statusA !== statusB) {
      return statusA - statusB;
    }

    return compareTruckPriority(a, b);
  });
}

/**
 * Sort trucks by rating with secondary priority sorting
 */
export function sortTrucksByRating<T extends TruckForSorting>(trucks: T[]): T[] {
  return [...trucks].sort((a, b) => {
    const ratingA = a.average_rating ?? 0;
    const ratingB = b.average_rating ?? 0;

    // Higher rating first
    if (ratingA !== ratingB) {
      return ratingB - ratingA;
    }

    return compareTruckPriority(a, b);
  });
}

/**
 * Universal sort function that applies appropriate sorting based on option
 */
export function sortTrucks<T extends TruckForSorting>(
  trucks: T[],
  sortBy: SortOption,
  userLocation?: UserLocation | null,
): T[] {
  switch (sortBy) {
    case 'distance': {
      return sortTrucksByDistance(trucks, userLocation);
    }
    case 'name': {
      return sortTrucksByName(trucks);
    }
    case 'status': {
      return sortTrucksByStatus(trucks);
    }
    case 'rating': {
      return sortTrucksByRating(trucks);
    }
    default: {
      return sortTrucksByDistance(trucks, userLocation);
    }
  }
}

// Re-export for convenience
export { getQualityPriority, compareTruckPriority };
