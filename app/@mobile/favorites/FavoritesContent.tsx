'use client';

import React from 'react';
import { FavoritesDisplay } from '@/components/ui/favorites/FavoritesDisplay';

interface FavoritesContentProps {
  className?: string;
  onBack?: () => void;
  onDiscoverTrucks?: () => void;
  onAuthRequired?: () => void;
}

export const FavoritesContentComponent: React.FC<FavoritesContentProps> = ({
  className = '',
  onBack,
  onDiscoverTrucks,
  onAuthRequired,
}) => {
  return (
    <FavoritesDisplay
      onBack={onBack}
      onDiscoverTrucks={onDiscoverTrucks}
      showHeader={false}
      className={className}
      contentClassName="pb-[144px]"
      onAuthRequiredClick={onAuthRequired}
    />
  );
};
