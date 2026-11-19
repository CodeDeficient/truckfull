'use client';

import type { PublicFoodTruck, FoodTruckDomain } from '@/lib/types';
import { MapSection } from './MapSection';
import { TruckListSection } from './TruckListSection';
import { SocialFooter, SocialFooterSpacer } from '@/components/SocialFooter';

import { useState, useRef, useEffect } from 'react';

interface MainContentProps {
  readonly filteredTrucks: (PublicFoodTruck | FoodTruckDomain)[];
  readonly userLocation: { lat: number; lng: number } | undefined;
  readonly selectedTruckId: string | undefined;
  readonly setSelectedTruckId: (id: string | undefined) => void;
  readonly isOpen: (truck: PublicFoodTruck | FoodTruckDomain) => boolean;
  readonly theme: string | undefined;
  readonly favoriteIds?: Set<string>;
  readonly onToggleFavorite?: (truckId: string) => void;
  readonly isAuthenticated?: boolean;
  readonly shouldSkipUserCenter?: boolean;
  readonly trucksLoading?: boolean;
  readonly onUserLocate?: (location: { lat: number; lng: number }) => void;
}

/**
 * Renders the main content area, including a map and a list of trucks.
 * This component acts as an adapter, converting the basic userLocation prop
 * into the richer LocationData object required by its children.
 */
export function MainContent({
  filteredTrucks,
  userLocation,
  selectedTruckId,
  setSelectedTruckId,
  isOpen,
  theme,
  favoriteIds,
  onToggleFavorite,
  isAuthenticated,
  shouldSkipUserCenter = false,
  trucksLoading = false,
  onUserLocate,
}: MainContentProps) {
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef = useRef(false);

  // Handle mouse events for resizing
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizingRef.current = true;
  };

  // Effect to handle mouse events for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;

      // Calculate new width based on mouse position relative to right edge
      const windowWidth = window.innerWidth;
      const newWidth = Math.max(288, Math.min(640, windowWidth - e.clientX)); // min 288px (w-72), max 640px (w-160)
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = false;
        setIsResizing(false);
      }
    };

    if (isResizing) {
      globalThis.addEventListener('mousemove', handleMouseMove);
      globalThis.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* Map section that fills available space */}
        <div className="flex-1 overflow-hidden relative">
          <MapSection
            filteredTrucks={filteredTrucks}
            userLocation={userLocation}
            selectedTruckId={selectedTruckId}
            setSelectedTruckId={setSelectedTruckId}
            theme={theme}
            className="w-full h-full"
            shouldSkipUserCenter={shouldSkipUserCenter}
            onUserLocate={onUserLocate}
          />
        </div>

        {/* Resizable divider */}
        <button
          type="button"
          aria-label="Resize sidebar"
          className={`hidden lg:block w-1 bg-border ${isResizing ? 'cursor-col-resize bg-muted-foreground' : 'cursor-col-resize hover:bg-muted-foreground'} transition-colors relative group`}
          onMouseDown={startResizing}
        >
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="20"
              viewBox="0 0 10 20"
              fill="currentColor"
            >
              <circle cx="2" cy="4" r="1.5" />
              <circle cx="8" cy="4" r="1.5" />
              <circle cx="2" cy="10" r="1.5" />
              <circle cx="8" cy="10" r="1.5" />
              <circle cx="2" cy="16" r="1.5" />
              <circle cx="8" cy="16" r="1.5" />
            </svg>
          </div>
        </button>

        {/* Resizable right sidebar for truck list on desktop */}
        <div
          className="hidden lg:block h-full bg-card shadow-lg z-10 relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          <TruckListSection
            filteredTrucks={filteredTrucks}
            selectedTruckId={selectedTruckId}
            setSelectedTruckId={setSelectedTruckId}
            isOpen={isOpen}
            userLocation={userLocation}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
            isAuthenticated={isAuthenticated}
            className="h-full"
            isLoading={trucksLoading}
          />
        </div>
      </div>

      <SocialFooterSpacer />
      <SocialFooter />
    </div>
  );
}
