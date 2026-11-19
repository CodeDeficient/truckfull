'use client';

import { useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';

const FILTER_PARAM_NAMES = ['favorites', 'cuisines', 'radius', 'lat', 'lng', 'q', 'openNow'] as const;

export function hasFilterParams(params: URLSearchParams): boolean {
  return FILTER_PARAM_NAMES.some((name) => params.has(name));
}

export function buildFilterURL(pathname: string, params: URLSearchParams): string {
  const paramString = params.toString();
  return paramString ? `${pathname}?${paramString}` : pathname;
}

/**
 * Custom hook to synchronize filter state with URL query parameters.
 * Provides shallow routing to avoid full page reloads.
 *
 * @example
 * ```tsx
 * function SearchPage() {
 *   const { syncToURL, loadFromCurrentURL } = useFilterURLSync();
 *
 *   // Load filters from URL on mount
 *   useEffect(() => {
 *     loadFromCurrentURL();
 *   }, []);
 *
 *   // Sync to URL when filters change
 *   const handleFilterChange = () => {
 *     syncToURL();
 *   };
 * }
 * ```
 */
export function useFilterURLSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const loadFromURL = useFiltersStore((state) => state.loadFromURL);
  const toURLSearchParams = useFiltersStore((state) => state.toURLSearchParams);

  /**
   * Load filters from current URL search params.
   * URL takes precedence over localStorage.
   */
  const loadFromCurrentURL = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    loadFromURL(params);
  }, [searchParams, loadFromURL]);

  /**
   * Sync current filter state to URL using shallow routing.
   * This updates the URL without triggering a full page reload.
   */
  const syncToURL = useCallback(() => {
    const params = toURLSearchParams();
    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    // Use shallow routing to update URL without reload
    router.replace(newURL, { scroll: false });
  }, [pathname, router, toURLSearchParams]);

  /**
   * Clear all filters and update URL
   */
  const clearFiltersAndURL = useCallback(() => {
    const resetFilters = useFiltersStore.getState().resetFilters;
    void resetFilters();
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  /**
   * Check if URL has any filter params
   */
  const hasURLFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    return (
      params.has('favorites') ||
      params.has('cuisines') ||
      params.has('radius') ||
      params.has('lat') ||
      params.has('lng') ||
      params.has('q') ||
      params.has('openNow')
    );
  }, [searchParams]);

  // Load from URL on mount and when URL changes
  useEffect(() => {
    if (hasURLFilters()) {
      loadFromCurrentURL();
    }
  }, [searchParams]); // Only re-run when searchParams change

  return {
    syncToURL,
    loadFromCurrentURL,
    clearFiltersAndURL,
    hasURLFilters,
  };
}
