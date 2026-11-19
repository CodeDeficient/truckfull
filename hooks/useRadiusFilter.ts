import { useEffect, useCallback } from 'react';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import { useFilterURLSync } from '@/lib/hooks/useFilterUrlSync';
import { useDebounce } from './useDebounce';
import type { FoodTruck } from '@/lib/types';
import { logError, logWarning, logMessage } from '@/lib/logging';

interface UseRadiusFilterOptions {
  /** Whether to enable auto-fetching when radius changes */
  autoFetch?: boolean;
  /** Custom debounce delay in milliseconds */
  debounceDelay?: number;
  /** Callback when trucks need to be fetched */
  onFetchTrucks?: (radius: number, lat: number, lng: number) => Promise<FoodTruck[]>;
}

/**
 * Hook to manage radius filtering with debouncing and URL synchronization
 *
 * @example
 * ```tsx
 * const {
 *   radius,
 *   setRadius,
 *   isUpdating,
 *   fetchTrucksWithRadius
 * } = useRadiusFilter({
 *   autoFetch: true,
 *   onFetchTrucks: async (radius, lat, lng) => {
 *     const response = await fetch(`/api/trucks/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
 *     return response.json();
 *   }
 * });
 * ```
 */
export function useRadiusFilter({
  autoFetch = true,
  debounceDelay = 500,
  onFetchTrucks,
}: UseRadiusFilterOptions = {}) {
  const radiusMiles = useFiltersStore((state) => state.radiusMiles);
  const userLocation = useFiltersStore((state) => state.userLocation);
  const setFilter = useFiltersStore((state) => state.setFilter);
  const { syncToURL } = useFilterURLSync();

  // Debounced radius for API calls
  const debouncedRadius = useDebounce(radiusMiles, debounceDelay);

  // Track if we're currently updating (for loading state)
  const isUpdating = radiusMiles !== debouncedRadius;

  /**
   * Set radius and sync to URL immediately
   */
  const setRadius = useCallback(
    (newRadius: number) => {
      // Validate radius bounds (min 1 mile, max 10000 miles for admin)
      const validRadius = Math.max(1, Math.min(10_000, newRadius));
      setFilter('radiusMiles', validRadius);

      // Sync to URL immediately for shareable state
      syncToURL();
    },
    [setFilter, syncToURL],
  );

  /**
   * Fetch trucks with current radius and location
   */
  const fetchTrucksWithRadius = useCallback(async () => {
    if (!userLocation || !onFetchTrucks) {
      logWarning('Cannot fetch trucks: missing location or fetch callback');
      return [];
    }

    try {
      const trucks = await onFetchTrucks(
        debouncedRadius,
        userLocation?.lat ?? 0,
        userLocation?.lng ?? 0,
      );
      return trucks;
    } catch (error) {
      logError('Failed to fetch trucks with radius:', error);
      return [];
    }
  }, [debouncedRadius, userLocation, onFetchTrucks]);

  /**
   * Auto-fetch when debounced radius or location changes
   */
  useEffect(() => {
    if (autoFetch && userLocation && onFetchTrucks) {
      void fetchTrucksWithRadius();
    }
  }, [debouncedRadius, userLocation, autoFetch]); // Only trigger on debounced changes

  /**
   * Handle immediate UI feedback (non-debounced)
   */
  const handleImmediateChange = useCallback((value: number) => {
    // This can be used for immediate UI updates like map zoom
    // without triggering API calls
    logMessage('Immediate radius change:', value);
  }, []);

  return {
    /** Current radius value in miles */
    radius: radiusMiles,
    /** Debounced radius value (for API calls) */
    debouncedRadius,
    /** Whether user has location available */
    hasLocation: !!userLocation,
    /** User's current location */
    userLocation,
    /** Whether radius is currently updating (debouncing) */
    isUpdating,
    /** Set radius value */
    setRadius,
    /** Fetch trucks with current radius */
    fetchTrucksWithRadius,
    /** Handle immediate UI changes */
    handleImmediateChange,
  };
}
