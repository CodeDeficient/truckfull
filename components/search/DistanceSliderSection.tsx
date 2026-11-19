'use client';

import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import type { SearchFilters } from '@/lib/search/types';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';

/**
 * Renders a slider for selecting a distance radius in kilometers.
 * @example
 * DistanceSliderSection({ filters: { radius: 25 }, setFilters: someFunction })
 * <div>...</div>
 * @param {Object} filters - The current filter settings, including the radius.
 * @param {Function} setFilters - Function to update the filter settings.
 * @returns {JSX.Element} A container with a label, slider, and range indicators for distance selection.
 * @description
 *   - The slider allows users to choose a distance between 1 km to 50 km.
 *   - Displays the currently selected radius beside the slider.
 *   - Updates the radius value using the setFilters function whenever the slider value changes.
 */
interface DistanceSliderSectionProps {
  readonly filters: SearchFilters;
  readonly setFilters: (filters: SearchFilters) => void;
}

export function DistanceSliderSection({ filters, setFilters }: DistanceSliderSectionProps) {
  const filtersStore = useFiltersStore();
  const radiusMiles = filtersStore.radiusMiles;
  const setRadiusMiles = filtersStore.setRadiusMiles;
  const { user } = useSafeAuth();

  // Update local state when radius changes, but also sync with global store
  const handleRadiusChange = (newRadius: number) => {
    // Update the global store
    setRadiusMiles(newRadius);

    // Call the parent's setFilters function if radius is part of filters
    setFilters({ ...filters, radius: newRadius });
  };

  // Determine max radius based on authentication status
  const maxRadius = user ? 500 : 100;

  return (
    <div>
      <label className="text-sm font-medium mb-2 block dark:text-gray-100">
        Distance: {radiusMiles} mi
      </label>
      <input
        type="range"
        min="1"
        max={maxRadius}
        value={radiusMiles}
        onChange={(e) => handleRadiusChange(Number(e.target.value))}
        className="w-full accent-blue-600 dark:accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>1 mi</span>
        <span>{maxRadius} mi</span>
      </div>
    </div>
  );
}
