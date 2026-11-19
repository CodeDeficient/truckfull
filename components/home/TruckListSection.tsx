'use client';

import { useRef, useState } from 'react';
import type { PublicFoodTruck, FoodTruckDomain } from '@/lib/types';
import { TruckAccordionContent } from './TruckAccordionContent';
import { TruckListHeader } from './TruckListHeader';

interface TruckListSectionProps {
  readonly filteredTrucks: (PublicFoodTruck | FoodTruckDomain)[];
  readonly selectedTruckId: string | undefined;
  readonly setSelectedTruckId: (id: string | undefined) => void;
  readonly isOpen: (truck: PublicFoodTruck | FoodTruckDomain) => boolean;
  readonly userLocation: { lat: number; lng: number } | undefined;

  readonly favoriteIds?: Set<string>;
  readonly onToggleFavorite?: (truckId: string) => void;
  readonly isAuthenticated?: boolean;
  readonly className?: string;
  readonly isLoading?: boolean;
}

export function TruckListSection({
  filteredTrucks,
  selectedTruckId,
  setSelectedTruckId,
  isOpen,
  userLocation,

  favoriteIds,
  onToggleFavorite,
  isAuthenticated,
  className,
  isLoading = false,
}: Readonly<TruckListSectionProps>) {
  const [sortOption, setSortOption] = useState<string>('distance');
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`flex flex-col h-full w-full bg-card shadow-lg rounded-l-lg ${className ?? ''}`}
    >
      <TruckListHeader
        truckCount={filteredTrucks.length}
        currentSort={sortOption}
        onSortChange={setSortOption}
        isLoading={isLoading}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <TruckAccordionContent
          filteredTrucks={filteredTrucks}
          selectedTruckId={selectedTruckId}
          setSelectedTruckId={setSelectedTruckId}
          isOpen={isOpen}
          userLocation={userLocation}
          sortOption={sortOption}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
          isAuthenticated={isAuthenticated}
          scrollRef={scrollRef}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
