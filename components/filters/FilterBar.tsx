'use client';

import { Filter } from 'lucide-react';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoritesToggle } from './FavoritesToggle';
import { CuisineFilter } from './CuisineFilter';
import { RadiusControl } from './RadiusControl';
import { FilterSettingsModal } from './FilterSettingsModal';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { countActiveFilters } from '@/lib/filters/utils';
import { handleResetFilters } from '@/lib/utils/filterUtils';

interface FilterBarProps {
  /** Optional CSS classes */
  readonly className?: string;
  /** Whether to show as a compact bar */
  readonly compact?: boolean;
}

// Extracted mobile sheet content to reduce main component length
interface MobileFiltersProps {
  readonly favoritesOnly: boolean;
  readonly onToggleFavorites: () => void;
  readonly isAuthenticated: boolean;
  readonly cuisines: string[];
  readonly onCuisinesChange: (cuisines: string[]) => void;
  readonly radiusMiles: number;
  readonly onRadiusChange: (radius: number) => void;
  readonly hasLocation: boolean;
  readonly openNow: boolean;
  readonly onOpenNowChange: (value: boolean) => void;
  readonly activeFilterCount: number;
  readonly onResetFilters: () => void | Promise<void>;
}

function MobileFiltersContent({
  favoritesOnly,
  onToggleFavorites,
  isAuthenticated,
  cuisines,
  onCuisinesChange,
  radiusMiles,
  onRadiusChange,
  hasLocation,
  openNow,
  onOpenNowChange,
  activeFilterCount,
  onResetFilters,
}: MobileFiltersProps) {
  return (
    <div className="space-y-6 py-4">
      {/* Favorites */}
      <div>
        <h3 className="text-sm font-medium mb-3">Favorites</h3>
        <FavoritesToggle
          isActive={favoritesOnly}
          onToggle={onToggleFavorites}
          isAuthenticated={isAuthenticated}
          className="w-full justify-start"
        />
      </div>

      {/* Cuisines */}
      <div>
        <h3 className="text-sm font-medium mb-3">Cuisines</h3>
        <CuisineFilter
          selectedCuisines={cuisines}
          onCuisinesChange={onCuisinesChange}
          showChips={false}
        />
      </div>

      {/* Radius */}
      <div>
        <h3 className="text-sm font-medium mb-3">Distance</h3>
        <RadiusControl value={radiusMiles} onChange={onRadiusChange} hasLocation={hasLocation} />
      </div>

      {/* Open Now */}
      <div>
        <h3 className="text-sm font-medium mb-3">Availability</h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={openNow}
            onChange={(e) => onOpenNowChange(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Open now</span>
        </label>
      </div>

      {/* Clear all button */}
      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          onClick={() => handleResetFilters(onResetFilters)}
          className="w-full"
        >
          Clear all filters
        </Button>
      )}
    </div>
  );
}

// Extracted desktop filter bar
interface DesktopFiltersProps {
  readonly className?: string;
  readonly compact?: boolean;
  readonly favoritesOnly: boolean;
  readonly onToggleFavorites: () => void;
  readonly isAuthenticated: boolean;
  readonly cuisines: string[];
  readonly onCuisinesChange: (cuisines: string[]) => void;
  readonly userHasLocation: boolean;
  readonly radiusMiles: number;
  readonly openNow: boolean;
  readonly onOpenNowChange: (value: boolean) => void;
  readonly activeFilterCount: number;
  readonly onResetFilters: () => void | Promise<void>;
}

function DesktopFiltersBar({
  className,
  compact = false,
  favoritesOnly,
  onToggleFavorites,
  isAuthenticated,
  cuisines,
  onCuisinesChange,
  userHasLocation,
  radiusMiles,
  openNow,
  onOpenNowChange,
  activeFilterCount,
  onResetFilters,
}: DesktopFiltersProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4',
        compact ? 'flex-wrap' : 'justify-between',
        className,
      )}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {/* Favorites toggle */}
        <FavoritesToggle
          isActive={favoritesOnly}
          onToggle={onToggleFavorites}
          isAuthenticated={isAuthenticated}
        />

        {/* Cuisine filter */}
        <div className="flex-1 min-w-[200px]">
          <CuisineFilter selectedCuisines={cuisines} onCuisinesChange={onCuisinesChange} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Radius control - compact summary for bar */}
        {compact && userHasLocation && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Radius:</span>
            <Badge variant="secondary" className="font-mono">
              {radiusMiles} mi
            </Badge>
          </div>
        )}

        {/* Settings modal */}
        <FilterSettingsModal openNow={openNow} onOpenNowChange={onOpenNowChange} />

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleResetFilters(onResetFilters)}
            className="text-muted-foreground"
          >
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Main filter bar component that hosts all filter controls.
 * Responsive design collapses into a sheet on mobile devices.
 */
export function FilterBar({ className, compact = false }: FilterBarProps) {
  const filters = useFiltersStore();
  const { isAuthenticated } = useFavorites();

  const activeFilterCount = countActiveFilters(filters);

  return (
    <>
      {/* Mobile view - collapsible sheet */}
      <div className="sm:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Refine your food truck search</SheetDescription>
            </SheetHeader>
            <MobileFiltersContent
              favoritesOnly={filters.favoritesOnly}
              onToggleFavorites={filters.toggleFavoritesOnly}
              isAuthenticated={isAuthenticated}
              cuisines={filters.cuisines}
              onCuisinesChange={(cuisines) => filters.setFilter('cuisines', cuisines)}
              radiusMiles={filters.radiusMiles}
              onRadiusChange={(radius) => filters.setFilter('radiusMiles', radius)}
              hasLocation={Boolean(filters.userLocation)}
              openNow={filters.openNow ?? false}
              onOpenNowChange={(value) => filters.setFilter('openNow', value)}
              activeFilterCount={activeFilterCount}
              onResetFilters={() => handleResetFilters(filters.resetFilters.bind(filters))}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop view - horizontal bar */}
      <div className="hidden sm:block">
        <DesktopFiltersBar
          className={className}
          compact={compact}
          favoritesOnly={filters.favoritesOnly}
          onToggleFavorites={filters.toggleFavoritesOnly}
          isAuthenticated={isAuthenticated}
          cuisines={filters.cuisines}
          onCuisinesChange={(cuisines) => filters.setFilter('cuisines', cuisines)}
          userHasLocation={Boolean(filters.userLocation)}
          radiusMiles={filters.radiusMiles}
          openNow={filters.openNow ?? false}
          onOpenNowChange={(value) => filters.setFilter('openNow', value)}
          activeFilterCount={activeFilterCount}
          onResetFilters={() => handleResetFilters(filters.resetFilters.bind(filters))}
        />
      </div>
    </>
  );
}

/**
 * Standalone radius control for use in expanded filter sections
 */
export function FilterBarRadiusControl() {
  const { radiusMiles, setFilter, userLocation } = useFiltersStore();

  return (
    <RadiusControl
      value={radiusMiles}
      onChange={(radius) => setFilter('radiusMiles', radius)}
      hasLocation={!!userLocation}
    />
  );
}
