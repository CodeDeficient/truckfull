'use client';

import React from 'react';
import { useFavoritesData } from '@/hooks/useFavoritesData';
import { BaseDisplay } from '@/components/ui/shared/BaseDisplay';
import { FavoritesList } from './FavoritesDisplayComponents';
import { Heart } from 'lucide-react';
import {
  LoadingContent,
  ErrorContent,
  EmptyContent,
} from '@/components/ui/shared/BaseDisplayComponents';

interface FavoritesDisplayProps {
  onBack?: () => void;
  onDiscoverTrucks?: () => void;
  showHeader?: boolean;
  className?: string;
  contentClassName?: string;
  onAuthRequiredClick?: () => void;
}

export const FavoritesDisplay: React.FC<FavoritesDisplayProps> = ({
  onBack,
  onDiscoverTrucks,
  showHeader = true,
  className = '',
  contentClassName = '',
  onAuthRequiredClick,
}) => {
  const { favorites, loading, error, retry, removeFavorite, isAuthenticated, authLoading } =
    useFavoritesData();

  // Render the favorites list content
  const renderFavoritesList = () => (
    <FavoritesList favorites={favorites} onRemoveFavorite={removeFavorite} />
  );

  // Render the custom content based on the current state
  const renderContent = () => {
    if (loading) {
      return <LoadingContent message="Loading your favorites..." />;
    }

    if (error) {
      return <ErrorContent error={error} onRetry={retry} />;
    }

    if (favorites.length === 0) {
      return (
        <EmptyContent
          onDiscoverTrucks={onDiscoverTrucks}
          title="Favorites"
          message="Heart your favorite food trucks to see them here"
          icon={<Heart className="w-16 h-16 text-gray-600 mb-4" />}
        />
      );
    }

    return renderFavoritesList();
  };

  return (
    <BaseDisplay
      data={favorites}
      loading={loading}
      error={error}
      retry={retry}
      isAuthenticated={isAuthenticated}
      authLoading={authLoading}
      onBack={onBack}
      onDiscoverTrucks={onDiscoverTrucks}
      showHeader={showHeader}
      className={className}
      contentClassName={contentClassName}
      title="Favorites"
      emptyMessage="Heart your favorite food trucks to see them here"
      emptyIcon={<Heart className="w-16 h-16 text-gray-600 mb-4" />}
      authRequiredMessage="You need to sign in to view your favorite food trucks. Save your favorite trucks to quickly find them later."
      authRequiredIcon={<Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />}
      onAuthRequiredClick={onAuthRequiredClick}
      renderItemContent={renderContent}
    />
  );
};
