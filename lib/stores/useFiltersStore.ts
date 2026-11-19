import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FiltersState, UserLocation, CuisineType } from '@/lib/filters/types';
import { DEFAULT_FILTERS, STORAGE_KEYS, CUISINE_TYPES } from '@/lib/filters/types';
import { getSupabase } from '@/lib/supabase/client';
import { logWarning } from '@/lib/logging';
import { SIGNED_IN_MAX_RADIUS_MILES } from '@/lib/api/trucks/radiusLimits';

const FILTERS_STORE_VERSION = 1;

/**
 * Get initial state based on authentication status
 * Returns different radius based on whether user is authenticated
 */
export const getInitialState = async (): Promise<FiltersState> => {
  try {
    const supabase = getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, sonarjs/no-unused-vars
    const _isAuthenticated = session?.user !== undefined;

    return { ...DEFAULT_FILTERS };
  } catch (error) {
    // If there's an error checking auth status, default to unauthenticated state
    logWarning('Error checking auth status for initial state:', error);
    return { ...DEFAULT_FILTERS };
  }
};

/**
 * Actions available for the filters store
 */
interface FiltersActions {
  /** Set a single filter value */
  setFilter: <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => void;

  /** Set multiple filters at once */
  setFilters: (filters: Partial<FiltersState>) => void;

  /** Reset all filters to default values */
  resetFilters: () => Promise<void>;

  /** Set user location */
  setUserLocation: (location: UserLocation | undefined) => void;

  /** Toggle favorites only filter */
  toggleFavoritesOnly: () => void;

  /** Add a cuisine to the filter */
  addCuisine: (cuisine: string) => void;

  /** Remove a cuisine from the filter */
  removeCuisine: (cuisine: string) => void;

  /** Toggle a cuisine in the filter */
  toggleCuisine: (cuisine: CuisineType) => void;

  /** Clear all cuisine filters */
  clearCuisines: () => void;

  /** Set search query */
  setSearchQuery: (query: string | undefined) => void;

  /** Set radius in miles */
  setRadiusMiles: (radius: number) => void;

  /** Toggle open now filter */
  toggleOpenNow: () => void;

  /** Set price range filter */
  setPriceRange: (priceRange: number | undefined) => void;

  /** Load filters from URL search params */
  loadFromURL: (searchParams: URLSearchParams) => void;

  /** Get URL search params from current filters */
  toURLSearchParams: () => URLSearchParams;
}

/**
 * Complete store type
 */
export type FiltersStore = FiltersState & FiltersActions;

/**
 * Partial state that gets persisted
 */
type PersistedFiltersState = Pick<
  FiltersState,
  | 'favoritesOnly'
  | 'cuisines'
  | 'radiusMiles'
  | 'userLocation'
  | 'openNow'
  | 'priceRange'
  | 'searchQuery'
>;

/**
 * Main filters store with persistence and URL synchronization
 */
export const useFiltersStore = create<FiltersStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_FILTERS,

      // Actions
      setFilter: (key: keyof FiltersState, value: FiltersState[typeof key]) =>
        set({ [key]: value }),

      setFilters: (filters: Partial<FiltersState>) => set(filters),

      resetFilters: async () => {
        set({ ...DEFAULT_FILTERS, userLocation: get().userLocation });
      },

      setUserLocation: (location: UserLocation | undefined) => set({ userLocation: location }),

      toggleFavoritesOnly: () =>
        set((state: FiltersState) => ({ favoritesOnly: !(state?.favoritesOnly ?? false) })),

      addCuisine: (cuisine: string) =>
        set((state: FiltersState) => ({
          cuisines: state?.cuisines?.includes(cuisine)
            ? state.cuisines
            : [...(state?.cuisines ?? []), cuisine],
        })),

      removeCuisine: (cuisine: string) =>
        set((state: FiltersState) => ({
          cuisines: state?.cuisines?.filter((c) => c !== cuisine) ?? [],
        })),

      toggleCuisine: (cuisine: CuisineType) =>
        set((state: FiltersState) => {
          // Add guard to only allow valid cuisines
          if (!cuisine || !CUISINE_TYPES.includes(cuisine)) {
            return { cuisines: state.cuisines ?? [] }; // Return unchanged if invalid cuisine
          }
          const cuisines = state.cuisines ?? [];
          return {
            cuisines: cuisines.includes(cuisine)
              ? cuisines.filter((c) => c !== cuisine)
              : [...cuisines, cuisine],
          };
        }),

      clearCuisines: () => set({ cuisines: [] }),

      setSearchQuery: (query: string | undefined) => set({ searchQuery: query }),

      setRadiusMiles: (radius: number) => set({ radiusMiles: radius }),

      toggleOpenNow: () => set((state: FiltersState) => ({ openNow: !(state?.openNow ?? false) })),

      setPriceRange: (priceRange: number | undefined) => set({ priceRange }),

      loadFromURL: (searchParams: URLSearchParams) => {
        const filters: Partial<FiltersState> = {};

        // Parse favorites
        const favoritesParam = searchParams.get('favorites');
        if (favoritesParam != undefined) {
          filters.favoritesOnly = favoritesParam === '1' || favoritesParam === 'true';
        }

        // Parse cuisines
        const cuisinesParam = searchParams.get('cuisines');
        if (cuisinesParam != undefined && cuisinesParam !== '') {
          filters.cuisines = cuisinesParam.split(',').filter(Boolean);
        }

        // Parse radius
        const radiusParam = searchParams.get('radius');
        if (radiusParam != undefined && radiusParam !== '') {
          const radius = Number.parseFloat(radiusParam);
          if (!Number.isNaN(radius) && radius > 0) {
            filters.radiusMiles = Math.min(radius, SIGNED_IN_MAX_RADIUS_MILES);
          }
        }

        // Parse location
        const latParam = searchParams.get('lat');
        const lngParam = searchParams.get('lng');
        if (latParam != undefined && latParam !== '' && lngParam != undefined && lngParam !== '') {
          const lat = Number.parseFloat(latParam);
          const lng = Number.parseFloat(lngParam);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            filters.userLocation = { lat, lng };
          }
        }

        // Parse search query
        const searchParam = searchParams.get('q');
        if (searchParam != undefined && searchParam !== '') {
          filters.searchQuery = searchParam;
        }

        // Parse open now
        const openNowParam = searchParams.get('openNow');
        if (openNowParam != undefined) {
          filters.openNow = openNowParam === '1' || openNowParam === 'true';
        }

        set(filters);
      },

      toURLSearchParams: () => {
        const state = get();
        const params = new URLSearchParams();

        // Add favorites
        if (state.favoritesOnly) {
          params.set('favorites', '1');
        }

        // Add cuisines
        if (state.cuisines.length > 0) {
          params.set('cuisines', state.cuisines.join(','));
        }

        // Add radius
        if (state.radiusMiles !== DEFAULT_FILTERS.radiusMiles) {
          params.set('radius', state.radiusMiles.toString());
        }

        // Add location
        if (state.userLocation) {
          params.set('lat', state.userLocation.lat.toString());
          params.set('lng', state.userLocation.lng.toString());
        }

        // Add search query
        if (typeof state.searchQuery === 'string' && state.searchQuery.length > 0) {
          params.set('q', state.searchQuery);
        }

        // Add open now
        if (state.openNow === true) {
          params.set('openNow', '1');
        }

        return params;
      },
    }),
    {
      name: STORAGE_KEYS.FILTERS,
      version: FILTERS_STORE_VERSION,
      migrate: (persistedState: unknown) => ({
        ...(persistedState as PersistedFiltersState),
        radiusMiles: DEFAULT_FILTERS.radiusMiles,
      }),
      storage: createJSONStorage(() => localStorage),
      partialize: (state: FiltersStore) =>
        ({
          favoritesOnly: state.favoritesOnly,
          cuisines: state.cuisines,
          radiusMiles: state.radiusMiles,
          userLocation: state.userLocation,
          openNow: state.openNow,
          priceRange: state.priceRange,
          searchQuery: state.searchQuery, // Added: persist search query
        }) as PersistedFiltersState,

      // Rehydrate storage callback to handle state initialization
      onRehydrateStorage: () => {},
    },
  ),
);

// Type assertion for the hook return type
export type UseFiltersStore = ReturnType<typeof useFiltersStore>;
