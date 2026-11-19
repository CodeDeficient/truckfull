/**
 * Client-side filtering functions for food truck data
 * These functions apply filters in the browser when needed
 */
import type { FiltersState } from '@/lib/filters/types';
import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import { isOpenNow } from '@/lib/utils/operatingHours';

/**
 * Apply all filters to a list of food trucks (client-side)
 * @param trucks The list of trucks to filter
 * @param filters The filter state to apply
 * @returns Filtered list of trucks
 */
export function applyAllFilters(
  trucks: FoodTruckDomain[],
  filters: FiltersState,
): FoodTruckDomain[] {
  let result = [...trucks];

  // Apply cuisine filters
  if (filters.cuisines && filters.cuisines.length > 0) {
    result = result.filter((truck) => {
      if (!truck.cuisine_type || !Array.isArray(truck.cuisine_type)) {
        return false;
      }
      return truck.cuisine_type.some((cuisine) =>
        filters.cuisines.some(
          (selectedCuisine) => cuisine.toLowerCase() === selectedCuisine.toLowerCase(),
        ),
      );
    });
  }

  // Apply price range filter - skip this filter since price_rating doesn't exist in FoodTruckDomain

  // Apply search query filter
  if (filters.searchQuery && filters.searchQuery.length > 0) {
    const query = filters.searchQuery.toLowerCase();
    result = result.filter(
      (truck) =>
        truck.name.toLowerCase().includes(query) ||
        truck.description?.toLowerCase().includes(query) ||
        truck.specialties?.some((specialty) => specialty.toLowerCase().includes(query)),
    );
  }

  // Apply open now filter
  if (filters.openNow) {
    result = result.filter((truck) => {
      // Convert FoodTruckDomain to FoodTruck for compatibility with isOpenNow function
      return isOpenNow(truck as unknown as FoodTruck);
    });
  }

  // Note: Distance filter is handled server-side since it requires location calculations
  // The userLocation and radiusMiles are used in server queries, not client-side filtering

  return result;
}

/**
 * Apply cuisine filter with exact and case-insensitive matching
 * @param trucks The list of trucks to filter
 * @param selectedCuisines The selected cuisines to match
 * @returns Filtered list of trucks
 */
export function applyCuisineFilter(
  trucks: FoodTruckDomain[],
  selectedCuisines: string | null,
): FoodTruckDomain[] {
  if (!selectedCuisines || selectedCuisines.length === 0) {
    return [...trucks];
  }

  // Split the cuisine string by commas if it contains commas, otherwise use as single cuisine
  const cuisinesArray = selectedCuisines.includes(',')
    ? selectedCuisines.split(',').map((c) => c.trim())
    : [selectedCuisines.trim()];

  return trucks.filter((truck) => {
    if (!truck.cuisine_type || !Array.isArray(truck.cuisine_type)) {
      return false;
    }

    // Check if any of the truck's cuisines match any of the selected cuisines (case-insensitive)
    return truck.cuisine_type.some((cuisine) =>
      cuisinesArray.some(
        (selectedCuisine) => cuisine.toLowerCase() === selectedCuisine.toLowerCase(),
      ),
    );
  });
}

/**
 * Apply price range filter
 * @param trucks The list of trucks to filter
 * @param priceRange The price range to filter by
 * @returns Filtered list of trucks
 */
export function applyPriceRangeFilter(
  trucks: FoodTruckDomain[],
  priceRange: { min: number; max: number } | undefined,
): FoodTruckDomain[] {
  if (!priceRange) {
    return [...trucks];
  }

  // Since the price_rating field doesn't exist in the FoodTruckDomain schema,
  // this function currently returns all trucks.
  return [...trucks]; // Return all trucks since price field doesn't exist
}

/**
 * Apply open now filter
 * @param trucks The list of trucks to filter
 * @param openNow Whether to filter for currently open trucks only
 * @returns Filtered list of trucks
 */
export function applyOpenNowFilter(trucks: FoodTruckDomain[], openNow: boolean): FoodTruckDomain[] {
  if (!openNow) {
    return [...trucks];
  }

  return trucks.filter((truck) => {
    // Convert FoodTruckDomain to FoodTruck for compatibility with isOpenNow function
    return isOpenNow(truck as unknown as FoodTruck);
  });
}

/**
 * Apply text search filter
 * @param trucks The list of trucks to filter
 * @param query The search query (can be null)
 * @returns Filtered list of trucks
 */
export function applyTextSearchFilter(
  trucks: FoodTruckDomain[],
  query: string | null,
): FoodTruckDomain[] {
  if (!query || query.length === 0) {
    return [...trucks];
  }

  const searchQuery = query.toLowerCase();
  return trucks.filter(
    (truck) =>
      truck.name.toLowerCase().includes(searchQuery) ||
      truck.description?.toLowerCase().includes(searchQuery) ||
      truck.specialties?.some((specialty) => specialty.toLowerCase().includes(searchQuery)),
  );
}
