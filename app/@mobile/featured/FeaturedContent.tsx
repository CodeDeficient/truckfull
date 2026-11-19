'use client';

import React from 'react';
import { FeaturedDisplay } from '@/components/ui/featured/FeaturedDisplay';

interface FeaturedContentProps {
  className?: string;
  onTruckClick?: (id: string) => void;
  onOfferRedeem?: (id: string) => void;
  onEventDetails?: (id: string) => void;
}

export const FeaturedContentComponent: React.FC<FeaturedContentProps> = ({
  className = '',
  onTruckClick,
  onOfferRedeem,
  onEventDetails,
}) => {
  return (
    <FeaturedDisplay
      onTruckClick={onTruckClick}
      onOfferRedeem={onOfferRedeem}
      onEventDetails={onEventDetails}
      showHeader={false}
      className={className}
      contentClassName="pb-[200px]"
    />
  );
};
