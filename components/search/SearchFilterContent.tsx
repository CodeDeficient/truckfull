'use client';

import { useState } from 'react';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import { type CuisineType } from '@/lib/filters/types';
import { MainSearchSection } from './MainSearchSection'; // Import from new file
import { AdvancedFilters } from './AdvancedFilters'; // Import from new file

interface SearchFilterContentProps {
  readonly onSearch?: () => void;
  readonly loading?: boolean;
}

/**
 * Renders the search filter content allowing users to adjust search criteria.
 * @example
 * SearchFilterContent({ onSearch: function, loading: true })
 * // Returns JSX for the search filter section with optional advanced filters.
 * @param {Object} props - The properties object.
 * @param {function} props.onSearch - Function to execute when a search is performed.
 * @param {boolean} props.loading - Indicates the loading state of search results.
 * @returns {JSX.Element} The JSX for the main and advanced search filter sections.
 * @description
 *   - Utilizes `useFiltersStore` hook to manage filter states and actions.
 *   - Renders `MainSearchSection` for primary filter options.
 *   - Conditionally renders `AdvancedFilters` when advanced view is toggled.
 */
export function SearchFilterContent({ onSearch, loading }: SearchFilterContentProps) {
  const filters = useFiltersStore();
  const openNow = filters.openNow;
  const priceRange = filters.priceRange;
  const radiusMiles = filters.radiusMiles ?? 30;
  const searchQuery = filters.searchQuery;
  const cuisines = filters.cuisines ?? [];
  const toggleOpenNow = filters.toggleOpenNow;
  const setPriceRange = filters.setPriceRange;
  const setRadiusMiles = filters.setRadiusMiles;
  const setSearchQuery = filters.setSearchQuery;
  const toggleCuisine = filters.toggleCuisine;
  const clearCuisines = filters.clearCuisines;
  const resetFilters = filters.resetFilters;

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Define cuisine types early so they can be used in type guards
  const cuisineTypes: readonly CuisineType[] = [
    'Mexican',
    'American',
    'Asian',
    'Italian',
    'BBQ',
    'Burgers',
    'Tacos',
    'Pizza',
    'Sandwiches',
    'Desserts',
    'Mediterranean',
    'Thai',
    'Vietnamese',
    'Chinese',
    'Japanese',
    'Korean',
    'Indian',
    'Greek',
    'French',
    'Vegan',
    'Vegetarian',
    'Seafood',
    'Breakfast',
    'Coffee & Tea',
    'Ice Cream',
    'Healthy',
    'Fusion',
  ] as const;

  const handleSearch = () => {
    onSearch?.();
  };

  const clearFiltersAll = () => {
    void resetFilters();
    onSearch?.();
  };

  const activeFilterCount = [
    Boolean(searchQuery),
    cuisines.length > 0,
    openNow === true,
    priceRange !== undefined,
  ].filter(Boolean).length;

  // Create functions that update the store directly
  const updateSearchQuery = (query: string) => setSearchQuery(query);
  const updateOpenNow = () => toggleOpenNow();
  const updateRadius = (radius: number) => setRadiusMiles(radius);
  const updatePriceRange = (priceRange: number | undefined) => setPriceRange(priceRange);

  // Type guard function to validate if a string is a CuisineType
  const isCuisineType = (cuisine: string): cuisine is CuisineType => {
    return (cuisineTypes as readonly string[]).includes(cuisine);
  };

  const addCuisine = (cuisine: string) => {
    // Only add cuisine if it's in the valid cuisine types list
    if (isCuisineType(cuisine)) {
      toggleCuisine(cuisine); // cuisine is now properly typed as CuisineType
    }
  };

  // Create a combined filter object for the child components
  const searchFilters: {
    openNow: boolean;
    priceRange?: number;
    radius: number;
    query: string;
    cuisine: string;
  } = {
    openNow: openNow ?? false,
    priceRange: priceRange, // This can be undefined, which is valid for SearchFilters
    radius: radiusMiles,
    query: searchQuery ?? '',
    cuisine: cuisines[0] ?? '', // Using first cuisine for compatibility
  };

  // Update filter function that can update multiple values
  const setFiltersCombined = (newFilters: {
    openNow: boolean;
    priceRange?: number;
    radius: number;
    query: string;
    cuisine: string;
  }) => {
    if (newFilters.query !== searchFilters.query) {
      updateSearchQuery(newFilters.query);
    }
    if (newFilters.openNow !== searchFilters.openNow && newFilters.openNow !== openNow) {
      updateOpenNow();
    }
    if (newFilters.radius !== searchFilters.radius) {
      updateRadius(newFilters.radius);
    }
    if (newFilters.priceRange !== searchFilters.priceRange) {
      updatePriceRange(newFilters.priceRange);
    }
    if (newFilters.cuisine !== searchFilters.cuisine) {
      const isValidCuisine =
        newFilters.cuisine && (cuisineTypes as readonly string[]).includes(newFilters.cuisine);
      if (isValidCuisine) {
        addCuisine(newFilters.cuisine as CuisineType);
      } else {
        clearCuisines();
      }
    }
  };

  return (
    <div className="space-y-2">
      <MainSearchSection
        filters={searchFilters}
        setFilters={setFiltersCombined}
        _loading={loading}
        handleSearch={handleSearch}
        _showAdvanced={showAdvanced}
        _setShowAdvanced={setShowAdvanced}
        _activeFilterCount={activeFilterCount}
      />
      {showAdvanced && (
        <AdvancedFilters
          filters={searchFilters}
          setFilters={setFiltersCombined}
          clearFilters={clearFiltersAll}
          cuisineTypes={cuisineTypes}
        />
      )}
    </div>
  );
}
