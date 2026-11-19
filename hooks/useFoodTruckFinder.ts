import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { FoodTruck } from '@/lib/types';
import { fromDomainToFoodTruck, fromFoodTruckRow } from '@/lib/mappers/domain';
import { logDebug, logError } from '@/lib/logging';
import {
  getUserLocationHelper,
  loadNearbyTrucksHelper,
  requestDeviceLocation,
} from '@/lib/utils/foodTruckHelpers';
import { REGION_FALLBACK } from '@/lib/utils/geocoding';
import { getIpLocation } from '@/lib/location/ipLocation';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import {
  INITIAL_RADIUS_MILES,
  type NearbySeed,
  needsBackgroundRadiusLoad,
  resolveInitialRadiusMiles,
  seedCoversSearch,
} from '@/lib/filters/nearbyLoadPlan';
import { narrowToRadius } from '@/lib/api/trucks/nearbyCells';
import {
  filterByViability,
  filterByDistance,
  filterByPrice,
  filterByOpenNow,
  filterBySearch,
} from '@/lib/utils/truckFiltering';

export interface UseFoodTruckFinderOptions {
  readonly initialSeed?: NearbySeed;
}

function toFoodTrucks(rows: readonly Readonly<Record<string, unknown>>[]): FoodTruck[] {
  return rows.map((row) => {
    const domain = fromFoodTruckRow(row as never);
    const truck = fromDomainToFoodTruck(domain);
    truck.owner_id = domain.owner_id ?? null;
    return truck;
  });
}

export interface ApproximateLocation {
  readonly city: string | null;
}

async function resolveInitialLocation(): Promise<{
  location: { lat: number; lng: number };
  approximate: ApproximateLocation | null;
}> {
  const device = await getUserLocationHelper();
  if (device) {
    return { location: { lat: device.latitude, lng: device.longitude }, approximate: null };
  }
  const ip = await getIpLocation();
  return {
    location: ip ? { lat: ip.lat, lng: ip.lng } : REGION_FALLBACK,
    approximate: { city: ip?.city ?? null },
  };
}

function seedFirstPaint(seed: NearbySeed | undefined): FoodTruck[] {
  if (!seed) return [];
  return toFoodTrucks(narrowToRadius(seed.trucks, seed, INITIAL_RADIUS_MILES));
}

export const useFoodTruckFinder = ({ initialSeed }: UseFoodTruckFinderOptions = {}) => {
  const hasSeed = (initialSeed?.trucks.length ?? 0) > 0;
  const [trucks, setTrucks] = useState<FoodTruck[]>(() => seedFirstPaint(initialSeed));
  const [loading, setLoading] = useState(!hasSeed);
  const [userLocation, setLocalUserLocation] = useState<{ lat: number; lng: number } | undefined>(
    initialSeed ? { lat: initialSeed.lat, lng: initialSeed.lng } : undefined,
  );
  const [selectedTruckId, setSelectedTruckId] = useState<string | undefined>();
  const [approximateLocation, setApproximateLocation] = useState<ApproximateLocation | null>(null);

  const hasLoadedRef = useRef(false);
  const loadRequestIdRef = useRef(0);

  const filtersUserLocation = useFiltersStore((state) => state.userLocation);
  const setUserLocation = useFiltersStore((state) => state.setUserLocation);
  const radiusMiles = useFiltersStore((state) => state.radiusMiles);
  const priceRange = useFiltersStore((state) => state.priceRange);
  const openNow = useFiltersStore((state) => state.openNow);
  const searchQuery = useFiltersStore((state) => state.searchQuery);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadInitialData = async () => {
      try {
        const { location: newUserLocation, approximate } = await resolveInitialLocation();
        setApproximateLocation(approximate);
        setLocalUserLocation(newUserLocation);
        if (!filtersUserLocation) {
          setUserLocation(newUserLocation);
        }

        const requestId = ++loadRequestIdRef.current;
        const seedCoversAll = seedCoversSearch(initialSeed, newUserLocation, radiusMiles);
        const initialRadius = seedCoversAll ? radiusMiles : resolveInitialRadiusMiles(radiusMiles);
        const nearbyTrucks = await loadNearbyTrucksHelper(
          newUserLocation.lat,
          newUserLocation.lng,
          initialRadius,
          initialSeed,
        );
        logDebug('🚚 Trucks loaded with location', { count: nearbyTrucks.length });
        if (requestId === loadRequestIdRef.current) {
          setTrucks(nearbyTrucks);
        }
        setLoading(false);

        if (!seedCoversAll && needsBackgroundRadiusLoad(radiusMiles)) {
          const loadFullRadius = async () => {
            try {
              const fullRadiusTrucks = await loadNearbyTrucksHelper(
                newUserLocation.lat,
                newUserLocation.lng,
                radiusMiles,
                initialSeed,
              );
              logDebug('🚚 Full radius loaded', { count: fullRadiusTrucks.length });
              if (requestId === loadRequestIdRef.current) {
                setTrucks(fullRadiusTrucks);
              }
            } catch (error) {
              logError('useFoodTruckFinder.backgroundRadiusLoad', error);
            }
          };
          loadFullRadius().catch(() => {});
        }
      } catch (error) {
        logError('useFoodTruckFinder.loadInitialData', error);
        setLoading(false);
      }
    };

    void loadInitialData();
  }, []);

  const loadNearbyTrucks = useCallback(async () => {
    if (userLocation) {
      const { lat, lng } = userLocation;
      const requestId = ++loadRequestIdRef.current;
      try {
        const nearbyTrucks = await loadNearbyTrucksHelper(lat, lng, radiusMiles, initialSeed);
        if (requestId === loadRequestIdRef.current) {
          setTrucks(nearbyTrucks);
        }
      } catch (error) {
        logError('useFoodTruckFinder.loadNearbyTrucks', error);
      }
    }
  }, [userLocation, radiusMiles, initialSeed]);

  const handleUserLocate = useCallback(
    (location: { lat: number; lng: number }) => {
      setApproximateLocation(null);
      setLocalUserLocation(location);
      setUserLocation(location);
      const requestId = ++loadRequestIdRef.current;
      loadNearbyTrucksHelper(location.lat, location.lng, radiusMiles, initialSeed)
        .then((nearbyTrucks) => {
          if (requestId === loadRequestIdRef.current) {
            setTrucks(nearbyTrucks);
          }
        })
        .catch((error: unknown) => logError('useFoodTruckFinder.handleUserLocate', error));
    },
    [setUserLocation, radiusMiles, initialSeed],
  );

  const locateWithDevice = useCallback(async (): Promise<boolean> => {
    const location = await requestDeviceLocation();
    if (!location) return false;
    handleUserLocate(location);
    return true;
  }, [handleUserLocate]);

  const dismissApproximateLocation = useCallback(() => setApproximateLocation(null), []);

  const filteredTrucks = useMemo(() => {
    return filterBySearch(
      filterByOpenNow(
        filterByPrice(
          filterByDistance(filterByViability(trucks), filtersUserLocation, radiusMiles),
          priceRange,
        ),
        openNow,
      ),
      searchQuery,
    );
  }, [trucks, filtersUserLocation, radiusMiles, priceRange, openNow, searchQuery]);

  const previousRadiusRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (previousRadiusRef.current !== radiusMiles) {
      previousRadiusRef.current = radiusMiles;

      const reloadTrucks = async () => {
        if (filtersUserLocation && typeof radiusMiles === 'number' && radiusMiles > 0) {
          logDebug(`🔄 Reloading trucks for radius: ${radiusMiles} miles`);
          try {
            await loadNearbyTrucks();
          } catch (error) {
            logError('useFoodTruckFinder.reloadTrucks', error);
          }
        }
      };

      const debounceTimer = setTimeout(() => {
        void reloadTrucks();
      }, 300);

      return () => clearTimeout(debounceTimer);
    }
  }, [radiusMiles, filtersUserLocation, loadNearbyTrucks]);

  useEffect(() => {
    if (trucks.length > 0) {
      logDebug(`📊 Food trucks loaded`, { total: trucks.length, filtered: filteredTrucks.length });
    }
  }, [trucks.length, filteredTrucks.length]);

  return {
    trucks,
    loading,
    userLocation,
    selectedTruckId,
    setSelectedTruckId,
    loadNearbyTrucks,
    handleUserLocate,
    approximateLocation,
    locateWithDevice,
    dismissApproximateLocation,
    filteredTrucks,
  };
};
