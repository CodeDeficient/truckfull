'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { RADIUS_OPTIONS_GUEST, RADIUS_OPTIONS_AUTHENTICATED } from '@/lib/filters/types';
import { DEFAULT_SEARCH_RADIUS_MILES } from '@/lib/api/trucks/radiusLimits';

export interface FilterOptions {
  maxDistance: number;
  openNow: boolean;
  cuisineTypes: string[];
}

interface MobileFilterModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentFilters: FilterOptions;
  readonly onApplyFilters: (filters: FilterOptions) => void;
}

const CUISINE_OPTIONS = [
  'American',
  'Mexican',
  'Italian',
  'Asian',
  'BBQ',
  'Burgers',
  'Tacos',
  'Pizza',
  'Sandwiches',
  'Seafood',
  'Vegetarian',
  'Vegan',
  'Dessert',
  'Coffee',
];

export function MobileFilterModal({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
}: MobileFilterModalProps) {
  const { user } = useSafeAuth();

  // Use auth-aware distance options - same as desktop RadiusFilter
  const distanceOptions = user
    ? RADIUS_OPTIONS_AUTHENTICATED.map((v) => ({ label: `${v} miles`, value: v }))
    : RADIUS_OPTIONS_GUEST.map((v) => ({ label: `${v} miles`, value: v }));

  const [tempFilters, setTempFilters] = useState<FilterOptions>(currentFilters);

  // Update temp filters when modal opens with new current filters
  useEffect(() => {
    if (isOpen) {
      setTempFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  const handleToggleCuisine = (cuisine: string) => {
    setTempFilters((prev) => ({
      ...prev,
      cuisineTypes: prev.cuisineTypes.includes(cuisine)
        ? prev.cuisineTypes.filter((c) => c !== cuisine)
        : [...prev.cuisineTypes, cuisine],
    }));
  };

  const handleClearAll = () => {
    setTempFilters({
      maxDistance: DEFAULT_SEARCH_RADIUS_MILES,
      openNow: false,
      cuisineTypes: [],
    });
  };

  const handleApply = () => {
    onApplyFilters(tempFilters);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl z-[101] max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Filters</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-800 transition-colors"
                aria-label="Close filters"
              >
                <X className="w-5 h-5 text-slate-300" />
              </button>
            </div>

            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Distance */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Maximum Distance</h3>
                <div className="grid grid-cols-3 gap-2">
                  {distanceOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setTempFilters((prev) => ({ ...prev, maxDistance: option.value }))
                      }
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        tempFilters.maxDistance === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Open Now Toggle */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Open Now</span>
                  <button
                    onClick={() => setTempFilters((prev) => ({ ...prev, openNow: !prev.openNow }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      tempFilters.openNow ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={tempFilters.openNow}
                    aria-label="Open Now filter"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        tempFilters.openNow ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Cuisine Types */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Cuisine Type</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <button
                      key={cuisine}
                      onClick={() => handleToggleCuisine(cuisine)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors text-left ${
                        tempFilters.cuisineTypes.includes(cuisine)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer with buttons */}
            <div className="p-4 border-t border-gray-800 flex gap-3">
              <button
                onClick={handleClearAll}
                className="flex-1 py-3 px-4 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
