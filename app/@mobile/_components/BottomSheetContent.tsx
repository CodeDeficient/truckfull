'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { FoodTruckDomain } from '@/lib/types';
import { calculateDistance, shouldShowTruckStatus } from '@/lib/utils/foodTruckHelpers';
import { sortTrucks } from '@/lib/utils/truckSorting';
import { ArrowUpDown, SlidersHorizontal, Check, Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useVirtualRows } from '@/components/home/useVirtualRows';

import { trackFavorite, trackTruckView } from '@/lib/utils/analytics';

import { TruckAccordionItem } from '@/components/trucks/TruckAccordionItem';
import { MobileTruckDetails } from './MobileTruckDetails';

interface BottomSheetContentProps {
  loading: boolean;
  error: string | null | undefined;
  trucks: FoodTruckDomain[];
  fetchTrucks?: () => void;
  isClient: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onTruckSelect?: (truck: FoodTruckDomain) => void;
  onAuthRequired?: () => void;
  selectedCluster?: { id: number; trucks: FoodTruckDomain[] } | null;
  onCloseCluster?: () => void;
  onTruckMapSelect?: (truck: FoodTruckDomain) => void;
  detailTruck?: FoodTruckDomain | null;
  onCloseDetail?: () => void;
  onCloseAll?: () => void;
  radiusMiles?: number;
}

type SortOption = 'name' | 'distance' | 'status';

const ESTIMATED_TRUCK_ROW_HEIGHT = 88;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'distance', label: 'Distance' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'status', label: 'Open First' },
];

const BottomSheetContent: React.FC<BottomSheetContentProps> = ({
  loading,
  error,
  trucks,
  userLocation,
  onTruckSelect,
  onAuthRequired,
  selectedCluster,
  onCloseCluster,
  onTruckMapSelect,
  detailTruck,
  onCloseDetail,
  onCloseAll,
  radiusMiles,
}) => {
  // === ALL HOOKS MUST BE AT THE TOP, BEFORE ANY CONDITIONAL RETURNS ===
  const { toggleFavorite, isFavorited, isAuthenticated } = useFavorites();
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFavoriteToggle = async (truckId: string) => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }
    trackFavorite(truckId);
    await toggleFavorite(truckId);
  };

  const handleViewDetails = (truck: FoodTruckDomain): void => {
    if (truck.id) trackTruckView(truck.id);
    onTruckSelect?.(truck);
  };

  // Compute display trucks (must be before useMemo that uses it)
  const displayTrucks = selectedCluster ? selectedCluster.trucks : trucks;

  // Count active filters
  const activeFilterCount = [showOpenOnly, showFavoritesOnly].filter(Boolean).length;

  // useMemo MUST be called unconditionally - move BEFORE any early returns
  const sortedAndFilteredTrucks = useMemo(() => {
    let result = [...displayTrucks];

    // Filter by open status
    if (showOpenOnly) {
      result = result.filter((truck) => {
        if (!shouldShowTruckStatus(truck)) return true;
        return truck.is_open === true;
      });
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      result = result.filter((truck) => isFavorited(truck.id));
    }

    // Sort using centralized utility (includes tier/quality secondary sorting)
    return sortTrucks(result, sortBy, userLocation);
  }, [displayTrucks, sortBy, showOpenOnly, showFavoritesOnly, userLocation, isFavorited]);

  // Compute cluster distance
  const clusterDistance = useMemo(() => {
    if (
      displayTrucks.length > 0 &&
      userLocation &&
      displayTrucks[0].current_location?.lat != null &&
      displayTrucks[0].current_location?.lng != null
    ) {
      return calculateDistance(
        userLocation.lat,
        userLocation.lng,
        displayTrucks[0].current_location.lat,
        displayTrucks[0].current_location.lng,
      );
    }
    return null;
  }, [displayTrucks, userLocation]);

  const rowKeys = useMemo(() => sortedAndFilteredTrucks.map((truck) => truck.id), [
    sortedAndFilteredTrucks,
  ]);
  const { startIndex, endIndex, offsetY, totalHeight, measure } = useVirtualRows({
    keys: rowKeys,
    estimatedItemHeight: ESTIMATED_TRUCK_ROW_HEIGHT,
    scrollRef: listScrollRef,
  });

  const measureRow = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const key = node.dataset.rowKey;
      if (key) measure(key, node.getBoundingClientRect().height);
    },
    [measure],
  );

  const visibleTruckRows = sortedAndFilteredTrucks.slice(startIndex, endIndex);

  const distanceSuffix = clusterDistance ? ` (${clusterDistance.toFixed(1)} mi)` : '';
  const title = selectedCluster
    ? `${displayTrucks.length} Trucks${distanceSuffix}`
    : radiusMiles
      ? `${sortedAndFilteredTrucks.length} Trucks Nearby within ${radiusMiles} mi`
      : `${sortedAndFilteredTrucks.length} Trucks Nearby`;

  // === NOW SAFE TO HAVE CONDITIONAL RETURNS ===

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[var(--primary-color)]"></div>
        <p className="text-white mt-2">Loading nearby food trucks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Error: {error}</p>
        <button
          onClick={() => globalThis.location.reload()}
          className="mt-2 px-4 py-2 bg-[var(--primary-color)] text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  if (detailTruck) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <MobileTruckDetails
          truck={detailTruck}
          onBack={() => onCloseDetail?.()}
          showBack={!!selectedCluster}
          onClose={() => onCloseAll?.()}
        />
      </div>
    );
  }

  if (displayTrucks.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-white">No food trucks found nearby.</p>
        {selectedCluster && (
          <button onClick={onCloseCluster} className="text-sm text-blue-400 mt-2 underline">
            View all trucks
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-h-[50vh] flex flex-col">
      {/* Sticky header with sort/filter - stays fixed at top */}
      <div className="sticky top-0 z-10 bg-neutral-900 px-4 pt-2 pb-3 border-b border-zinc-800">
        {/* Header row - all on one line */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">{title}</span>
          <div className="flex items-center gap-2">
            {selectedCluster && (
              <>
                {/* Sort dropdown */}
                <div className="relative" ref={sortMenuRef}>
                  <button
                    onClick={() => {
                      setShowSortMenu(!showSortMenu);
                      setShowFilterMenu(false);
                    }}
                    className="flex items-center gap-0.5 text-gray-400 hover:text-white"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    <span className="text-xs">sort</span>
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-6 z-50 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 py-1 min-w-[120px]">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between ${sortBy === opt.value ? 'text-cyan-400' : 'text-gray-300 hover:bg-zinc-700'}`}
                        >
                          {opt.label}
                          {sortBy === opt.value && <Check className="h-3 w-3" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filter dropdown - simplified to just Open/Favorites */}
                <div className="relative" ref={filterMenuRef}>
                  <button
                    onClick={() => {
                      setShowFilterMenu(!showFilterMenu);
                      setShowSortMenu(false);
                    }}
                    className={`flex items-center gap-0.5 ${activeFilterCount > 0 ? 'text-cyan-400' : 'text-gray-400'} hover:text-white`}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span className="text-xs">
                      filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                    </span>
                  </button>
                  {showFilterMenu && (
                    <div className="absolute right-0 top-6 z-50 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 py-1 min-w-[130px]">
                      {/* Open Only */}
                      <button
                        onClick={() => setShowOpenOnly(!showOpenOnly)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between ${showOpenOnly ? 'text-cyan-400' : 'text-gray-300 hover:bg-zinc-700'}`}
                      >
                        Open now
                        {showOpenOnly && <Check className="h-3 w-3" />}
                      </button>

                      {/* Favorites Only */}
                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            onAuthRequired?.();
                            setShowFilterMenu(false);
                            return;
                          }
                          setShowFavoritesOnly(!showFavoritesOnly);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between ${showFavoritesOnly ? 'text-cyan-400' : 'text-gray-300 hover:bg-zinc-700'}`}
                      >
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> Favorites
                        </span>
                        {showFavoritesOnly && <Check className="h-3 w-3" />}
                      </button>

                      {/* Clear filters */}
                      {activeFilterCount > 0 && (
                        <>
                          <div className="border-t border-zinc-700 my-1" />
                          <button
                            onClick={() => {
                              setShowOpenOnly(false);
                              setShowFavoritesOnly(false);
                              setShowFilterMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-zinc-700"
                          >
                            Clear filters
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            {selectedCluster && (
              <button
                onClick={onCloseCluster}
                className="text-xs text-gray-400 hover:text-white ml-1"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable truck list */}
      <div ref={listScrollRef} className="flex-1 overflow-y-auto px-4 pb-3">
        {sortedAndFilteredTrucks.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No trucks match your filters</p>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleTruckRows.map((truck) => (
                <div
                  key={truck.id}
                  ref={measureRow}
                  data-row-key={truck.id}
                  style={{ paddingBottom: 8 }}
                >
                  <TruckAccordionItem
                    truck={truck}
                    selectedTruckId={undefined}
                    setSelectedTruckId={() => {
                      onTruckMapSelect?.(truck);
                    }}
                    isOpen={() => false}
                    userLocation={selectedCluster ? undefined : userLocation || undefined}
                    isFavorited={isFavorited(truck.id)}
                    onToggleFavorite={() => void handleFavoriteToggle(truck.id)}
                    onViewDetails={() => handleViewDetails(truck)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomSheetContent;
