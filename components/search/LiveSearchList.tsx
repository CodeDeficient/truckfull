'use client';

import { FoodTruckDomain } from '@/lib/types';
import { motion } from 'framer-motion';
import { ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import React from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useVirtualRows } from '@/components/home/useVirtualRows';
import { LiveSearchRow } from './LiveSearchRow';

type ListState = 'collapsed' | 'peek' | 'expanded';
export type SortOption = 'distance' | 'name' | 'rating' | 'open';

export interface QuickFilters {
  maxDistance: number;
  openNow: boolean;
}

interface LiveSearchListProps {
  readonly trucks: FoodTruckDomain[];
  readonly loading: boolean;
  readonly onTruckSelect: (truck: FoodTruckDomain) => void; // New prop for handling truck selection
  readonly userLocation: { lat: number; lng: number } | null; // User's current location
  readonly listState?: ListState; // Current state: collapsed, peek, or expanded
  readonly onChangeState?: (state: ListState) => void; // Callback to change state
  readonly onSortChange?: (sortBy: SortOption) => void; // Callback for sort changes
  readonly onFilterClick?: () => void; // Callback to open filter modal
  readonly currentFilters?: QuickFilters; // Current quick filter state
  readonly onQuickFilterChange?: (filters: QuickFilters) => void; // Callback for quick filter changes
  readonly onAuthRequired?: () => void; // Callback when auth is required for favorites
}

export function LiveSearchList({
  trucks,
  loading,
  onTruckSelect,
  userLocation,
  listState = 'peek',
  onChangeState,
  onSortChange,
  onFilterClick: _onFilterClick,
  currentFilters = { maxDistance: 30, openNow: false },
  onQuickFilterChange,
  onAuthRequired,
}: LiveSearchListProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [draggedHeight, setDraggedHeight] = React.useState<number | null>(null);
  const [sortDropdownOpen, setSortDropdownOpen] = React.useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = React.useState(false);
  const [currentSort, setCurrentSort] = React.useState<SortOption>('distance');

  // Track keyboard height to position results above keyboard on mobile
  const [keyboardOffset, setKeyboardOffset] = React.useState(0);

  const { toggleFavorite, isFavorited, isAuthenticated } = useFavorites();

  const listScrollRef = React.useRef<HTMLDivElement>(null);
  const rowKeys = React.useMemo(() => trucks.map((truck) => truck.id), [trucks]);
  const { startIndex, endIndex, offsetY, totalHeight, measure } = useVirtualRows({
    keys: rowKeys,
    estimatedItemHeight: 88,
    scrollRef: listScrollRef,
  });

  const measureRow = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const key = node.dataset.rowKey;
      if (key) measure(key, node.getBoundingClientRect().height);
    },
    [measure],
  );

  // Listen for keyboard open/close using visualViewport API
  React.useEffect(() => {
    const handleViewportResize = () => {
      if (window.visualViewport) {
        // Calculate keyboard height: difference between window height and visual viewport height
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        // Only apply offset if keyboard is actually open (height > 100px threshold)
        setKeyboardOffset(keyboardHeight > 100 ? keyboardHeight : 0);
      }
    };

    // Initial check
    handleViewportResize();

    // Subscribe to viewport resize events (fires when keyboard opens/closes)
    window.visualViewport?.addEventListener('resize', handleViewportResize);
    window.visualViewport?.addEventListener('scroll', handleViewportResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      window.visualViewport?.removeEventListener('scroll', handleViewportResize);
    };
  }, []);

  const handleFavoriteToggle = async (truckId: string) => {
    if (!isAuthenticated) {
      // Trigger auth modal via callback instead of redirecting to 404
      if (onAuthRequired) {
        onAuthRequired();
      }
      return;
    }
    await toggleFavorite(truckId);
  };

  const onRowSelect = React.useCallback(
    (truck: FoodTruckDomain) => onTruckSelect(truck),
    [onTruckSelect],
  );
  const onRowToggleFavorite = React.useCallback(
    (truckId: string) => {
      void handleFavoriteToggle(truckId);
    },
    [isAuthenticated, toggleFavorite, onAuthRequired],
  );

  // Calculate dynamic content height based on truck count
  const getContentHeight = (): number => {
    if (globalThis.window === undefined) return 0;

    const headerHeight = 40; // Header with drag handle and controls (h-10)
    const truckItemHeight = 88; // Approximate height per truck (adjust if needed)
    const padding = 16; // Bottom padding
    const loadingHeight = 40; // Height for loading state

    if (loading) {
      return headerHeight + loadingHeight + padding;
    }

    const visibleTruckCount = trucks.length;
    const contentHeight = headerHeight + truckItemHeight * visibleTruckCount + padding;

    // Return content height, but not less than one truck
    return Math.max(contentHeight, headerHeight + truckItemHeight + padding);
  };

  // Get max height considering both viewport and content
  const getMaxHeight = (): number => {
    if (globalThis.window === undefined) return 0;

    // Use visualViewport height (handles keyboard) or fallback to innerHeight - offset
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight - keyboardOffset;

    const contentHeight = getContentHeight();
    // Never exceed 75% of visible viewport
    return Math.min(contentHeight, viewportHeight * 0.75);
  };

  // Calculate height based on state
  const getHeight = () => {
    // If actively dragging, use the dragged height
    if (isDragging && draggedHeight !== null) {
      return `${draggedHeight}px`;
    }

    // Otherwise use state-based height
    const maxHeight = getMaxHeight();

    switch (listState) {
      case 'collapsed': {
        return '0px';
      }
      case 'peek': {
        // Peek is 35vh or content height, whichever is smaller
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight - keyboardOffset;

        // Dynamic peek height: match 35% of viewport OR minimum 1.5 items (180px)
        const minHintHeight = 180;
        const targetHeight = Math.max(viewportHeight * 0.35, minHintHeight);
        // Cap at 60% of visible viewport to keep map visible
        const cappedHeight = Math.min(targetHeight, viewportHeight * 0.6);

        return `${Math.min(cappedHeight, maxHeight)}px`;
      }
      case 'expanded': {
        // Expanded is max height (content or 75vh)
        return `${maxHeight}px`;
      }
      default: {
        return '0px';
      }
    }
  };

  // Convert state to pixel height for calculations
  const getHeightInPixels = (state: ListState): number => {
    if (globalThis.window === undefined) return 0;

    const viewportHeight = window.visualViewport?.height ?? window.innerHeight - keyboardOffset;
    const maxHeight = getMaxHeight();

    switch (state) {
      case 'collapsed': {
        return 0;
      }
      case 'peek': {
        const minHintHeight = 180;
        const targetHeight = Math.max(viewportHeight * 0.35, minHintHeight);
        const cappedHeight = Math.min(targetHeight, viewportHeight * 0.6);
        return Math.min(cappedHeight, maxHeight);
      }
      case 'expanded': {
        return maxHeight;
      }
      default: {
        return 0;
      }
    }
  };

  // Handle sort selection
  const handleSortSelect = (sortOption: SortOption) => {
    setCurrentSort(sortOption);
    setSortDropdownOpen(false);
    if (onSortChange) {
      onSortChange(sortOption);
    }
  };

  // Handle distance change
  const handleDistanceChange = (distance: number) => {
    if (onQuickFilterChange) {
      onQuickFilterChange({
        ...currentFilters,
        maxDistance: distance,
      });
    }
  };

  // Handle Open Now toggle
  const handleOpenNowToggle = () => {
    if (onQuickFilterChange) {
      onQuickFilterChange({
        ...currentFilters,
        openNow: !currentFilters.openNow,
      });
    }
  };

  // Handle pan (drag) gestures
  const handlePan = (_event: unknown, info: { delta: { y: number } }) => {
    if (!isDragging) setIsDragging(true);

    const currentHeight = draggedHeight ?? getHeightInPixels(listState);
    const maxHeight = getMaxHeight();
    // Drag down (positive delta) = decrease height
    // Drag up (negative delta) = increase height
    const newHeight = Math.max(0, Math.min(maxHeight, currentHeight - info.delta.y));

    setDraggedHeight(newHeight);
  };

  // Handle pan end to snap to nearest state or auto-collapse
  const handlePanEnd = () => {
    if (!onChangeState || draggedHeight === null) {
      setIsDragging(false);
      setDraggedHeight(null);
      return;
    }

    const peekHeight = getHeightInPixels('peek');
    const expandedHeight = getHeightInPixels('expanded');

    // Auto-collapse if dragged below 50% of peek height
    const collapseThreshold = peekHeight * 0.5;

    let newState: ListState;
    if (draggedHeight < collapseThreshold) {
      newState = 'collapsed';
    } else {
      // Snap to nearest state between peek and expanded
      const distToPeek = Math.abs(draggedHeight - peekHeight);
      const distToExpanded = Math.abs(draggedHeight - expandedHeight);

      newState = distToPeek < distToExpanded ? 'peek' : 'expanded';
    }

    onChangeState(newState);
    setIsDragging(false);
    setDraggedHeight(null);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{
        y: 0,
        height: getHeight(),
      }}
      exit={{ y: '100%' }}
      transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 right-0 bg-zinc-900 border-t border-zinc-800 shadow-2xl rounded-t-lg overflow-hidden"
      style={{ bottom: keyboardOffset, zIndex: 50, overscrollBehavior: 'contain' }}
    >
      {/* Header with drag handle and controls - pan gestures only here */}
      <motion.div
        className="relative w-full h-10 cursor-grab active:cursor-grabbing touch-none flex items-center justify-between px-3"
        onPan={handlePan}
        onPanEnd={handlePanEnd}
      >
        {/* Sort and Filter buttons with labels on the left */}
        <div className="flex items-center gap-0 pointer-events-auto z-10">
          {/* Sort button with label */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSortDropdownOpen(!sortDropdownOpen);
                setFilterDropdownOpen(false); // Close filter if open
              }}
              className="p-0.5 bg-transparent hover:bg-slate-700/50 transition-colors rounded-sm"
              aria-label="Sort results"
            >
              <ArrowUpDown className="w-3 h-3 text-slate-300" />
            </button>
            <span className="text-slate-300 text-xs font-medium">sort</span>
          </div>

          {/* Filter button with label */}
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFilterDropdownOpen(!filterDropdownOpen);
                setSortDropdownOpen(false); // Close sort if open
              }}
              className="p-0.5 bg-transparent hover:bg-slate-700/50 transition-colors rounded-sm"
              aria-label="Filter results"
            >
              <SlidersHorizontal className="w-3 h-3 text-slate-300" />
            </button>
            <span className="text-slate-300 text-xs font-medium">filter</span>
          </div>
        </div>

        {/* Drag handle centered at top */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300 rounded-full pointer-events-none" />

        {/* Results count on the right */}
        <div className="flex items-center pointer-events-auto z-10">
          <span className="text-slate-300 text-sm font-medium">
            {trucks.length} {trucks.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      </motion.div>

      {/* Sort dropdown - appears below header */}
      {sortDropdownOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-slate-800 border-b border-gray-800 px-4 py-2"
        >
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleSortSelect('distance')}
              className={`text-left px-3 py-2 rounded text-sm ${
                currentSort === 'distance'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Distance (Nearest)
            </button>
            <button
              onClick={() => handleSortSelect('name')}
              className={`text-left px-3 py-2 rounded text-sm ${
                currentSort === 'name'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Name (A-Z)
            </button>
            <button
              onClick={() => handleSortSelect('rating')}
              className={`text-left px-3 py-2 rounded text-sm ${
                currentSort === 'rating'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Rating (Highest)
            </button>
            <button
              onClick={() => handleSortSelect('open')}
              className={`text-left px-3 py-2 rounded text-sm ${
                currentSort === 'open'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Open Now
            </button>
          </div>
        </motion.div>
      )}

      {/* Basic Filter dropdown - appears below header */}
      {filterDropdownOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-slate-800 border-b border-gray-800 px-4 py-3"
        >
          <div className="space-y-3">
            {/* Quick Distance Options */}
            <div>
              <p className="text-xs text-slate-400 mb-2">Distance</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDistanceChange(5);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${
                    currentFilters.maxDistance === 5
                      ? 'bg-slate-600 text-white font-semibold'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  5mi
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDistanceChange(10);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${
                    currentFilters.maxDistance === 10
                      ? 'bg-slate-600 text-white font-semibold'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  10mi
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDistanceChange(20);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${
                    currentFilters.maxDistance === 20
                      ? 'bg-slate-600 text-white font-semibold'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  20mi
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDistanceChange(30);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${
                    currentFilters.maxDistance === 30
                      ? 'bg-slate-600 text-white font-semibold'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  30mi
                </button>
              </div>
            </div>

            {/* Open Now Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Open Now</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenNowToggle();
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  currentFilters.openNow ? 'bg-slate-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    currentFilters.openNow ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Advanced Filters button removed temporarily */}
          </div>
        </motion.div>
      )}

      {/* Content - visible when not collapsed */}
      {listState !== 'collapsed' && (
        <div
          ref={listScrollRef}
          className="px-4 pb-4 overflow-y-auto overscroll-contain"
          style={{ height: 'calc(100% - 40px)', touchAction: 'pan-y' }}
          data-vaul-no-drag="true"
        >
          {loading ? (
            <div className="text-center text-slate-300">Loading...</div>
          ) : (
            <>
              {trucks.length === 0 ? (
                <div className="text-center text-slate-300">No results found</div>
              ) : (
                <div style={{ height: totalHeight, position: 'relative' }}>
                  <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {trucks.slice(startIndex, endIndex).map((truck) => (
                      <div
                        key={truck.id}
                        ref={measureRow}
                        data-row-key={truck.id}
                      >
                        <LiveSearchRow
                          truck={truck}
                          userLocation={userLocation}
                          isFavorited={isFavorited(truck.id)}
                          onSelect={onRowSelect}
                          onToggleFavorite={onRowToggleFavorite}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
