'use client';

import type { SearchFilters } from '@/lib/search/types';
import { DollarSign } from 'lucide-react';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';

interface PriceRangeFilterProps {
  readonly filters: SearchFilters;
  readonly setFilters: (filters: SearchFilters) => void;
}

/**
 * Renders a filter for selecting a price range for food trucks.
 * @example
 * PriceRangeFilter({ filters: { priceRange: [1, 3] }, setFilters: someFunction })
 * <div>...</div>
 * @param {Object} filters - The current filter settings, including the price range.
 * @param {Function} setFilters - Function to update the filter settings.
 * @returns {JSX.Element} A container with a label and range selectors for price range filtering.
 * @description
 *   - The filter allows users to choose a price range between $ to $$$$
 *   - Displays the currently selected price range
 *   - Updates the price range value using the setFilters function whenever the value changes.
 */
export function PriceRangeFilter({
  filters: _filters,
  setFilters: _setFilters,
}: PriceRangeFilterProps) {
  // Price range is represented as a number from 1 to 4, where:
  // 1 = $ (inexpensive), 2 = $$ (moderate), 3 = $$$ (expensive), 4 = $$$$ (very expensive)
  const filters = useFiltersStore();
  const priceRange = filters.priceRange;
  const setPriceRange = filters.setPriceRange;

  // Generate price range labels
  const priceLabels = ['$', '$$', '$$$', '$$$$'];
  const currentLabel = priceLabels[priceRange ? priceRange - 1 : 0] || '';

  return (
    <div className="pt-2">
      <div className="flex items-center mb-2">
        <DollarSign className="size-4 mr-1 text-gray-600 dark:text-gray-300" />
        <label className="text-sm font-medium dark:text-gray-100">Max Price: {currentLabel}</label>
      </div>
      <div className="flex space-x-2">
        {[1, 2, 3, 4].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setPriceRange(level)}
            className={`flex-1 py-1 px-2 rounded text-sm border ${
              priceRange === level
                ? 'bg-blue-500 text-white border-blue-500 dark:bg-blue-600 dark:border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-600'
            }`}
          >
            {priceLabels[level - 1]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPriceRange(undefined)}
        className={`mt-2 text-xs ${
          priceRange === undefined
            ? 'text-blue-500 font-semibold'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Clear Price Filter
      </button>
    </div>
  );
}
