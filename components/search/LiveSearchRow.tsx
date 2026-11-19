'use client';

import React from 'react';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import type { FoodTruckDomain } from '@/lib/types';
import { calculateDistance, shouldShowTruckStatus } from '@/lib/utils/foodTruckHelpers';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';

interface LiveSearchRowProps {
  readonly truck: FoodTruckDomain;
  readonly userLocation: { lat: number; lng: number } | null;
  readonly isFavorited: boolean;
  readonly onSelect: (truck: FoodTruckDomain) => void;
  readonly onToggleFavorite: (truckId: string) => void;
}

function statusBorderStyle(openStatus: boolean | null): React.CSSProperties {
  if (openStatus === true) {
    return { border: '3px solid #22c55e', boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)' };
  }
  if (openStatus === false) {
    return { border: '3px solid #ef4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)' };
  }
  return { border: '3px solid #6b7280' };
}

export const LiveSearchRow = React.memo(function LiveSearchRow({
  truck,
  userLocation,
  isFavorited,
  onSelect,
  onToggleFavorite,
}: LiveSearchRowProps) {
  const rawTier = (truck as { subscription_tier?: string }).subscription_tier;
  const ownerTier =
    rawTier && typeof rawTier === 'string' && rawTier.trim() !== '' ? rawTier : undefined;
  const openStatus = shouldShowTruckStatus(truck, ownerTier);
  const borderStyle = statusBorderStyle(openStatus);

  let distanceText = '';
  if (userLocation && truck.current_location?.lat && truck.current_location?.lng) {
    const distanceMiles = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      truck.current_location.lat,
      truck.current_location.lng,
    );
    distanceText = `${distanceMiles.toFixed(1)} mi`;
  }

  return (
    <div className="py-3 border-b border-gray-800 last:border-b-0 relative">
      <button
        type="button"
        className="w-full cursor-pointer text-left"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect(truck);
        }}
      >
        <div className="flex items-center space-x-4">
          <div
            className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-neutral-900"
            style={borderStyle}
          >
            <Image
              className="w-full h-full rounded-full object-cover"
              src={truck.social_media?.photo_url ?? TRUCK_FALLBACK_IMAGE}
              alt={truck.name}
              width={56}
              height={56}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{truck.name}</p>
            <p className="text-sm text-slate-300 truncate">{truck.cuisine_type?.join(', ')}</p>
            <div className="flex items-center justify-between mt-1">
              {openStatus === null ? (
                <div />
              ) : (
                <div className="flex items-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${openStatus ? 'bg-green-500' : 'bg-red-500'} text-white`}
                  >
                    {openStatus ? 'Open' : 'Closed'}
                  </span>
                </div>
              )}
              {distanceText && (
                <span className="text-xs text-slate-300 mr-[18px]">{distanceText}</span>
              )}
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(truck.id);
        }}
        className="absolute top-3 right-3 p-1.5 bg-transparent hover:bg-slate-700/50 transition-colors rounded-md"
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          className={`w-4 h-4 transition-colors ${isFavorited ? 'text-red-500 fill-red-500' : 'text-slate-300'}`}
        />
      </button>
    </div>
  );
});
