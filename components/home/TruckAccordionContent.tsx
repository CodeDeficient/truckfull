'use client';

import React, { useCallback, useMemo, type RefObject } from 'react';
import { TruckAccordionItem } from '@/components/trucks/TruckAccordionItem';
import type { PublicFoodTruck, FoodTruckDomain } from '@/lib/types';
import { sortTrucks } from '@/lib/utils/truckSorting';
import { useVirtualRows } from './useVirtualRows';

interface TruckAccordionContentProps {
  readonly filteredTrucks: (PublicFoodTruck | FoodTruckDomain)[];
  readonly selectedTruckId: string | undefined;
  readonly setSelectedTruckId: (id: string | undefined) => void;
  readonly isOpen: (truck: PublicFoodTruck | FoodTruckDomain) => boolean;
  readonly userLocation: { lat: number; lng: number } | undefined;
  readonly favoriteIds?: Set<string>;
  readonly onToggleFavorite?: (truckId: string) => void;
  readonly isAuthenticated?: boolean;
  readonly sortOption?: string;
  readonly scrollRef: RefObject<HTMLElement | null>;
  readonly isLoading?: boolean;
}

const ESTIMATED_ROW_HEIGHT = 66;

export const TruckAccordionContent: React.FC<TruckAccordionContentProps> = ({
  filteredTrucks,
  selectedTruckId,
  setSelectedTruckId,
  isOpen,
  userLocation,
  favoriteIds,
  onToggleFavorite,
  isAuthenticated: _isAuthenticated,
  sortOption = 'distance',
  scrollRef,
  isLoading = false,
}) => {
  const mappedSort = sortOption === 'open' ? 'status' : sortOption;
  const sortedTrucks = useMemo(
    () =>
      sortTrucks(
        filteredTrucks,
        mappedSort as 'distance' | 'name' | 'status' | 'rating',
        userLocation,
      ),
    [filteredTrucks, mappedSort, userLocation],
  );

  const rowKeys = useMemo(() => sortedTrucks.map((truck) => truck.id), [sortedTrucks]);
  const { startIndex, endIndex, offsetY, totalHeight, measure } = useVirtualRows({
    keys: rowKeys,
    estimatedItemHeight: ESTIMATED_ROW_HEIGHT,
    scrollRef,
  });

  const measureRow = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const key = node.dataset.rowKey;
      if (key) measure(key, node.getBoundingClientRect().height);
    },
    [measure],
  );

  if (isLoading && sortedTrucks.length === 0) {
    return (
      <div className="space-y-2 p-3" aria-busy="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-14 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (sortedTrucks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No food trucks found in your area.</p>
        <p className="text-sm mt-2">Try expanding your search radius or check back later!</p>
      </div>
    );
  }

  const visibleTrucks = sortedTrucks.slice(startIndex, endIndex);

  return (
    <div style={{ height: totalHeight, position: 'relative' }}>
      <div style={{ transform: `translateY(${offsetY}px)` }}>
        {visibleTrucks.map((truck, offset) => {
          const index = startIndex + offset;
          return (
            <div
              key={truck.id}
              ref={measureRow}
              data-row-key={truck.id}
              style={{ paddingBottom: 8 }}
            >
              <TruckAccordionItem
                truck={truck}
                selectedTruckId={selectedTruckId}
                setSelectedTruckId={setSelectedTruckId}
                isOpen={isOpen}
                userLocation={userLocation}
                isFavorited={favoriteIds?.has(truck.id) ?? false}
                onToggleFavorite={() => onToggleFavorite?.(truck.id)}
                isFirst={index === 0}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
