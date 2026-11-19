'use client';

import React, { useState, useMemo } from 'react';
import { CuisineCard } from '@/components/cuisine/CuisineCard';
import type { FoodTruck } from '@/lib/types';
import { CUISINE_TYPES } from '@/lib/filters/types';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface CuisineExplorationProps {
  /** Optional list of food trucks to provide stats for each cuisine */
  readonly trucks?: FoodTruck[];
  /** Callback when a cuisine is selected */
  readonly onCuisineSelect: (cuisineType: string) => void;
  /** Currently selected cuisines */
  readonly selectedCuisines?: string[];
  /** Optional CSS classes */
  readonly className?: string;
  /** Optional external search term (controlled mode) */
  readonly searchTerm?: string;
  /** Whether to show the internal search bar */
  readonly showSearch?: boolean;
}

/**
 * A card-based interface for exploring different cuisine types
 * Similar to Truckster's Explore section with visual cards for cuisine selection
 */
export function CuisineExploration({
  trucks,
  onCuisineSelect,
  selectedCuisines = [],
  className,
  showSearch = true,
  searchTerm: externalSearchTerm,
}: CuisineExplorationProps): React.ReactElement {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');

  // Use external search term if provided, otherwise use internal state
  const searchTerm = externalSearchTerm === undefined ? internalSearchTerm : externalSearchTerm;

  // Cuisine consolidation map - child cuisines are grouped under parent
  const cuisineConsolidation: Record<string, string> = {
    Burgers: 'American',
    Tacos: 'Mexican',
  };

  // Cuisines that are consolidated (hidden as separate cards)
  const consolidatedCuisines = Object.keys(cuisineConsolidation);

  // Group trucks by cuisine type (case-insensitive matching)
  const trucksByCuisine = useMemo(() => {
    if (!trucks) return {};

    const grouped: Record<string, FoodTruck[]> = {};
    const seenTruckIds: Record<string, Set<string>> = {};

    for (const cuisine of CUISINE_TYPES) {
      grouped[cuisine] = [];
      seenTruckIds[cuisine] = new Set();
    }

    for (const truck of trucks) {
      const cuisineTypes = Array.isArray(truck.cuisine_type) ? truck.cuisine_type : [];

      for (const truckCuisine of cuisineTypes) {
        if (!truckCuisine) continue;

        const normalizedTruckCuisine = truckCuisine.toLowerCase().trim();

        // Find matching CUISINE_TYPE (case-insensitive, partial match)
        for (const cuisineType of CUISINE_TYPES) {
          const normalizedCuisineType = cuisineType.toLowerCase();

          // Match if either contains the other (handles "Mexican" matching "mexican food" etc.)
          if (
            normalizedTruckCuisine.includes(normalizedCuisineType) ||
            normalizedCuisineType.includes(normalizedTruckCuisine)
          ) {
            // Check if this cuisine should be consolidated into a parent
            const targetCuisine = cuisineConsolidation[cuisineType] ?? cuisineType;

            if (!seenTruckIds[targetCuisine]) {
              seenTruckIds[targetCuisine] = new Set();
              grouped[targetCuisine] = [];
            }

            if (!seenTruckIds[targetCuisine].has(truck.id)) {
              seenTruckIds[targetCuisine].add(truck.id);
              grouped[targetCuisine].push(truck);
            }
          }
        }
      }
    }

    return grouped;
  }, [trucks]);

  // Filter cuisines: by search term AND must have at least 1 truck
  const filteredCuisines = useMemo(() => {
    let cuisines = [...CUISINE_TYPES];

    // Filter by search term if provided
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      cuisines = cuisines.filter((cuisine) => cuisine.toLowerCase().includes(lowerSearch));
    }

    // Only show cuisines that have trucks AND are not consolidated into parents
    cuisines = cuisines.filter((cuisine) => {
      const count = trucksByCuisine[cuisine]?.length ?? 0;
      const isConsolidated = consolidatedCuisines.includes(cuisine);
      return count > 0 && !isConsolidated;
    });

    return cuisines;
  }, [searchTerm, trucksByCuisine]);

  const handleCuisineSelect = (cuisineType: string): void => {
    onCuisineSelect(cuisineType);
  };

  return (
    <div className={className}>
      {showSearch && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search cuisines..."
            value={internalSearchTerm}
            onChange={(e) => setInternalSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 px-1">
        {filteredCuisines.map((cuisineType) => {
          // Get trucks for this specific cuisine
          const cuisineTrucks = trucksByCuisine[cuisineType] || [];

          return (
            <CuisineCard
              key={cuisineType}
              cuisineType={cuisineType}
              trucks={cuisineTrucks}
              onSelect={handleCuisineSelect}
              isSelected={selectedCuisines.includes(cuisineType)}
              size="medium"
            />
          );
        })}
      </div>

      {filteredCuisines.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm
            ? `No cuisines found matching "${searchTerm}"`
            : 'No cuisines with trucks in your area'}
        </div>
      )}
    </div>
  );
}
