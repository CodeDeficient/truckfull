'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/auth/AuthProvider';
import { cachingService } from '@/lib/services/cachingService';
import { FavoritesService, type FavoriteTruck } from '@/lib/services/favorites';
import { refreshFavoriteIds } from '@/lib/stores/userFavoriteIds';
import { logError } from '@/lib/logging';

// Create a safe useAuth hook that handles missing context
function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    // If AuthProvider context is missing, return safe defaults
    return { user: null, loading: true };
  }
}

export function useFavoritesData() {
  const [favorites, setFavorites] = useState<FavoriteTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, loading: authLoading } = useSafeAuth();

  const fetchFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!cachingService.canMakeRequest(user.id)) {
        setError('Rate limit exceeded. Please wait before trying again.');
        return;
      }

      const result = await FavoritesService.getFavoritedTrucks(user.id);

      if (result.error) {
        throw new Error(result.error);
      }

      setFavorites(result.data ?? []);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to load favorites');
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const retry = async () => {
    if (!user) return;
    await fetchFavorites();
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const result = await FavoritesService.removeFavoriteById(favoriteId);

      if (result.error) {
        throw new Error(result.error);
      }

      setFavorites((prev) => prev.filter((fav) => fav.favorite_id !== favoriteId));
      void refreshFavoriteIds();
    } catch (error_) {
      logError('Failed to remove favorite:', error_);
      setError(error_ instanceof Error ? error_.message : 'Failed to remove favorite');
    }
  };

  useEffect(() => {
    if (!authLoading) {
      void fetchFavorites();
    }
  }, [user?.id, authLoading]);

  return {
    favorites,
    loading,
    error,
    retry,
    removeFavorite,
    isAuthenticated: !!user,
    authLoading,
  };
}
