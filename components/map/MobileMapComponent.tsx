'use client';

import React, { useEffect, useCallback } from 'react';
import type { FoodTruckDomain, FoodTruck } from '@/lib/types';
import { convertToFoodTruck } from '@/lib/utils/truckUtils';
import { OptimizedMapComponent } from './DynamicMapComponent';
import { logDebug } from '@/lib/logging';

interface MobileMapComponentProps {
  trucks: FoodTruckDomain[];
  theme?: 'light' | 'dark';
  selectedTruckId?: string;
  selectedTruckLocation?: [number, number];
  onSelectTruck?: (id: string | undefined) => void;
  isClient: boolean;
  customOffset?: [number, number]; // Custom offset for smart centering
  onClusterSelect?: (clusterId: number, trucks: FoodTruck[]) => void;
  shouldSkipUserCenter?: boolean; // Skip auto-centering on user location when URL param exists
  userLocation?: { lat: number; lng: number };
  onUserLocate?: (location: { lat: number; lng: number }) => void;
}

/**
 * Mobile-specific map component wrapper
 * Handles mobile-specific state management and lifecycle to prevent
 * unnecessary re-renders and re-mounts that occur with parallel routing
 */
export const MobileMapComponent: React.FC<MobileMapComponentProps> = ({
  trucks,
  theme: _theme = 'dark',
  selectedTruckId,
  selectedTruckLocation,
  onSelectTruck,
  isClient,
  customOffset,
  onClusterSelect,
  shouldSkipUserCenter,
  userLocation,
  onUserLocate,
}) => {
  // Convert trucks to the format expected by the map component
  const convertedTrucks = React.useMemo(() => {
    return Array.isArray(trucks) ? trucks.map((truck) => convertToFoodTruck(truck, isClient)) : [];
  }, [trucks, isClient]);

  // Log mount/unmount to verify component lifecycle
  useEffect(() => {
    logDebug('📱 MOBILE MAP COMPONENT MOUNTED');
    return () => {
      logDebug('📱 MOBILE MAP COMPONENT UNMOUNTED');
    };
  }, []);

  // Memoize the truck selection callback to prevent unnecessary re-renders
  const handleSelectTruck = useCallback(
    (id: string | undefined) => {
      if (onSelectTruck) {
        onSelectTruck(id);
      }
    },
    [onSelectTruck],
  );

  // Only pass props that have actually changed to prevent unnecessary re-renders
  return (
    <OptimizedMapComponent
      trucks={convertedTrucks}
      selectedTruckId={selectedTruckId}
      selectedTruckLocation={selectedTruckLocation}
      onSelectTruck={handleSelectTruck}
      isMobile={true} // Explicitly mark as mobile for mobile-specific behavior
      customOffset={customOffset}
      onClusterSelect={onClusterSelect}
      shouldSkipUserCenter={shouldSkipUserCenter}
      userLocation={userLocation}
      onUserLocate={onUserLocate}
    />
  );
};
