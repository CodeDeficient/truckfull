import { useEffect, useCallback } from 'react';
import { FavoritesService } from '@/lib/services/favorites';
import { useFavoriteIdsStore } from '@/lib/stores/userFavoriteIds';
import { useAuth } from '@/app/auth/AuthProvider';
import { logError } from '@/lib/logging';

type FavoriteActionResult = { success: boolean; error?: string };

const AUTH_REQUIRED: FavoriteActionResult = { success: false, error: 'Authentication required' };

async function runFavoriteChange(
  label: string,
  change: () => Promise<{ error: string | undefined }>,
  onSuccess: () => void,
): Promise<FavoriteActionResult> {
  try {
    const result = await change();
    if (typeof result.error === 'string' && result.error.length > 0) {
      logError(`Error ${label} favorite:`, result.error);
      return { success: false, error: result.error };
    }
    onSuccess();
    return { success: true };
  } catch (error_) {
    logError(`Unexpected error ${label} favorite:`, error_);
    return {
      success: false,
      error: error_ instanceof Error ? error_.message : `Failed ${label} favorite`,
    };
  }
}

function useFavoriteMutations(userId: string | undefined, isFavorited: (id: string) => boolean): {
  toggleFavorite: (truckId: string, onAuthRequired?: () => void) => Promise<FavoriteActionResult>;
  addFavorite: (truckId: string, onAuthRequired?: () => void) => Promise<FavoriteActionResult>;
  removeFavorite: (truckId: string) => Promise<FavoriteActionResult>;
} {
  const markFavorite = useFavoriteIdsStore((s) => s.markFavorite);

  const toggleFavorite = useCallback(
    (truckId: string, onAuthRequired?: () => void): Promise<FavoriteActionResult> => {
      if (userId == undefined) {
        onAuthRequired?.();
        return Promise.resolve(AUTH_REQUIRED);
      }
      const wasFavorited = isFavorited(truckId);
      return runFavoriteChange(
        'toggling',
        () => FavoritesService.toggleFavorite(userId, truckId, wasFavorited ? 'remove' : 'add'),
        () => markFavorite(userId, truckId, !wasFavorited),
      );
    },
    [userId, isFavorited, markFavorite],
  );

  const addFavorite = useCallback(
    (truckId: string, onAuthRequired?: () => void): Promise<FavoriteActionResult> => {
      if (userId == undefined) {
        onAuthRequired?.();
        return Promise.resolve(AUTH_REQUIRED);
      }
      return runFavoriteChange(
        'adding',
        () => FavoritesService.addFavorite(userId, truckId),
        () => markFavorite(userId, truckId, true),
      );
    },
    [userId, markFavorite],
  );

  const removeFavorite = useCallback(
    (truckId: string): Promise<FavoriteActionResult> => {
      if (userId == undefined) return Promise.resolve(AUTH_REQUIRED);
      return runFavoriteChange(
        'removing',
        () => FavoritesService.removeFavorite(userId, truckId),
        () => markFavorite(userId, truckId, false),
      );
    },
    [userId, markFavorite],
  );

  return { toggleFavorite, addFavorite, removeFavorite };
}

export function useFavorites(): {
  favoriteIds: Set<string>;
  loading: boolean;
  error: string | undefined;
  isFavorited: (truckId: string) => boolean;
  toggleFavorite: (truckId: string, onAuthRequired?: () => void) => Promise<FavoriteActionResult>;
  addFavorite: (truckId: string, onAuthRequired?: () => void) => Promise<FavoriteActionResult>;
  removeFavorite: (truckId: string) => Promise<FavoriteActionResult>;
  refreshFavorites: () => Promise<void>;
  isAuthenticated: boolean;
} {
  const { user } = useAuth();
  const userId = user?.id;
  const favoriteIds = useFavoriteIdsStore((s) => s.favoriteIds);
  const loading = useFavoriteIdsStore((s) => s.loading);
  const error = useFavoriteIdsStore((s) => s.error);
  const ensureLoaded = useFavoriteIdsStore((s) => s.ensureLoaded);
  const reload = useFavoriteIdsStore((s) => s.reload);

  useEffect(() => {
    void ensureLoaded(userId);
  }, [userId, ensureLoaded]);

  const isFavorited = useCallback((truckId: string) => favoriteIds.has(truckId), [favoriteIds]);
  const mutations = useFavoriteMutations(userId, isFavorited);

  const refreshFavorites = useCallback(
    (): Promise<void> => (userId == undefined ? Promise.resolve() : reload(userId)),
    [userId, reload],
  );

  return {
    favoriteIds,
    loading,
    error,
    isFavorited,
    ...mutations,
    refreshFavorites,
    isAuthenticated: !!user,
  };
}
