'use client';

import React, { useState, useEffect } from 'react';
import { FavoritesHeader } from '@/components/favorites/FavoritesHeader';
import { FavoritesGrid } from '@/components/favorites/FavoritesGrid';
import { FavoritesEmpty } from '@/components/favorites/FavoritesEmpty';
import type { FavoriteTruckLite } from '@/lib/types';
import { FavoritesService } from '@/lib/services/favorites';
import { refreshFavoriteIds } from '@/lib/stores/userFavoriteIds';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { logError } from '@/lib/logging';

const handleBack = (): void => {
  globalThis.history.back();
};

const handleProfile = (): void => {
  // Navigate to profile page
  globalThis.location.href = '/@mobile/user_profile';
};

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteTruckLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [removingFavorite, setRemovingFavorite] = useState<string>();

  // Get authentication state
  const { user, loading: authLoading } = useSafeAuth();

  useEffect(() => {
    if (!authLoading && user) {
      void fetchFavorites();
    } else if (!authLoading && !user) {
      setLoading(false);
      setError('User not authenticated');
    }
  }, [user, authLoading]);

  const fetchFavorites = async (): Promise<void> => {
    try {
      if (!user) {
        setError('User not authenticated');
        return;
      }

      setLoading(true);
      setError(undefined);

      // Call the real favorites service to get the user's favorites
      const result = await FavoritesService.getFavoritedTrucks(user.id);

      if (result.error) {
        throw new Error(result.error);
      }

      // Convert the favorite trucks to the FavoriteTruckLite format
      const favoritesLite = (result.data ?? []).map((fav) => ({
        id: fav.id,
        name: fav.name,
        cuisine_type: fav.cuisine_type,
        current_location: fav.current_location,
        average_rating: fav.average_rating,
        image_url: fav.image_url,
        favorite_id: fav.favorite_id,
        favorited_at: fav.favorited_at,
        operating_hours: fav.operating_hours,
        total_reviews: fav.total_reviews,
        contact_info: {
          phone: fav.contact_info?.phone,
          website: fav.contact_info?.website,
        },
        is_open: fav.is_open,
      }));

      setFavorites(favoritesLite);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string): Promise<void> => {
    try {
      if (!user) {
        setError('User not authenticated');
        return;
      }

      setRemovingFavorite(favoriteId);

      // Call the real favorites service to remove the favorite
      const result = await FavoritesService.removeFavoriteById(favoriteId);

      if (result.error) {
        throw new Error(result.error);
      }

      // Update the UI by removing the favorite from the local state
      setFavorites((prev) => {
        return prev.filter((fav) => fav.favorite_id !== favoriteId);
      });
      void refreshFavoriteIds();
    } catch (error_) {
      logError('Failed to remove favorite:', error_);
      setError(error_ instanceof Error ? error_.message : 'Failed to remove favorite');
    } finally {
      setRemovingFavorite(undefined);
    }
  };

  if (authLoading || loading) {
    return (
      <div
        className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden"
       
      >
        <div className="flex-grow flex items-center justify-center">
          <div className="text-white text-lg">Loading favorites...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden"
       
      >
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-4">Error: {error}</div>
            <button
              onClick={() => {
                void fetchFavorites();
              }}
              className="px-6 py-3 bg-[var(--primary-color)] text-white rounded-full"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden"
     
    >
      <div className="flex-grow">
        <FavoritesHeader count={favorites.length} onBack={handleBack} onProfile={handleProfile} />

        <div className="px-4 pb-4">
          {favorites.length === 0 ? (
            <FavoritesEmpty />
          ) : (
            <FavoritesGrid
              favorites={favorites}
              removingFavorite={removingFavorite}
              onRemove={(favoriteId: string) => {
                void handleRemoveFavorite(favoriteId);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
