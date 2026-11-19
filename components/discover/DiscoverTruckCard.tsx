import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import Image from 'next/image';
import { shouldShowTruckStatus } from '@/lib/utils/foodTruckHelpers';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';
import { convertToDomain } from '@/lib/utils/foodTruckUtils';

import { useState, useEffect } from 'react';

interface FoodTruckCardProps {
  readonly truck: FoodTruck;
  readonly onSelect?: (truck: FoodTruck) => void;
  readonly showActions?: boolean;
  readonly variant?: 'discover' | 'list';
  readonly isFavorited?: boolean;
}

/**
 * FoodTruckCard component for displaying food truck information
 */
export default function DiscoverTruckCard({
  truck,
  onSelect,
  showActions: _showActions = true,
  variant = 'discover',
  isFavorited = false,
}: FoodTruckCardProps) {
  const [imageError, setImageError] = useState(false);
  const handleClick = () => {
    if (onSelect) {
      onSelect(truck);
    }
  };

  // Get photo URL from social_media
  const photoUrl = truck.social_media?.photo_url;

  // Reset image error state when photo URL changes
  useEffect(() => {
    setImageError(false);
  }, [photoUrl]);

  // Calculate open status for ring color
  const rawTier = (truck as { subscription_tier?: string }).subscription_tier;
  const ownerTier =
    rawTier && typeof rawTier === 'string' && rawTier.trim() !== '' ? rawTier : undefined;
  const truckDomain: FoodTruckDomain = convertToDomain(truck);
  const openStatus = shouldShowTruckStatus(truckDomain, ownerTier);

  // Determine border style based on status
  const borderStyle =
    openStatus === true
      ? { border: '3px solid #22c55e', boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)' } // Green for open
      : openStatus === false
        ? { border: '3px solid #ef4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)' } // Red for closed
        : { border: '3px solid #6b7280' }; // Gray for unknown/free tier

  return (
    <div
      role="button"
      tabIndex={0}
      className={`border border-white/10 rounded-xl p-2 cursor-pointer hover:bg-white/5 transition-colors ${
        variant === 'list'
          ? 'flex items-center space-x-4 bg-black/30'
          : 'bg-gradient-to-br from-[#ea2a2a]/20 to-purple-900/20'
      }`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div
        className={
          variant === 'list'
            ? 'flex items-center space-x-4 flex-1 min-w-0'
            : 'flex items-center space-x-3'
        }
      >
        {/* Profile Image with status ring */}
        <div
          className="relative w-16 h-16 rounded-full bg-neutral-900 flex-shrink-0 overflow-hidden"
          style={borderStyle}
        >
          {photoUrl && !imageError ? (
            <div className="relative w-full h-full">
              <Image
                src={photoUrl}
                alt={truck.name}
                fill
                sizes="64px"
                className="object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="relative w-full h-full">
              <Image
                src={TRUCK_FALLBACK_IMAGE}
                alt="TruckFull"
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h3 className="text-white font-semibold truncate">{truck.name}</h3>
            {isFavorited && <span className="ml-2 text-red-500 flex-shrink-0">❤️</span>}
          </div>
          <p className="text-gray-400 text-sm truncate">
            {truck.cuisine_type?.join(', ') ?? 'Various cuisines'}
          </p>
          {truck.current_location?.address && (
            <p className="text-gray-500 text-sm truncate">{truck.current_location.address}</p>
          )}
        </div>
      </div>
    </div>
  );
}
