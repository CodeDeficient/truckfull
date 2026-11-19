/* eslint-disable max-lines-per-function -- NOTE: Factor into subcomponents later. */
'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import { type CuisineType } from '@/lib/filters/types';
import type { FoodTruck } from '@/lib/types';

interface CuisineChipsProps {
  /** Optional list of available food trucks to derive cuisines from */
  readonly trucks?: FoodTruck[];
  /** Optional predefined list of cuisine types */
  readonly availableCuisines?: string[];
  /** Whether to show a search input for filtering cuisines */
  readonly showSearch?: boolean;
  /** Whether to show the count badge for selected items */
  readonly showCountBadge?: boolean;
  /** Optional callback when cuisines change */
  readonly onCuisinesChange?: (cuisines: string[]) => void;
}

/**
 * Multi-select cuisine filter component using chips/badges for visual selection.
 * Integrates with the global filter store and supports URL synchronization.
 */
export function CuisineChips({
  trucks,
  availableCuisines,
  showSearch = false,
  showCountBadge = true,
  onCuisinesChange,
}: CuisineChipsProps) {
  const { cuisines, toggleCuisine, clearCuisines } = useFiltersStore();
  const [searchTerm, setSearchTerm] = React.useState('');

  // Derive unique cuisine types from trucks data or use provided list
  const derivedCuisines = React.useMemo(() => {
    if (availableCuisines && availableCuisines.length > 0) {
      return availableCuisines;
    }

    if (trucks && trucks.length > 0) {
      const cuisineSet = new Set<string>();
      for (const truck of trucks) {
        const list = truck.cuisine_type ?? [];
        for (const c of list) {
          const t = c?.trim();
          if (t && t.length > 0) {
            cuisineSet.add(t);
          }
        }
      }
      return [...cuisineSet].sort((a, b) => a.localeCompare(b));
    }

    // Fallback to default cuisine types from types file
    return [
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
    ];
  }, [trucks, availableCuisines]);

  // Filter cuisines based on search term
  const filteredCuisines = React.useMemo(() => {
    if (!searchTerm) return derivedCuisines;

    const lowerSearch = searchTerm.toLowerCase();
    return derivedCuisines.filter((cuisine) => cuisine.toLowerCase().includes(lowerSearch));
  }, [derivedCuisines, searchTerm]);

  const handleToggleCuisine = React.useCallback(
    (cuisine: string) => {
      // Only allow valid cuisine types
      if ((derivedCuisines as readonly string[]).includes(cuisine)) {
        toggleCuisine(cuisine as CuisineType); // Proper type assertion since we validated it's in the list
      }
      if (onCuisinesChange) {
        // Get the updated state right after the toggle
        const state = useFiltersStore.getState();
        onCuisinesChange(state.cuisines ?? []);
      }
    },
    [toggleCuisine, onCuisinesChange, derivedCuisines],
  );

  const handleClearAll = React.useCallback(() => {
    clearCuisines();
    if (onCuisinesChange) {
      // Get the updated state right after the clear
      const state = useFiltersStore.getState();
      onCuisinesChange(state.cuisines ?? []);
    }
  }, [clearCuisines, onCuisinesChange]);

  const selectedCount = cuisines.length;

  return (
    <div className="space-y-4">
      {/* Header with label and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Cuisine Types</span>
          {showCountBadge && selectedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedCount} selected
            </Badge>
          )}
        </div>
        {selectedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-7 text-xs">
            Clear all
          </Button>
        )}
      </div>

      {/* Search input (optional) */}
      {showSearch && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search cuisines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Cuisine chips */}
      <div className="flex flex-wrap gap-2">
        {filteredCuisines.map((cuisine) => {
          const isSelected = cuisines.includes(cuisine);
          return (
            <Badge
              key={cuisine}
              variant={isSelected ? 'default' : 'outline'}
              className={`
                cursor-pointer transition-all
                ${
                  isSelected
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }
              `}
              onClick={() => handleToggleCuisine(cuisine)}
            >
              {cuisine}
              {isSelected && (
                <X
                  className="ml-1 h-3 w-3"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleToggleCuisine(cuisine);
                  }}
                />
              )}
            </Badge>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredCuisines.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {searchTerm ? `No cuisines found matching "${searchTerm}"` : 'No cuisine types available'}
        </p>
      )}
    </div>
  );
}
