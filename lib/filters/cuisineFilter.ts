import type { FoodTruck } from '@/lib/types';

/**
 * Filters food trucks based on selected cuisine types.
 * Supports multi-select filtering with case-insensitive matching.
 *
 * @param trucks - Array of food trucks to filter
 * @param selectedCuisines - Array of selected cuisine types to filter by
 * @returns Filtered array of food trucks
 */
export function applyCuisineFilter(trucks: FoodTruck[], selectedCuisines: string[]): FoodTruck[] {
  // If no cuisines selected, return all trucks
  if (selectedCuisines.length === 0) {
    return trucks;
  }

  // Normalize selected cuisines to lowercase for case-insensitive matching
  const normalizedSelectedCuisines = new Set(selectedCuisines.map((c) => c.toLowerCase()));

  return trucks.filter(
    (truck) =>
      Array.isArray(truck.cuisine_type) &&
      truck.cuisine_type.some((truckCuisine) =>
        normalizedSelectedCuisines.has(truckCuisine.toLowerCase()),
      ),
  );
}

/**
 * Gets unique cuisine types from an array of food trucks
 *
 * @param trucks - Array of food trucks
 * @returns Sorted array of unique cuisine types
 */
export function getUniqueCuisines(trucks: FoodTruck[]): string[] {
  const cuisineSet = new Set<string>();

  for (const truck of trucks) {
    if (Array.isArray(truck.cuisine_type)) {
      for (const cuisine of truck.cuisine_type) {
        const trimmed = cuisine?.trim();
        if (trimmed) {
          cuisineSet.add(trimmed);
        }
      }
    }
  }

  return [...cuisineSet].sort((a, b) => a.localeCompare(b));
}

/**
 * Filters trucks by multiple criteria including cuisines
 * This is a comprehensive filter that can be extended with other filters
 *
 * @param trucks - Array of food trucks to filter
 * @param filters - Filter criteria object
 * @returns Filtered array of food trucks
 */
export function applyAllFilters(
  trucks: FoodTruck[],
  filters: {
    cuisines?: string[];
    searchQuery?: string;
    openNow?: boolean;
    favoritesOnly?: boolean;
    radiusMiles?: number;
    userLocation?: { lat: number; lng: number };
  },
): FoodTruck[] {
  let filteredTrucks = [...trucks];

  // Apply cuisine filter
  if (filters.cuisines && filters.cuisines.length > 0) {
    filteredTrucks = applyCuisineFilter(filteredTrucks, filters.cuisines);
  }

  // Apply search query filter
  if ((filters.searchQuery?.trim()?.length ?? 0) > 0) {
    const query = (filters.searchQuery ?? '').toLowerCase();
    filteredTrucks = filteredTrucks.filter((truck) => {
      const inName = truck.name.toLowerCase().includes(query);
      const inDesc = (truck.description ?? '').toLowerCase().includes(query);
      const inCuisine =
        truck.cuisine_type?.some((c: string) => c.toLowerCase().includes(query)) ?? false;
      const inSpecialties =
        truck.specialties?.some((s) => s.toLowerCase().includes(query)) ?? false;
      return inName || inDesc || inCuisine || inSpecialties;
    });
  }

  // Apply open now filter
  if (filters.openNow === true) {
    const now = new Date();
    const daysOfWeek = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const currentDay = daysOfWeek[now.getDay()];
    const currentTime = now.getHours() * 100 + now.getMinutes();

    filteredTrucks = filteredTrucks.filter((truck) => {
      const hours = truck.operating_hours?.[currentDay];
      if (hours == undefined || hours.closed === true) return false;

      // Parse time strings
      const openStr = hours.open ?? '';
      const closeStr = hours.close ?? '';
      const openTime = Number.parseInt(openStr.replace(':', ''), 10);
      const closeTime = Number.parseInt(closeStr.replace(':', ''), 10);

      return currentTime >= openTime && currentTime <= closeTime;
    });
  }

  // Distance-based filtering could be added here when userLocation is provided.
  // It would require calculating distances between user location and truck locations.

  return filteredTrucks;
}

/**
 * Type guard function to check if cuisine_type is valid
 * @param obj - Object that might have a cuisine_type property
 * @returns boolean indicating if the cuisine_type is valid
 */
export function hasValidCuisineType(obj: unknown): obj is { cuisine_type: string[] } {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const hasCuisine = 'cuisine_type' in obj;
  if (!hasCuisine) {
    return false;
  }

  const cuisineType = (obj as { cuisine_type?: unknown }).cuisine_type;
  return Array.isArray(cuisineType) && cuisineType.every((item) => typeof item === 'string');
}
