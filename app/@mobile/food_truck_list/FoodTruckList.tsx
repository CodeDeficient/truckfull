'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Filter, Search } from 'lucide-react';
import type { FoodTruck } from '@/lib/types';
import { useFoodTruckFinder } from '@/hooks/useFoodTruckFinder';
import { useFoodTruckNavigation } from '@/hooks/useFoodTruckNavigation';
import { sortTrucks } from '@/lib/utils/truckSorting';
import FoodTruckListLayout from '../components/FoodTruckListLayout';
import DiscoverTruckCard from '@/components/discover/DiscoverTruckCard';
import { hasValidCuisineType } from '@/lib/filters/cuisineFilter';

// Utility functions for type-safe filtering
const hasValidName = (name: unknown): name is string => {
  return typeof name === 'string' && name.trim().length > 0;
};

interface FoodTruckListProps {
  readonly onTruckSelect?: (truck: FoodTruck) => void;
  readonly onBack?: () => void;
}

export default function FoodTruckList({ onTruckSelect, onBack }: FoodTruckListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');

  const { filteredTrucks: hookFilteredTrucks, loading } = useFoodTruckFinder();

  const { handleBack, handleTruckSelect } = useFoodTruckNavigation({ onTruckSelect, onBack });

  // Apply additional filtering based on local search term
  const filteredTrucks = hookFilteredTrucks.filter((truck) => {
    const truckName = truck.name ?? '';
    const cuisineTypes = truck.cuisine_type ?? [];

    const matchesName =
      hasValidName(truckName) && truckName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCuisine =
      hasValidCuisineType({ cuisine_type: cuisineTypes }) &&
      cuisineTypes.some((cuisine: string) =>
        cuisine.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    return matchesName || matchesCuisine;
  });

  // Sort using centralized utility (includes tier/quality secondary sorting)
  const sortedTrucks = sortTrucks(filteredTrucks, sortBy);

  return (
    <FoodTruckListLayout
      loading={loading}
      error={null}
      onRetry={() => globalThis.location.reload()}
      loadingMessage="Loading food trucks..."
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <Button
          variant="ghost"
          size="mobile-icon"
          onClick={handleBack}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold text-white">Food Trucks</h1>
        <Button variant="ghost" size="mobile-icon" className="text-white hover:bg-white/10">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search food trucks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 text-white placeholder:text-gray-400 border border-white/10 rounded-full pl-12 pr-4 py-3 focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent"
          />
        </div>

        {/* Sort Options */}
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'distance' ? 'default' : 'outline'}
            size="mobile"
            onClick={() => setSortBy('distance')}
            className={
              sortBy === 'distance'
                ? 'bg-[var(--primary-color)] text-white'
                : 'text-white border-white/20 hover:bg-white/10'
            }
          >
            Distance
          </Button>
          <Button
            variant={sortBy === 'rating' ? 'default' : 'outline'}
            size="mobile"
            onClick={() => setSortBy('rating')}
            className={
              sortBy === 'rating'
                ? 'bg-[var(--primary-color)] text-white'
                : 'text-white border-white/20 hover:bg-white/10'
            }
          >
            Rating
          </Button>
          <Button
            variant={sortBy === 'name' ? 'default' : 'outline'}
            size="mobile"
            onClick={() => setSortBy('name')}
            className={
              sortBy === 'name'
                ? 'bg-[var(--primary-color)] text-white'
                : 'text-white border-white/20 hover:bg-white/10'
            }
          >
            Name
          </Button>
        </div>
      </div>

      {/* Truck List */}
      <div className="flex-grow overflow-y-auto">
        <div className="p-4 space-y-4">
          {sortedTrucks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-white text-lg mb-2">No food trucks found</div>
              <div className="text-gray-400 text-sm">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'No trucks available in your area'}
              </div>
            </div>
          ) : (
            sortedTrucks.map((truck) => (
              <DiscoverTruckCard
                key={truck.id}
                truck={truck}
                onSelect={handleTruckSelect}
                isFavorited={false}
                variant="list"
                showActions={true}
              />
            ))
          )}
        </div>
      </div>
    </FoodTruckListLayout>
  );
}
