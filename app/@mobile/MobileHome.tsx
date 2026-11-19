'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { FoodTruckServiceClient } from '@/lib/supabase/services/foodTruckService.client';
import dynamic from 'next/dynamic';
import { useIsClient } from '@/hooks/useIsClient';
import { MobileErrorBoundary } from '@/components/mobile/MobileErrorBoundary';
import { MobilePageLoader } from '@/components/mobile/MobileLoadingSpinner';
import { HomeNoScriptContent } from '@/components/home/HomeNoScriptContent';
import type { FoodTruckDomain, FoodTruck } from '@/lib/types';
import { buildTruckSelectSideEffects } from '@/app/@mobile/_lib/handleTruckSelect';
import { Skeleton } from '@/components/ui/skeleton';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import type { SortOption } from '@/components/search/LiveSearchList';
import type { FilterOptions } from '@/components/search/MobileFilterModal';
import { isWithinRadius } from '@/lib/utils/truckFiltering';
import { sortTrucks } from '@/lib/utils/truckSorting';
import {
  type NearbySeed,
  needsBackgroundRadiusLoad,
  resolveInitialRadiusMiles,
  resolveMobileDefaultRadiusMiles,
  seedCoversSearch,
} from '@/lib/filters/nearbyLoadPlan';
import { RADIUS_OPTIONS_GUEST, RADIUS_OPTIONS_AUTHENTICATED } from '@/lib/filters/types';
import { ANONYMOUS_MAX_RADIUS_MILES } from '@/lib/api/trucks/radiusLimits';
import { REGION_FALLBACK } from '@/lib/utils/geocoding';
import { getUserLocationHelper, requestDeviceLocation } from '@/lib/utils/foodTruckHelpers';
import { getIpLocation } from '@/lib/location/ipLocation';
import { ApproximateLocationBanner } from '@/components/location/ApproximateLocationBanner';

const NON_SLUG_CHARS = /[^a-z0-9\s-]/g;
const WHITESPACE_RUNS = /\s+/g;
const DASH_RUNS = /-+/g;

const AppHeader = dynamic(() => import('@/components/ui/organisms/AppHeader'), {
  ssr: false,
  loading: () => <div className="h-14 bg-zinc-950 animate-pulse" />,
});
const AppBottomNavigation = dynamic(
  () => import('@/components/ui/organisms/AppBottomNavigation'),
  { ssr: false, loading: () => <Skeleton className="h-16 w-full" /> },
);
const MobileMapComponent = dynamic(
  () => import('@/components/map/MobileMapComponent').then((m) => ({ default: m.MobileMapComponent })),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);
const MobileFilterModal = dynamic(
  () => import('@/components/search/MobileFilterModal').then((m) => ({ default: m.MobileFilterModal })),
  { ssr: false },
);
const AuthModal = dynamic(
  () => import('@/components/auth').then((m) => ({ default: m.AuthModal })),
  { ssr: false },
);
import { isTruckResultWithError, isTruckResultSuccess } from '@/lib/utils/typeGuards';
import { MobileNavigationProvider, useMobileNavigation } from '@/contexts/MobileNavigationContext';
import { useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

const DiscoverFoodTrucks = dynamic(() => import('./discover_food_trucks/DiscoverFoodTrucks'), { ssr: false });
const FeaturedContentComponent = dynamic(() => import('./featured/FeaturedContent').then(m => ({ default: m.FeaturedContentComponent })), { ssr: false });
const FavoritesContentComponent = dynamic(() => import('./favorites/FavoritesContent').then(m => ({ default: m.FavoritesContentComponent })), { ssr: false });
const TruckDetailsModal = dynamic(() => import('@/components/TruckDetailsModal').then(m => ({ default: m.TruckDetailsModal })), { ssr: false });
const ProfileModal = dynamic(() => import('@/components/profile/ProfileModal').then(m => ({ default: m.ProfileModal })), { ssr: false });
const SettingsModal = dynamic(() => import('@/components/settings/SettingsModal').then(m => ({ default: m.SettingsModal })), { ssr: false });
const LiveSearchList = dynamic(() => import('@/components/search/LiveSearchList').then(m => ({ default: m.LiveSearchList })), { ssr: false });
const MobileBottomSheet = dynamic(() => import('./_components/MobileBottomSheet'), { ssr: false });
const MobileRadiusControl = dynamic(
  () => import('./_components/MobileRadiusControl').then((m) => ({ default: m.MobileRadiusControl })),
  { ssr: false },
);
import { logDebug, logError, logWarning } from '@/lib/logging';

function extractErrorMessage(error_: unknown): string {
  if (error_ instanceof Error) {
    return error_.message || error_.name || 'An unknown error occurred';
  }
  if (typeof error_ === 'string') {
    return error_;
  }
  if (error_ && typeof error_ === 'object' && 'message' in error_) {
    const messageValue = (error_ as { message: unknown }).message;
    return typeof messageValue === 'string' ? messageValue : JSON.stringify(error_);
  }
  return 'An unknown error occurred';
}

function hasMatchingCuisine(
  cuisineType: string[] | null | undefined,
  selectedCuisines: string[],
): boolean {
  return cuisineType?.some((cuisine) => selectedCuisines.includes(cuisine)) ?? false;
}

// Separate component for the header section
const MobileHeader = ({
  user,
  loadingAuth,
  handleAvatarClick,
  onSearchChange,
  onHomeClick,
  currentRoute,
}: {
  user: User | null;
  loadingAuth: boolean;
  handleAvatarClick: () => void;
  onSearchChange: (query: string) => void;
  onHomeClick: () => void;
  currentRoute: string;
}) => (
  <div className="fixed top-0 left-0 right-0 z-20 mobile-header bg-zinc-950 h-14">
    <AppHeader
      showAvatarButton={true}
      onAvatarClick={handleAvatarClick}
      isAuthenticated={!!user}
      loadingAuth={loadingAuth}
      user={user}
      onSearchChange={onSearchChange}
      onHomeClick={onHomeClick}
      showSearchButton={currentRoute === 'near-me'}
    />
  </div>
);

// Separate component for the main content based on route
const MobileMainContent = ({
  currentRoute,
  filteredTrucks,
  isClient,
  navigateTo,
  selectedTruckId,
  selectedTruckLocation,
  setSelectedTruckId,
  selectedFromList: _selectedFromList,
  listState = 'peek',
  onOpenTruckDetail,
  onAuthRequired,
  onClusterSelect,
  shouldSkipUserCenter,
  radiusMiles,
  onRadiusChange,
  radiusOptions,
  userLocation,
  onUserLocate,
  locationBanner,
}: {
  currentRoute: string;
  filteredTrucks: FoodTruckDomain[];
  isClient: boolean;
  navigateTo: (route: string) => void;
  selectedTruckId?: string;
  selectedTruckLocation?: [number, number];
  setSelectedTruckId: (id: string | undefined) => void;
  selectedFromList?: boolean;
  listState?: 'collapsed' | 'peek' | 'expanded';
  onOpenTruckDetail: (truckIdOrTruck: string | FoodTruckDomain | FoodTruck) => void;
  onAuthRequired?: () => void;
  onClusterSelect?: (clusterId: number, trucks: FoodTruck[]) => void;
  shouldSkipUserCenter?: boolean;
  radiusMiles: number;
  onRadiusChange: (radiusMiles: number) => void;
  radiusOptions: readonly number[];
  userLocation?: { lat: number; lng: number };
  onUserLocate: (location: { lat: number; lng: number }) => void;
  locationBanner?: React.ReactNode;
}) => {
  // Calculate smart offset for mobile list selections
  // Adjusts based on list state: collapsed (0), peek (35vh), expanded (75vh)
  // Note: calculateListOffset is currently unused but kept for future smart offset feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, sonarjs/no-unused-vars, sonarjs/no-dead-store
  const calculateListOffset = (): [number, number] => {
    if (globalThis.window === undefined) return [0, 0];

    const screenHeight = window.innerHeight;
    const headerHeight = 64; // 4rem

    // Calculate list height based on state
    const getListHeight = (): number => {
      switch (listState) {
        case 'collapsed': {
          return 0;
        }
        case 'peek': {
          return screenHeight * 0.35;
        } // 35vh
        case 'expanded': {
          return screenHeight * 0.75;
        } // 75vh
        default: {
          return screenHeight * 0.35;
        }
      }
    };
    const listHeight = getListHeight();

    const visibleHeight = screenHeight - headerHeight - listHeight;
    const visibleCenter = headerHeight + visibleHeight / 2;
    const screenCenter = screenHeight / 2;
    const offsetY = visibleCenter - screenCenter;

    logDebug('📐 Smart offset calculation:', {
      screenHeight,
      headerHeight,
      listHeight,
      listState,
      visibleHeight,
      visibleCenter,
      screenCenter,
      offsetY,
    });

    return [0, offsetY];
  };
  return (
    <>
      {currentRoute === 'near-me' && (
        <div className="h-full relative">
          <MobileMapComponent
            trucks={filteredTrucks}
            theme="dark"
            selectedTruckId={selectedTruckId}
            selectedTruckLocation={selectedTruckLocation}
            onSelectTruck={setSelectedTruckId}
            isClient={isClient}
            onClusterSelect={onClusterSelect}
            shouldSkipUserCenter={shouldSkipUserCenter}
            userLocation={userLocation}
            onUserLocate={onUserLocate}
          />
          <MobileRadiusControl
            radiusMiles={radiusMiles}
            onSelect={onRadiusChange}
            options={radiusOptions}
          />
          {locationBanner}
        </div>
      )}
      {currentRoute === 'discover' && <DiscoverFoodTrucks onTruckSelect={onOpenTruckDetail} />}
      {currentRoute === 'featured' && (
        <FeaturedContentComponent
          className="h-full"
          onTruckClick={(id) => onOpenTruckDetail(id)}
          // Disable event/offer clicks until we have real data
          onOfferRedeem={() => {}}
          onEventDetails={() => {}}
        />
      )}

      {currentRoute === 'favorites' && (
        <FavoritesContentComponent
          className="h-full"
          onBack={() => navigateTo('near-me')}
          onDiscoverTrucks={() => navigateTo('discover')}
          onAuthRequired={onAuthRequired}
        />
      )}
    </>
  );
};


// Hook for truck data handling
const useTruckData = (
  navigateTo: (route: 'near-me' | 'discover' | 'featured' | 'favorites') => void,
  initialSeed: NearbySeed | undefined,
) => {
  const searchParams = useSearchParams();
  const [trucks, setTrucks] = useState<FoodTruckDomain[]>([]);
  const [filteredTrucks, setFilteredTrucks] = useState<FoodTruckDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [approximateLocation, setApproximateLocation] = useState<{ city: string | null } | null>(
    null,
  );
  const [currentSort, setCurrentSort] = useState<SortOption>('distance');
  const [filters, setFilters] = useState<FilterOptions>({
    maxDistance: resolveMobileDefaultRadiusMiles(
      !!searchParams.get('truck'),
      ANONYMOUS_MAX_RADIUS_MILES,
    ),
    openNow: false,
    cuisineTypes: [],
  });

  const loadRequestIdRef = useRef(0);
  const lastFetchedSignatureRef = useRef<string | null>(null);

  // On mount: fetch IP location, then load trucks (single pass, no re-trigger)
  const mountsOnce = useRef(false);
  useEffect(() => {
    if (mountsOnce.current) return;
    mountsOnce.current = true;

    const init = async () => {
      const deviceLocation = await getUserLocationHelper();
      const ipLocation = deviceLocation ? null : await getIpLocation();
      const initialLocation = deviceLocation
        ? { lat: deviceLocation.latitude, lng: deviceLocation.longitude }
        : ipLocation && { lat: ipLocation.lat, lng: ipLocation.lng };
      if (!deviceLocation) {
        setApproximateLocation({ city: ipLocation?.city ?? null });
      }
      if (initialLocation) {
        setUserLocation(initialLocation);
      }
      await fetchTrucks(initialLocation);
    };
    init().catch(() => logDebug('IP geolocation unavailable'));
  }, []);

  const handleUserLocate = useCallback((location: { lat: number; lng: number }) => {
    setApproximateLocation(null);
    setUserLocation(location);
  }, []);

  const locateWithDevice = useCallback(async (): Promise<boolean> => {
    const location = await requestDeviceLocation();
    if (!location) return false;
    handleUserLocate(location);
    return true;
  }, [handleUserLocate]);

  const dismissApproximateLocation = useCallback(() => setApproximateLocation(null), []);

  // Check for initial route from URL parameters on mount
  useEffect(() => {
    const initialRouteParam = searchParams.get('tab');
    if (
      initialRouteParam &&
      (initialRouteParam === 'near-me' ||
        initialRouteParam === 'discover' ||
        initialRouteParam === 'featured' ||
        initialRouteParam === 'favorites')
    ) {
      navigateTo(initialRouteParam);
    }
  }, [searchParams, navigateTo]);

  // Applies an API result to state. Returns whether the fetch succeeded.
  const applyTruckResult = useCallback((result: unknown): boolean => {
    if (isTruckResultWithError(result)) {
      setError(result.error);
      setTrucks([]);
      setFilteredTrucks([]);
      return false;
    }
    if (isTruckResultSuccess(result)) {
      const safeTrucks = (result.trucks ?? []) as FoodTruckDomain[];
      setTrucks(safeTrucks);
      setFilteredTrucks(safeTrucks);
      return true;
    }
    setTrucks([]);
    setFilteredTrucks([]);
    return false;
  }, []);

  // Widens the radius after the fast first paint; only the latest request wins.
  const loadFullRadius = useCallback(
    async (location: { lat: number; lng: number }, requestId: number) => {
      try {
        const fullResult = await FoodTruckServiceClient.getTrucksByLocation(
          location.lat,
          location.lng,
          filters.maxDistance,
          initialSeed,
        );
        if (requestId === loadRequestIdRef.current) {
          applyTruckResult(fullResult);
        }
      } catch (error) {
        logError('useTruckData.backgroundRadiusLoad', error);
      }
    },
    [filters.maxDistance, applyTruckResult, initialSeed],
  );

  // Fetch trucks from API - uses IP location by default, GPS only when user opted in.
  // Loads a tight radius first so pins paint fast, then widens in the background.
  const fetchTrucks = useCallback(
    async (location?: { lat: number; lng: number } | null) => {
      let requestId: number | undefined;
      try {
        setLoading(true);

        const fetchLocation =
          location ?? userLocation ?? (await getIpLocation()) ?? REGION_FALLBACK;

        const signature = `${fetchLocation.lat},${fetchLocation.lng},${filters.maxDistance}`;
        if (signature === lastFetchedSignatureRef.current) {
          setLoading(false);
          return;
        }

        requestId = ++loadRequestIdRef.current;
        lastFetchedSignatureRef.current = signature;

        const seedCoversAll = seedCoversSearch(initialSeed, fetchLocation, filters.maxDistance);
        const initialRadius = seedCoversAll
          ? filters.maxDistance
          : resolveInitialRadiusMiles(filters.maxDistance);
        const initialResult = await FoodTruckServiceClient.getTrucksByLocation(
          fetchLocation.lat,
          fetchLocation.lng,
          initialRadius,
          initialSeed,
        );
        if (requestId !== loadRequestIdRef.current) return;
        applyTruckResult(initialResult);
        setLoading(false);

        if (!seedCoversAll && needsBackgroundRadiusLoad(filters.maxDistance)) {
          await loadFullRadius(fetchLocation, requestId);
        }
      } catch (error_: unknown) {
        if (requestId !== undefined && requestId !== loadRequestIdRef.current) return;
        lastFetchedSignatureRef.current = null;
        setError(extractErrorMessage(error_));
        setTrucks([]);
        setFilteredTrucks([]);
      } finally {
        setLoading(false);
      }
    },
    [userLocation, filters.maxDistance, applyTruckResult, loadFullRadius, initialSeed],
  );

  // Re-fetch trucks when location or filter changes (after initial mount)
  const hasFetchedOnce = useRef(false);
  useEffect(() => {
    if (!hasFetchedOnce.current) {
      hasFetchedOnce.current = true;
      return;
    }
    void fetchTrucks();
  }, [fetchTrucks]);

  const handleSearch = useCallback(() => {
    // Helper function to apply filters
    const applyFilters = (trucksToFilter: FoodTruckDomain[]) => {
      let filtered = trucksToFilter;

      // Apply distance filter
      if (userLocation) {
        filtered = filtered.filter((truck) =>
          isWithinRadius(truck, userLocation, filters.maxDistance),
        );
      }

      // Apply open now filter
      if (filters.openNow) {
        filtered = filtered.filter((truck) => truck.is_open === true);
      }

      if (filters.cuisineTypes.length > 0) {
        filtered = filtered.filter((truck) =>
          hasMatchingCuisine(truck.cuisine_type, filters.cuisineTypes),
        );
      }

      return filtered;
    };

    // Helper function to apply sorting (uses centralized utility with tier/quality secondary sorting)
    const applySorting = (trucksToSort: FoodTruckDomain[]) => {
      // Map SortOption to sortTrucks format
      const sortOption = currentSort === 'open' ? 'status' : currentSort;
      return sortTrucks(trucksToSort, sortOption, userLocation);
    };

    if (searchTerm.trim() === '') {
      // Apply filters to all trucks
      const filtered = applyFilters(trucks);
      setFilteredTrucks(applySorting([...filtered]));
      logDebug('searchTerm is empty, applying filters to all trucks:', filtered.length);
    } else {
      // Filter by search term first
      logDebug('searchTerm is NOT empty, filtering trucks:', searchTerm);
      const searchFiltered = trucks.filter(
        (truck) =>
          truck.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (Array.isArray(truck.cuisine_type) &&
            truck.cuisine_type.some((cuisine) =>
              cuisine.toLowerCase().includes(searchTerm.toLowerCase()),
            )),
      );

      // Then apply other filters
      const filtered = applyFilters(searchFiltered);
      setFilteredTrucks(applySorting([...filtered]));
      logDebug('Filtered to', filtered.length, 'trucks from', trucks.length);
    }
  }, [trucks, searchTerm, setFilteredTrucks, userLocation, currentSort, filters]);

  useEffect(() => {
    handleSearch();
  }, [searchTerm, handleSearch]);

  // Handle navigation from bottom navigation
  const handleNavigation = useCallback(
    (route: string) => {
      if (
        route === 'discover' ||
        route === 'near-me' ||
        route === 'featured' ||
        route === 'favorites'
      ) {
        navigateTo(route);
      }
    },
    [navigateTo],
  );

  // Wrapper function to ensure void return and prevent misused-promises error
  const handleNavigationVoid = useCallback(
    (route: string) => {
      if (
        route === 'near-me' ||
        route === 'discover' ||
        route === 'featured' ||
        route === 'favorites'
      ) {
        handleNavigation(route);
      }
    },
    [handleNavigation],
  );

  return {
    trucks,
    filteredTrucks,
    setFilteredTrucks,
    loading,
    error,
    isSheetOpen,
    setIsSheetOpen,
    fetchTrucks,
    searchTerm,
    setSearchTerm,
    handleSearch,
    handleNavigationVoid,
    userLocation,
    handleUserLocate,
    approximateLocation,
    locateWithDevice,
    dismissApproximateLocation,
    currentSort,
    setCurrentSort,
    filters,
    setFilters,
  };
};

// Component that handles navigation within the mobile experience
const MobilePageContent = ({ initialSeed }: { readonly initialSeed: NearbySeed | undefined }) => {
  const { currentRoute, navigateTo } = useMobileNavigation();
  const isClient = useIsClient();

  const {
    trucks,
    filteredTrucks,
    loading,
    error,
    isSheetOpen,
    setIsSheetOpen,
    fetchTrucks,
    searchTerm,
    setSearchTerm,
    handleSearch,
    handleNavigationVoid,
    userLocation,
    handleUserLocate,
    approximateLocation,
    locateWithDevice,
    dismissApproximateLocation,
    setCurrentSort,
    filters,
    setFilters,
  } = useTruckData(navigateTo, initialSeed);

  // Authentication state
  const { user, loading: loadingAuth } = useSafeAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const searchParams = useSearchParams();

  // Open auth modal when showAuth=true query param is present (from favorites sign-in button)
  useEffect(() => {
    if (searchParams.get('showAuth') === 'true') {
      setIsAuthModalOpen(true);
      // Clear the query param to prevent re-triggering
      const url = new URL(globalThis.location.href);
      url.searchParams.delete('showAuth');
      globalThis.history.replaceState({}, '', url.pathname);
    }
  }, [searchParams]);

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // State for selected truck ID (for map centering and popup)
  const [selectedTruckId, setSelectedTruckId] = useState<string | undefined>();

  // State for detailed truck modal (full screen detail view)
  // Store the full truck object so it works regardless of data source
  const [detailTruck, setDetailTruck] = useState<FoodTruckDomain | FoodTruck | null>(null);

  // State for bottom sheet detailed view (map pin or cluster list)
  const [sheetDetailTruck, setSheetDetailTruck] = useState<FoodTruckDomain | null>(null);

  // State for selected cluster
  const [selectedCluster, setSelectedCluster] = useState<{
    id: number;
    trucks: FoodTruckDomain[];
  } | null>(null);

  // State for LiveSearchList (three states: collapsed, peek, expanded)
  // NOTE: Moved here so it can be used in handleClusterSelect
  type ListState = 'collapsed' | 'peek' | 'expanded';
  const [listState, setListState] = useState<ListState>('peek');

  // Track if user manually collapsed (to prevent auto-reopen until they edit search)
  const [userManuallyClosed, setUserManuallyClosed] = useState(false);
  const previousSearchTermRef = useRef<string>('');

  // Track if selection came from LiveSearchList (for smart offset)
  const [selectedFromList, setSelectedFromList] = useState(false);

  // Track if a URL truck param exists to prevent user location centering
  // FLOW: URL param → hasUrlTruckParam → shouldSkipUserCenter prop → MobileMapComponent → MapboxMapComponent
  // User expects to go straight to truck's bottom sheet from URL, not their location
  const hasUrlTruckParam = useRef(false);

  // Handle cluster selection
  const handleClusterSelect = useCallback(
    (clusterId: number, trucks: FoodTruck[]) => {
      logDebug('🗂️ Cluster selected:', clusterId, 'with', trucks.length, 'trucks');
      // Convert trucks to FoodTruckDomain if needed, for consistency
      // State update triggers re-render, forcing BottomSheet to open with cluster content
      // We need to ensure the bottom sheet opens when a cluster is selected
      // Since MobileBottomSheet logic relies on generic 'isSheetOpen' or 'selectedCluster' prop?
      // Actually, MobileBottomSheet has 'isSheetOpen' state, but we might want a separate sheet for cluster?
      // Or reuse the existing sheet but with different content.
      // The existing sheet is for search results.
      // Let's reuse it or create a new one. Reuse seems better for "bottom sheet" pattern.
      // But wait, the search sheet is distinct from "truck details".
      // Truck details is a modal (TruckDetailsModal).
      // Cluster details should ideally be a bottom sheet too.

      // For now, let's treat cluster similar to search list but focused.
      // However, current Search Sheet is driven by 'isSheetOpen'.
      // If we want to show cluster content, we might need to override content or have a "mode".

      // ACTUALLY, the requirement says "Use the existing bottom sheet component... for displaying single truck details".
      // And "Resolving Cluster List Overlap" implies we might want to put cluster list in a bottom sheet too.

      // Strategy:
      // 1. Add 'selectedCluster' state.
      // 2. Pass 'selectedCluster' to MobileBottomSheet.
      // 3. Inside MobileBottomSheet (or BottomSheetContent), if selectedCluster is present, show its trucks.

      setSelectedCluster({ id: clusterId, trucks: trucks as FoodTruckDomain[] });
      setSheetDetailTruck(null); // Clear individual truck detail when selecting a cluster
      setIsSheetOpen(true); // Open the sheet to show cluster contents
      setListState('collapsed'); // Close the live search list
      setUserManuallyClosed(true); // Prevent auto-reopen by useEffect
    },
    [setIsSheetOpen, setListState],
  );

  const handleCloseCluster = useCallback(() => {
    setSelectedCluster(null);
    setIsSheetOpen(false);
  }, []);

  // Modify handleOpenTruckDetail to also close cluster if opening a truck
  const handleOpenTruckDetail = useCallback(
    (truckIdOrTruck: string | FoodTruckDomain | FoodTruck) => {
      if (typeof truckIdOrTruck === 'string') {
        // If passed a string ID, try to find the truck in available data
        const id = truckIdOrTruck;
        logDebug('handleOpenTruckDetail called with ID:', id);
        const foundTruck = trucks.find((t) => t.id === id);
        if (foundTruck) {
          setDetailTruck(foundTruck);
        } else {
          logWarning('Truck NOT found in master list for ID:', id);
        }
      } else {
        // If passed the full truck object, use it directly
        logDebug('handleOpenTruckDetail called with truck object:', truckIdOrTruck.name);
        setDetailTruck(truckIdOrTruck);
      }
      // Ensure cluster is cleared when opening specific truck detail,
      // BUT we might want to navigate back to cluster?
      // For now, let's keep it simple.
    },
    [trucks],
  );

  const handleCloseTruckDetail = useCallback(() => {
    logDebug('❌ handleCloseTruckDetail called');
    setDetailTruck(null);
  }, []);

  // Track if selection came from LiveSearchList (for smart offset)
  // (Declarations moved earlier to fix dependency order)

  // Debug mount/unmount to check for re-mounting issue
  useEffect(() => {
    logDebug('🚨 PARENT COMPONENT MOUNTED');
    return () => {
      logDebug('🚨 PARENT COMPONENT UNMOUNTED');
    };
  }, []);

  // Helper function to get selected truck location (matching desktop implementation)
  const getSelectedTruckLocation = useCallback(
    (truckId: string | undefined, trucks: FoodTruckDomain[]): [number, number] | undefined => {
      if (truckId == undefined) return undefined;

      const truck = trucks.find((t) => t.id === truckId);
      const location = truck?.current_location;
      if (location?.lat == null || location.lng == null) return undefined;

      const lat = Number(location.lat);
      const lng = Number(location.lng);

      // Validate coordinates
      if (
        Number.isNaN(lat) ||
        Number.isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return undefined;
      }

      return [lng, lat]; // [longitude, latitude] for Mapbox
    },
    [],
  );

  // Ref to hold current route value to avoid useCallback dependencies
  const currentRouteRef = useRef(currentRoute);
  useEffect(() => {
    currentRouteRef.current = currentRoute;
  }, [currentRoute]);

  // Handler for truck selection - centers map and opens popup
  const handleTruckSelect = useCallback((truck: FoodTruckDomain) => {
    logDebug('🚚 Truck selected:', truck.name, 'ID:', truck.id);
    logDebug('📍 Current route:', currentRouteRef.current);

    const effects = buildTruckSelectSideEffects(truck);
    setSelectedTruckId(effects.selectedTruckId);
    setSheetDetailTruck(effects.sheetDetailTruck);
    setIsSheetOpen(effects.isSheetOpen);
    setListState(effects.listState);
    setUserManuallyClosed(effects.userManuallyClosed);
    setSelectedFromList(true);
    logDebug('✅ selectedTruckId set to:', truck.id, '(from list)');

    setTimeout(() => {
      setSelectedFromList(false);
    }, 1000);
  }, []);

  // Auto-expand search list when user EDITS search (not just having text)
  useEffect(() => {
    // Only auto-open if:
    // 1. User has typed something new (searchTerm changed)
    // 2. List is currently collapsed
    // 3. User didn't manually close it, OR searchTerm actually changed (indicating edit)
    if (searchTerm && listState === 'collapsed') {
      const searchTermChanged = searchTerm !== previousSearchTermRef.current;
      if (searchTermChanged || !userManuallyClosed) {
        setListState('peek');
        setUserManuallyClosed(false); // Reset manual close flag on new search
      }
    }

    // Update previous search term ref
    previousSearchTermRef.current = searchTerm;
  }, [searchTerm, listState, userManuallyClosed]);

  // Handle list state change (from chevron clicks)
  const handleListStateChange = useCallback((newState: ListState) => {
    setListState(newState);
    // If user manually collapses, set flag to prevent auto-reopen
    if (newState === 'collapsed') {
      setUserManuallyClosed(true);
    }
  }, []);

  // Handle sort change
  const handleSortChange = useCallback(
    (sortBy: SortOption) => {
      setCurrentSort(sortBy);
    },
    [setCurrentSort],
  );

  // Handle filter apply
  const handleApplyFilters = useCallback(
    (newFilters: FilterOptions) => {
      setFilters(newFilters);
    },
    [setFilters],
  );

  // Handle quick filter change (distance and openNow only)
  const handleQuickFilterChange = useCallback(
    (quickFilters: { maxDistance: number; openNow: boolean }) => {
      setFilters((prev) => ({
        ...prev,
        maxDistance: quickFilters.maxDistance,
        openNow: quickFilters.openNow,
      }));
    },
    [setFilters],
  );

  // Function to get page title based on current route
  const getPageTitle = useCallback(() => {
    switch (currentRoute) {
      case 'near-me': {
        return 'Near Me';
      }
      case 'discover': {
        return 'Discover';
      }
      case 'featured': {
        return 'Featured';
      }

      case 'favorites': {
        return 'Favorites';
      }
      default: {
        return 'Mobile';
      }
    }
  }, [currentRoute]);

  // Avatar click handler
  const handleAvatarClick = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  // Auth modal handlers
  const handleAuthClose = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // Handle truck parameter from slug URLs (e.g., /palmetto-bowls -> /?truck=palmetto-bowls)
  useEffect(() => {
    const truckParam = searchParams.get('truck');
    hasUrlTruckParam.current = !!truckParam;

    logDebug('Mobile truck param handler:', {
      truckParam,
      hasUrlTruckParam: hasUrlTruckParam.current,
      filteredTrucksCount: filteredTrucks.length,
    });

    if (truckParam && filteredTrucks.length > 0) {
      logDebug('🔗 Looking for truck from URL param:', truckParam);

      // First try to find by ID (for backwards compatibility)
      let matchingTruck = filteredTrucks.find((t) => t.id === truckParam);

      // If not found by ID, try by slug field
      if (!matchingTruck) {
        matchingTruck = filteredTrucks.find((t) => 'slug' in t && t.slug === truckParam);
      }

      // If still not found, try matching by name-derived slug (FUZZY MATCHING)
      // This handles cases like "palmetto-bowls" matching "palmetto-bowl"
      if (!matchingTruck) {
        const normalizedParam = truckParam.toLowerCase();
        matchingTruck = filteredTrucks.find((t) => {
          const nameSlug = t.name
            .toLowerCase()
            .replaceAll(NON_SLUG_CHARS, '')
            .replaceAll(WHITESPACE_RUNS, '-')
            .replaceAll(DASH_RUNS, '-');
          return nameSlug === normalizedParam || nameSlug.startsWith(normalizedParam);
        });
      }

      logDebug('Truck search result:', {
        found: !!matchingTruck,
        matchingTruckName: matchingTruck?.name,
      });

      if (matchingTruck) {
        logDebug('Found truck from URL param:', matchingTruck.name);
        logDebug('Opening truck details:', matchingTruck.name, 'ID:', matchingTruck.id);
        // Center map on truck pin
        setSelectedTruckId(matchingTruck.id);
        // Open bottom sheet with truck details (not full modal)
        setSheetDetailTruck(matchingTruck);
        setIsSheetOpen(true);
        // Clear the URL parameter
        const url = new URL(globalThis.location.href);
        url.searchParams.delete('truck');
        globalThis.history.replaceState({}, '', url.pathname + url.search);
      } else {
        logWarning('Truck not found for slug:', truckParam);
        logDebug(
          'Available trucks:',
          filteredTrucks.map((t) => ({
            id: t.id,
            name: t.name,
            slug: 'slug' in t ? t.slug : undefined,
          })),
        );
      }
    }
  }, [searchParams, filteredTrucks]);

  // Home click handler - navigate to near-me view
  const handleHomeClick = useCallback(() => {
    navigateTo('near-me');
  }, [navigateTo]);

  // Render main content of the page
  // Note: hasUrlTruckParam ref is NOT in dependency array because ref objects maintain
  // the same identity across renders. The callback accesses .current directly, which
  // always returns the current value without requiring callback re-creation.
  const renderMainContent = useCallback(
    () => (
      <div className="relative h-screen flex flex-col group/design-root overflow-x-hidden mobile-container mobile-content">
        <MobileHeader
          user={user ?? null}
          loadingAuth={loadingAuth}
          handleAvatarClick={handleAvatarClick}
          onSearchChange={setSearchTerm}
          onHomeClick={handleHomeClick}
          currentRoute={currentRoute}
        />

        {/* Main content area - switch between different views based on current route */}
        <div
          className="flex-1 w-full overflow-hidden relative"
          style={{ height: 'calc(100vh - 3.5rem)', marginTop: '3.5rem' }}
        >
          <MobileMainContent
            currentRoute={currentRoute}
            filteredTrucks={filteredTrucks}
            isClient={isClient}
            navigateTo={(route: string) => {
              if (
                route === 'near-me' ||
                route === 'discover' ||
                route === 'featured' ||
                route === 'favorites'
              ) {
                navigateTo(route);
              }
            }}
            selectedTruckId={selectedTruckId}
            selectedTruckLocation={getSelectedTruckLocation(selectedTruckId, filteredTrucks)}
            setSelectedTruckId={(id) => {
              setSelectedTruckId(id);
              if (id) {
                // Open the bottom sheet detail view when a truck is selected on the map
                // Instead of global modal
                const truck = filteredTrucks.find((t) => t.id === id);
                if (truck) {
                  setSheetDetailTruck(truck);
                  setIsSheetOpen(true);
                  // Close live search list when a truck pin is tapped
                  setListState('collapsed');
                  setUserManuallyClosed(true);
                }
              }
            }}
            selectedFromList={selectedFromList}
            listState={listState}
            onOpenTruckDetail={handleOpenTruckDetail}
            onAuthRequired={() => setIsAuthModalOpen(true)}
            onClusterSelect={handleClusterSelect}
            shouldSkipUserCenter={hasUrlTruckParam.current}
            radiusMiles={filters.maxDistance}
            onRadiusChange={(radiusMiles) => setFilters((prev) => ({ ...prev, maxDistance: radiusMiles }))}
            radiusOptions={user ? RADIUS_OPTIONS_AUTHENTICATED : RADIUS_OPTIONS_GUEST}
            userLocation={userLocation ?? undefined}
            onUserLocate={handleUserLocate}
            locationBanner={
              approximateLocation && (
                <ApproximateLocationBanner
                  city={approximateLocation.city}
                  onUseLocation={locateWithDevice}
                  onDismiss={dismissApproximateLocation}
                  className="absolute top-4 left-20 right-14 z-20"
                />
              )
            }
          />
        </div>

        {/* TruckDetailsModal moved to main return statement to avoid stale closure */}
        {searchTerm && listState !== 'collapsed' && (
          <LiveSearchList
            trucks={filteredTrucks}
            loading={loading}
            onTruckSelect={handleTruckSelect}
            userLocation={userLocation}
            listState={listState}
            onChangeState={handleListStateChange}
            onSortChange={handleSortChange}
            // onFilterClick temporarily disabled - advanced filters were buggy
            currentFilters={{
              maxDistance: filters.maxDistance,
              openNow: filters.openNow,
            }}
            onQuickFilterChange={handleQuickFilterChange}
            onAuthRequired={() => setIsAuthModalOpen(true)}
          />
        )}

        {/* Filter Modal */}
        <MobileFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          currentFilters={filters}
          onApplyFilters={handleApplyFilters}
        />

        {/* Authentication Modal */}
        <AuthModal
          mounted={true}
          resolvedTheme="dark"
          isOpen={isAuthModalOpen}
          onClose={handleAuthClose}
          onAuthSuccess={handleAuthSuccess}
        />

        {/* Interactive Bottom Sheet - only show for near-me view */}
        <MobileBottomSheet
          currentRoute={currentRoute}
          isSheetOpen={isSheetOpen}
          setIsSheetOpen={(open) => {
            setIsSheetOpen(open);
            if (!open) {
              // If sheet is closed by user, clear cluster selection
              setSelectedCluster(null);
            }
          }}
          loading={loading}
          error={error}
          filteredTrucks={filteredTrucks}
          fetchTrucks={() => {
            // Wrap the promise-returning function in a void context to avoid no-misused-promises error
            void fetchTrucks();
          }}
          isClient={isClient}
          userLocation={userLocation}
          onTruckSelect={handleOpenTruckDetail}
          onTruckMapSelect={(truck) => {
            setSelectedTruckId(truck.id);
            setSheetDetailTruck(truck);
          }}
          onAuthRequired={() => setIsAuthModalOpen(true)}
          selectedCluster={selectedCluster}
          onCloseCluster={handleCloseCluster}
          detailTruck={sheetDetailTruck}
          onCloseDetail={() => {
            setSheetDetailTruck(null);
          }}
          onCloseAll={() => {
            setSheetDetailTruck(null);
            setSelectedCluster(null);
            setIsSheetOpen(false);
          }}
          radiusMiles={filters.maxDistance}
        />

        <AppBottomNavigation
          activeItem={currentRoute}
          className="mobile-bottom-nav"
          onItemClick={handleNavigationVoid}
        />
      </div>
    ),
    [
      user,
      loadingAuth,
      handleAvatarClick,
      handleHomeClick,
      searchTerm,
      setSearchTerm,
      handleSearch,
      currentRoute,
      filteredTrucks,
      isClient,
      navigateTo,
      selectedTruckId,
      getSelectedTruckLocation,
      setSelectedTruckId,
      handleTruckSelect,
      isAuthModalOpen,
      handleAuthClose,
      handleAuthSuccess,
      isSheetOpen,
      setIsSheetOpen,
      loading,
      error,
      fetchTrucks,
      handleNavigationVoid,
      userLocation,
      handleUserLocate,
      approximateLocation,
      locateWithDevice,
      dismissApproximateLocation,
      listState,
      handleListStateChange,
      selectedFromList,
      sheetDetailTruck,
      selectedCluster,
      handleCloseCluster,
      handleClusterSelect,
      handleOpenTruckDetail,
      filters.maxDistance,
      setFilters,
      user,
    ],
  );

  return (
    <MobileErrorBoundary>
      <Suspense fallback={<MobilePageLoader message="Loading mobile experience..." />}>
        <title>{`TruckFull - ${getPageTitle()}`}</title>
        <meta charSet="utf-8" />
        {isClient ? (
          <>
            {renderMainContent()}
            {/* Modals - needed for avatar menu Settings and Profile buttons */}
            <SettingsModal />
            <ProfileModal />
            {/* Truck Details Modal - outside renderMainContent to avoid stale closure */}
            <TruckDetailsModal
              key={detailTruck?.id ?? 'closed'}
              truck={detailTruck}
              isOpen={!!detailTruck}
              onClose={handleCloseTruckDetail}
              onBack={selectedCluster ? handleCloseTruckDetail : undefined}
            />
          </>
        ) : (
          <MobilePageLoader message="Loading mobile experience..." />
        )}
      </Suspense>
    </MobileErrorBoundary>
  );
};

export default function MobileHome({
  initialSeed,
}: {
  readonly initialSeed?: NearbySeed;
}): React.JSX.Element {
  const isClient = useIsClient();

  return (
    <>
      <div className="mobile-client-experience">
        {isClient ? (
          <MobileNavigationProvider initialRoute="near-me">
            <Suspense fallback={<MobilePageLoader message="Loading mobile experience..." />}>
              <MobilePageContent initialSeed={initialSeed} />
            </Suspense>
          </MobileNavigationProvider>
        ) : (
          <MobilePageLoader message="Loading mobile experience..." />
        )}
      </div>
      <HomeNoScriptContent />
    </>
  );
}
