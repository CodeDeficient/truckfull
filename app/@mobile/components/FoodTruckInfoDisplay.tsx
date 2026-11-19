import React, { memo } from 'react';
import { Star, MapPin } from 'lucide-react';
import type { FoodTruck } from '@/lib/types';

interface FoodTruckInfoDisplayProps {
  readonly truck: FoodTruck;
  readonly variant?: 'discover' | 'list';
}

/**
 * Validates if the rating value is a valid number
 */
const isValidRating = (rating: unknown): rating is number => {
  return typeof rating === 'number' && !Number.isNaN(rating) && rating >= 0 && rating <= 5;
};

/**
 * Validates if the review count is a valid integer
 */
const isValidReviewCount = (count: unknown): count is number => {
  return typeof count === 'number' && !Number.isNaN(count) && Number.isInteger(count) && count >= 0;
};

/**
 * Validates if the location has a valid address
 */
const hasValidLocation = (location: unknown): location is { address?: string } => {
  return location !== null && typeof location === 'object' && 'address' in location;
};

const FoodTruckInfoDisplay: React.FC<FoodTruckInfoDisplayProps> = ({
  truck,
  variant = 'discover',
}) => {
  const isDiscoverVariant = variant === 'discover';

  return (
    <div
      className={isDiscoverVariant ? 'space-y-3' : 'space-y-2'}
      aria-label={`Food truck ${truck.name || 'information'} details`}
    >
      {/* Rating */}
      {isValidRating(truck?.average_rating) && (
        <div
          className="flex items-center gap-2"
          aria-label={`Rating: ${truck.average_rating.toFixed(1)} stars`}
        >
          <Star
            className={`w-4 h-4 text-yellow-500 fill-current ${isDiscoverVariant ? 'w-5 h-5' : ''}`}
            aria-hidden="true"
          />
          <span
            className={`text-white font-bold ${isDiscoverVariant ? 'text-lg' : 'text-sm font-medium'}`}
          >
            {truck.average_rating.toFixed(1)}
          </span>
          {isValidReviewCount(truck?.review_count) && (
            <span
              className={`text-sm ${isDiscoverVariant ? 'text-gray-200' : 'text-gray-300'}`} // Increased contrast from gray-400 to gray-300 or gray-200
              aria-label={`${truck.review_count} reviews`}
            >
              ({truck.review_count} reviews)
            </span>
          )}
        </div>
      )}

      {/* Location */}
      {hasValidLocation(truck?.current_location) &&
        truck?.current_location?.address &&
        truck.current_location.address.trim() !== '' && (
          <div
            className="flex items-center gap-2 text-gray-200" // Increased contrast from gray-300 to gray-200
            aria-label={`Location: ${truck.current_location.address}`}
          >
            <MapPin
              className={`w-4 h-4 ${isDiscoverVariant ? 'w-4 h-4' : ''}`}
              aria-hidden="true"
            />
            <span className="text-sm">{truck.current_location.address}</span>
          </div>
        )}
    </div>
  );
};

export default memo(FoodTruckInfoDisplay);
