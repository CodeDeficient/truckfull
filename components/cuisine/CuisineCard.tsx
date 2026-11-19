'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FoodTruck } from '@/lib/types';

interface CuisineCardProps {
  /** The cuisine type for this card */
  readonly cuisineType: string;
  /** Optional truck data to show related information */
  readonly trucks?: FoodTruck[];
  /** Optional callback when the card is selected */
  readonly onSelect?: (cuisineType: string) => void;
  /** Whether this card is currently selected */
  readonly isSelected?: boolean;
  /** Optional CSS classes */
  readonly className?: string;
  /** Size variant: small, medium, or large */
  readonly size?: 'small' | 'medium' | 'large';
}

/**
 * A card component that represents a cuisine type with optional truck-related information
 * Used in the Explore section for cuisine selection
 */
export function CuisineCard({
  cuisineType,
  trucks,
  onSelect,
  isSelected = false,
  className,
  size = 'medium',
}: CuisineCardProps) {
  const getTruckStats = () => {
    if (!trucks || trucks.length === 0) {
      return { count: 0, avgRating: 0 };
    }

    const count = trucks.length;
    const totalRating = trucks.reduce((sum, truck) => {
      return sum + (typeof truck.average_rating === 'number' ? truck.average_rating : 0);
    }, 0);
    const avgRating = count > 0 ? totalRating / count : 0;

    return { count, avgRating: Number.parseFloat(avgRating.toFixed(1)) };
  };

  const { count, avgRating } = getTruckStats();

  const handleSelect = () => {
    onSelect?.(cuisineType);
  };

  // Define appropriate sizes based on variant
  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  };

  // Get a representative icon or image for the cuisine
  const getCuisineIcon = () => {
    const iconMap: Record<string, string> = {
      Mexican: '🌮',
      American: '🍔',
      Asian: '🥢',
      Italian: '🍝',
      BBQ: '🍖',
      Burgers: '🍔',
      Tacos: '🌮',
      Pizza: '🍕',
      Sandwiches: '🥪',
      Desserts: '🍰',
      Mediterranean: '🥗',
      Thai: '🌶️',
      Vietnamese: '🍜',
      Chinese: '🥡',
      Japanese: '🍱',
      Korean: '🇰🇷',
      Indian: '🍛',
      Greek: '🥙',
      French: '🥐',
      Vegan: '🌱',
      Vegetarian: '🥦',
      Seafood: '🦐',
      Breakfast: '🥞',
      'Coffee & Tea': '☕',
      'Ice Cream': '🍦',
      Healthy: '🥗',
      Fusion: '🍽️',
    };

    return iconMap[cuisineType] || '🍽️';
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-[0.98]',
        'border border-gray-200 dark:border-gray-700',
        'w-full h-28', // Fixed height for uniform cards
        isSelected
          ? 'ring-2 ring-[var(--primary-color)] ring-offset-2 bg-[var(--primary-color)] bg-opacity-10'
          : 'bg-gradient-to-br from-[#ea2a2a]/20 to-purple-900/20 border-white/10',
        sizeClasses[size],
        className,
      )}
      onClick={handleSelect}
    >
      <CardContent className="p-0 h-full flex flex-col items-center justify-center">
        <div className="flex flex-col items-center text-center gap-1">
          {/* Cuisine icon */}
          <div className="text-2xl">{getCuisineIcon()}</div>

          {/* Cuisine type */}
          <div className="flex flex-col items-center">
            <h3 className="font-semibold text-white text-center line-clamp-1">{cuisineType}</h3>

            {/* Stats if available */}
            {trucks && trucks.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-xs text-gray-300">
                  <MapPin className="w-3 h-3" />
                  <span>{count}</span>
                </div>

                {avgRating > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-300">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{avgRating}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-1 right-1">
              <Badge
                variant="secondary"
                className="bg-[var(--primary-color)] text-white border-0 text-xs"
              >
                Selected
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
