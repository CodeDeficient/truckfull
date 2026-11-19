'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useThemeSwitcher } from '@/components/ThemeProvider';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { AppHeader } from '@/components/home/AppHeader';
import { MainContent } from '@/components/home/MainContent';
import { AuthModal } from '@/components/auth';
import { useFoodTruckFinder } from '@/hooks/useFoodTruckFinder';
import type { NearbySeed } from '@/lib/filters/nearbyLoadPlan';
import { useFavorites } from '@/hooks/useFavorites';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import { useSettingsModalStore } from '@/lib/stores/useSettingsModalStore';
import { useProfileModalStore } from '@/lib/stores/useProfileModalStore';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { logDebug } from '@/lib/logging';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { PublicFoodTruck, FoodTruckDomain } from '@/lib/types';
import { shouldShowTruckStatus } from '@/lib/utils/foodTruckHelpers';
import { ApproximateLocationBanner } from '@/components/location/ApproximateLocationBanner';

const NON_SLUG_CHARS = /[^a-z0-9\s-]/g;
const WHITESPACE_RUNS = /\s+/g;
const DASH_RUNS = /-+/g;

const SettingsModal = dynamic(
  () => import('@/components/settings/SettingsModal').then((m) => ({ default: m.SettingsModal })),
  { ssr: false },
);
const ProfileModal = dynamic(
  () => import('@/components/profile/ProfileModal').then((m) => ({ default: m.ProfileModal })),
  { ssr: false },
);
const SearchFilters = dynamic(
  () => import('@/components/SearchFilters').then((m) => ({ default: m.SearchFilters })),
  { ssr: false, loading: () => <Skeleton className="h-10 w-full" /> },
);
const FeaturedDisplay = dynamic(
  () =>
    import('@/components/ui/featured/FeaturedDisplay').then((m) => ({
      default: m.FeaturedDisplay,
    })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);
const DiscoverFoodTrucks = dynamic(
  () => import('@/app/@mobile/discover_food_trucks/DiscoverFoodTrucks'),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

// Import styles for search overlay
import '@/styles/search-overlay.css';

/**
 * FoodTruckFinder is a React component that connects the UI components needed to search and display nearby food trucks.
 * @example
 * <FoodTruckFinder />
 * Renders a component that allows users to find food trucks based on their location.
 * @param None
 * @returns {JSX.Element} Returns the layout including the header and main content for the food truck finder application.
 * @description
 *   - Utilizes custom hooks `useFoodTruckFinder` and `useThemeSwitcher` for state management and theme switching.
 *   - It initiates a loading state screen while fetching data asynchronously.
 *   - Components inside include `AppHeader` and `MainContent` for interacting with the application.
 *   - The component supports theme switching between light and dark modes using `setTheme` and `resolvedTheme`.
 */
export interface FoodTruckFinderProps {
  readonly initialSeed?: NearbySeed;
}

export default function FoodTruckFinder({ initialSeed }: FoodTruckFinderProps = {}) {
  const {
    loading: trucksLoading,
    userLocation,
    loadNearbyTrucks,
    filteredTrucks,
    selectedTruckId,
    setSelectedTruckId,
    handleUserLocate,
    approximateLocation,
    locateWithDevice,
    dismissApproximateLocation,
  } = useFoodTruckFinder({ initialSeed });

  // Convert null to undefined for the component props
  const userLocationForProps = userLocation ?? undefined;

  const { resolvedTheme } = useThemeSwitcher();
  const { user, loading } = useSafeAuth();
  const isAuthenticated = Boolean(user);
  const loadingAuth = loading;
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [activePanel, setActivePanel] = useState<'discover' | 'featured' | null>(null);
  const searchParams = useSearchParams();
  const settingsModalStore = useSettingsModalStore();
  const profileModalStore = useProfileModalStore();

  // Device detection for responsive UI routing
  // const isMobile = useIsMobile(); // Currently unused

  // Use filters store for favorites state
  const filters = useFiltersStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, sonarjs/no-unused-vars, sonarjs/no-dead-store
  const { setSearchQuery } = filters;

  // Integrate favorites functionality
  const { favoriteIds, isFavorited, toggleFavorite } = useFavorites();

  useEffect(() => setMounted(true), []);

  // Handle URL parameter for opening settings modal
  useEffect(() => {
    if (searchParams.get('openSettings') === '1') {
      settingsModalStore.openModal('general', true);
    }
  }, [searchParams, settingsModalStore]);

  // Handle URL parameter for opening profile modal
  useEffect(() => {
    if (searchParams.get('openProfile') === '1') {
      profileModalStore.openModal(true);
    }
  }, [searchParams, profileModalStore]);

  // Auto-open Auth modal when ?auth=open is present, capturing returnTo for
  // post-auth navigation back to the originating page.
  useEffect(() => {
    if (searchParams.get('auth') === 'open') {
      setReturnTo(searchParams.get('returnTo'));
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Handle URL parameter for pre-selecting a truck (from SEO truck pages)
  // Track of last processed slug to allow re-navigation to different trucks
  const lastProcessedSlug = useRef<string | null>(null);

  // Track if a URL truck param exists to prevent user location centering
  // FLOW: URL param → hasUrlTruckParam → shouldSkipUserCenter prop → MapSection → MapboxMapComponent
  // User expects to go straight to truck's modal from URL, not their location
  const hasUrlTruckParam = useRef(false);

  useEffect(() => {
    const truckParam = searchParams.get('truck');
    hasUrlTruckParam.current = !!truckParam;

    logDebug('🔗 URL param effect:', {
      truckParam,
      lastProcessedSlug: lastProcessedSlug.current,
      filteredTrucksCount: filteredTrucks.length,
      shouldProcess: !!(
        (truckParam && lastProcessedSlug.current === truckParam) ||
        filteredTrucks.length === 0
      ),
    });

    // Skip if no truck param, already processed this slug, or trucks not loaded yet
    if (!truckParam || lastProcessedSlug.current === truckParam || filteredTrucks.length === 0)
      return;

    // First try to find by ID (for backwards compatibility)
    let matchingTruck = filteredTrucks.find((t) => t.id === truckParam);

    // If not found by ID, try by slug field
    matchingTruck ??= filteredTrucks.find((t) => t.slug === truckParam);

    // If still not found, try matching by name-derived slug
    // This handles cases where API doesn't return the slug field
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

    logDebug('🔗 Truck matching result:', {
      truckParam,
      foundTruck: matchingTruck?.name || 'NOT FOUND',
      truckId: matchingTruck?.id,
    });

    if (matchingTruck) {
      logDebug('🔗 Setting selectedTruckId:', matchingTruck.id);
      setSelectedTruckId(matchingTruck.id);
      lastProcessedSlug.current = truckParam;
    } else {
      logDebug('⚠️ No matching truck found for slug:', truckParam);
    }
  }, [searchParams, setSelectedTruckId, filteredTrucks]);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  // Create callbacks outside of JSX to avoid hooks violation
  const handleLoadNearbyTrucks = useCallback(() => {
    void loadNearbyTrucks();
  }, [loadNearbyTrucks]);

  // Filter changes are now handled by useFoodTruckFinder hook
  // Removed duplicate useEffect to prevent double API calls and flashing

  const handleToggleFavorite = useCallback(
    (truckId: string) => {
      void toggleFavorite(truckId, openModal);
    },
    [toggleFavorite, openModal],
  );

  // Helper to convert PublicFoodTruck to FoodTruckDomain for LiveSearchList compatibility
  const toFoodTruckDomain = useCallback(
    (truck: PublicFoodTruck): FoodTruckDomain => ({
      ...truck,
      _type: 'domain', // Discriminant property for reliable type detection
      description: truck.description ?? '', // Ensure description is always a string
      created_at: truck.created_at ?? undefined,
      updated_at: truck.updated_at ?? undefined,
      cuisine_type: Array.isArray(truck.cuisine_type) ? truck.cuisine_type : [],
      current_location: truck.current_location ?? null,
      operating_hours: truck.operating_hours ?? null,
      menu_items: truck.menu_items ?? [],
      data_quality_score: truck.data_quality_score ?? undefined,
      verification_status: truck.verification_status ?? undefined,
      last_synced_at: truck.last_synced_at ?? undefined,
      average_rating: truck.average_rating ?? 0, // Provide a default value
      review_count: truck.review_count ?? undefined,
      is_claimed: truck.is_claimed ?? null, // Add is_claimed for status checks
      // Add other necessary conversions or default values if FoodTruckDomain has stricter types
    }),
    [],
  );

  // Helper to check if a truck is open, compatible with both PublicFoodTruck and FoodTruckDomain
  const checkIsOpen = useCallback(
    (truck: PublicFoodTruck | FoodTruckDomain): boolean => {
      // Convert to FoodTruckDomain format if it's not already
      // Use menu_items property to distinguish between types since FoodTruckDomain requires it as MenuItem[]
      const truckDomain = Array.isArray((truck as FoodTruckDomain).menu_items)
        ? (truck as FoodTruckDomain) // already FoodTruckDomain
        : toFoodTruckDomain(truck as PublicFoodTruck); // convert from PublicFoodTruck

      // Get the raw tier value from the truck if available
      const rawTier = (truck as PublicFoodTruck & { subscription_tier?: string }).subscription_tier;
      // Only use the tier if it's a valid, non-empty string value
      const ownerTier =
        rawTier && typeof rawTier === 'string' && rawTier.trim() !== '' ? rawTier : undefined;

      // Use the new enhanced function and convert the result to boolean for consistency
      // This checks both if the truck has an owner and the subscription tier
      const status = shouldShowTruckStatus(truckDomain, ownerTier);
      return status ?? false;
    },
    [toFoodTruckDomain],
  );

  // Filter trucks based on favorites if needed
  const displayTrucks = useMemo(() => {
    let trucksToDisplay = filteredTrucks;
    if (filters?.favoritesOnly && isAuthenticated) {
      trucksToDisplay = filteredTrucks.filter((truck) => isFavorited(truck.id));
    }
    return trucksToDisplay.map((truck) =>
      // If it's already a FoodTruckDomain, return as is; otherwise convert from PublicFoodTruck
      Array.isArray((truck as FoodTruckDomain).menu_items)
        ? (truck as FoodTruckDomain)
        : toFoodTruckDomain(truck as PublicFoodTruck),
    );
  }, [filters?.favoritesOnly, filteredTrucks, isFavorited, isAuthenticated, toFoodTruckDomain]);

  return (
    <ResponsiveLayout
      desktopChildren={
        <div className="min-h-screen bg-background relative">
          <AppHeader
            userLocation={userLocationForProps}
            isAuthenticated={isAuthenticated}
            loadingAuth={loadingAuth}
            user={user}
            openModal={openModal}
            showSearchOverlay={showSearchOverlay}
            setShowSearchOverlay={setShowSearchOverlay}
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            onSearch={handleLoadNearbyTrucks}
          />

          {/* Search overlay that slides down from header - MOBILE ONLY */}
          {showSearchOverlay && (
            <div className="fixed top-16 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm p-2 search-overlay-bg md:hidden">
              <div className="container mx-auto search-overlay">
                <SearchFilters
                  onSearch={() => {
                    handleLoadNearbyTrucks();
                    setShowSearchOverlay(false); // Close overlay after search
                  }}
                />
              </div>
            </div>
          )}

          {/* Discover/Featured slide-over panel */}
          {activePanel && (
            <div className="fixed inset-0 z-40 flex justify-end">
              {/* Backdrop */}
              <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setActivePanel(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActivePanel(null);
                  }
                }}
                aria-label="Close panel"
                data-testid="panel-backdrop"
              />
              {/* Panel */}
              <div className="relative w-full max-w-lg bg-card shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-card">
                  <h2 className="text-xl font-bold text-foreground">
                    {activePanel === 'discover' ? 'Discover' : 'Featured'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActivePanel(null)}
                    className="text-foreground hover:bg-accent"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                {/* Panel content */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {activePanel === 'discover' ? (
                    <DiscoverFoodTrucks
                      onTruckSelect={(truck) => {
                        setSelectedTruckId(truck.id);
                        setActivePanel(null);
                      }}
                    />
                  ) : (
                    <FeaturedDisplay
                      showHeader={false}
                      className="!min-h-0"
                      contentClassName="!overflow-visible"
                      onTruckClick={(id) => {
                        setSelectedTruckId(id);
                        setActivePanel(null);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <MainContent
            filteredTrucks={displayTrucks}
            userLocation={userLocationForProps}
            selectedTruckId={selectedTruckId}
            setSelectedTruckId={setSelectedTruckId}
            isOpen={checkIsOpen}
            theme={resolvedTheme}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            isAuthenticated={isAuthenticated}
            shouldSkipUserCenter={hasUrlTruckParam.current}
            trucksLoading={trucksLoading}
            onUserLocate={handleUserLocate}
          />

          {approximateLocation && (
            <ApproximateLocationBanner
              city={approximateLocation.city}
              onUseLocation={locateWithDevice}
              onDismiss={dismissApproximateLocation}
              className="fixed top-20 left-1/2 z-30 w-max max-w-[calc(100%-2rem)] -translate-x-1/2"
            />
          )}

          <AuthModal
            mounted={mounted}
            resolvedTheme={resolvedTheme}
            isOpen={isModalOpen}
            onClose={closeModal}
            onAuthSuccess={closeModal}
            returnTo={returnTo}
          />

          <SettingsModal />
          <ProfileModal />
        </div>
      }
      mobileChildren={
        // Mobile UI will be handled by the parallel routing system (@mobile) in the main layout
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">📱 Mobile UI</h1>
            <p className="mb-6">Mobile experience loaded via parallel routing</p>
            <p className="text-sm text-muted-foreground">Using @mobile route system</p>
          </div>
        </div>
      }
    />
  );
}
