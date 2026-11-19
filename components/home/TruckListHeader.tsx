'use client';

import { useCallback, useState } from 'react';
import { X, ArrowUpDown, MapPin, Star, Utensils, Clock } from 'lucide-react';

import { FavoritesToggle } from '@/components/filters/FavoritesToggle';
import { useFiltersStore, type FiltersStore } from '@/lib/stores/useFiltersStore';
import { useFavorites } from '@/hooks/useFavorites';
import { countActiveFilters, getFilterSummary } from '@/lib/filters/utils';
import { DEFAULT_FILTERS } from '@/lib/filters/types';
import { AuthModal } from '@/components/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterChip } from '@/components/ui/FilterChip';
import { logError } from '@/lib/logging';

interface TruckListHeaderProps {
  readonly truckCount: number;
  readonly onToggleFavorites?: () => void;
  readonly currentSort?: string;
  readonly onSortChange?: (sortOption: string) => void;
  readonly isLoading?: boolean;
}

function HeaderContent({
  filters,
  truckCount,
  currentSort,
  onSortChange,
  onToggleFavorites,
  isAuthenticated,
  onClearFilters,
  onRemoveFilter,
  filterSummary,
  activeFiltersCount,
  isLoading,
}: {
  readonly filters: FiltersStore;
  readonly truckCount: number;
  readonly currentSort: string;
  readonly onSortChange: (value: string) => void;
  readonly onToggleFavorites: () => void;
  readonly isAuthenticated: boolean;
  readonly onClearFilters: () => void;
  readonly onRemoveFilter: (filterLabel: string) => void;
  readonly filterSummary: string[];
  readonly activeFiltersCount: number;
  readonly isLoading?: boolean;
}) {
  const headerText = filters.favoritesOnly ? 'Favorite Trucks' : 'Nearby Trucks';

  return (
    <div className="bg-secondary/50 overflow-hidden">
      <div className="px-6 py-1.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{headerText}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium min-w-[28px] text-center">
              {isLoading ? '…' : truckCount}
            </span>
          </div>

          {/* Controls section that wraps when space is limited */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sorting dropdown - compact with fixed width */}
            <div className="flex items-center gap-1 min-w-[120px] max-w-[140px]">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={currentSort} onValueChange={onSortChange}>
                <SelectTrigger className="w-full h-8 text-xs py-1.5 px-2 bg-secondary/50 border-border/20">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-xs">Distance</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="rating">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" />
                      <span className="text-xs">Rating</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="name">
                    <div className="flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5" />
                      <span className="text-xs">Name</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cuisine">
                    <div className="flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5" />
                      <span className="text-xs">Cuisine</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="open">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs">Open</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FavoritesToggle
              isActive={filters.favoritesOnly}
              onToggle={onToggleFavorites}
              isAuthenticated={isAuthenticated}
              className={cn(
                'transition-all duration-200 px-3 py-1.5 text-xs font-medium rounded-md min-w-[90px] max-w-[120px]',
                filters.favoritesOnly && 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md',
              )}
            />
          </div>
        </div>
      </div>

      {/* Active Filters Section */}
      {activeFiltersCount > 0 && (
        <div className="px-6 py-2 border-t border-border/20">
          <div className="flex flex-wrap items-center gap-1.5">
            {filterSummary.map((filter, index) => (
              <FilterChip
                key={index}
                label={filter}
                onRemove={() => onRemoveFilter(filter)}
                variant="outline"
                className="shadow-sm"
              />
            ))}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onClearFilters();
              }}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TruckListHeader({
  truckCount,
  onToggleFavorites,
  currentSort = 'distance',
  onSortChange,
  isLoading = false,
}: TruckListHeaderProps) {
  const filters = useFiltersStore();
  const { isAuthenticated } = useFavorites();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Calculate active filters count and summary
  const activeFiltersCount = countActiveFilters(filters);
  const filterSummary = getFilterSummary(filters);

  // Handle favorites toggle with auth check
  const handleFavoritesToggle = useCallback(() => {
    if (isAuthenticated) {
      // Toggle favorites filter
      filters.toggleFavoritesOnly();
      // Call optional callback if provided
      if (onToggleFavorites) {
        onToggleFavorites();
      }
    } else {
      // Open auth modal instead of navigating away
      setAuthModalOpen(true);
    }
  }, [isAuthenticated, filters, onToggleFavorites]);

  // Handle clearing all filters
  const handleClearFilters = useCallback(() => {
    const resetPromise = filters.resetFilters();
    if (resetPromise instanceof Promise) {
      resetPromise.catch((error) => logError('Error resetting filters:', error));
    }
  }, [filters]);

  // Handle removing specific filter
  const handleRemoveFilter = useCallback(
    (filterLabel: string) => {
      if (filterLabel.includes('Favorites')) {
        filters.toggleFavoritesOnly();
      } else if (filterLabel.includes('cuisine')) {
        // Find the specific cuisine and remove it
        const cuisineName = filterLabel.replace(' cuisine', '');
        filters.removeCuisine(cuisineName);
      } else if (filterLabel.includes('within') || filterLabel.includes('miles')) {
        filters.setRadiusMiles(DEFAULT_FILTERS.radiusMiles);
      } else if (filterLabel.includes('Open now')) {
        filters.toggleOpenNow();
      } else if (filterLabel.startsWith('"') && filterLabel.endsWith('"')) {
        filters.setSearchQuery(undefined);
      }
    },
    [filters],
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (value: string) => {
      onSortChange?.(value);
    },
    [onSortChange],
  );

  return (
    <>
      <HeaderContent
        filters={filters}
        truckCount={truckCount}
        currentSort={currentSort}
        onSortChange={handleSortChange}
        onToggleFavorites={handleFavoritesToggle}
        isAuthenticated={isAuthenticated}
        onClearFilters={handleClearFilters}
        onRemoveFilter={handleRemoveFilter}
        filterSummary={filterSummary}
        activeFiltersCount={activeFiltersCount}
        isLoading={isLoading}
      />

      <AuthModal
        mounted={true}
        resolvedTheme="light"
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={() => {
          setAuthModalOpen(false);
          // After successful auth, toggle favorites
          filters.toggleFavoritesOnly();
        }}
      />
    </>
  );
}
