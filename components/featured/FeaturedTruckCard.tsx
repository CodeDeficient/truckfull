import React, { useState } from 'react';
import Image from 'next/image';
import type { FoodTruckDomain } from '@/lib/types';
import { shouldShowTruckStatus } from '@/lib/utils/foodTruckHelpers';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';

interface FeaturedTruckCardProps {
  id: string;
  name: string;
  cuisine: string;
  image?: string;
  truck?: FoodTruckDomain; // Full truck data for status calculation
  onClick?: () => void;
}

const FeaturedTruckCard: React.FC<FeaturedTruckCardProps> = ({
  id: _id,
  name,
  cuisine,
  image,
  truck,
  onClick,
}) => {
  // Calculate open status for ring color if truck data available
  let borderStyle: React.CSSProperties = { border: '3px solid #6b7280' }; // Default gray

  if (truck) {
    const rawTier = (truck as { subscription_tier?: string }).subscription_tier;
    const ownerTier =
      rawTier && typeof rawTier === 'string' && rawTier.trim() !== '' ? rawTier : undefined;
    const openStatus = shouldShowTruckStatus(truck, ownerTier);

    borderStyle =
      openStatus === true
        ? { border: '3px solid #22c55e', boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)' }
        : openStatus === false
          ? { border: '3px solid #ef4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)' }
          : { border: '3px solid #6b7280' };
  }

  const [imgError, setImgError] = useState(false);
  const src = image && !imgError ? image : TRUCK_FALLBACK_IMAGE;

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-black/30 rounded-lg p-2 flex items-center gap-2 cursor-pointer hover:bg-black/40 transition-colors"
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className="w-14 h-14 rounded-full bg-neutral-900 flex-shrink-0 overflow-hidden relative"
        style={borderStyle}
      >
        <Image
          src={src}
          alt={name}
          fill
          sizes="56px"
          className="rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-white font-semibold text-sm truncate">{name}</h4>
        <p className="text-gray-400 text-xs truncate">{cuisine}</p>
      </div>
    </div>
  );
};

export default FeaturedTruckCard;
