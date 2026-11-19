'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FavoritesService, type FavoriteTruck } from '@/lib/services/favorites';
import { refreshFavoriteIds } from '@/lib/stores/userFavoriteIds';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import type { FavoriteTruckLite } from '@/lib/types';
import { FavoritesLoading } from './_components/FavoritesLoading';
import { FavoritesErrorCard } from './_components/FavoritesErrorCard';
import { FavoritesPageContent } from './_components/FavoritesPageContent';
import { logError, logMessage } from '@/lib/logging';

export const dynamic = 'force-dynamic';

async function fetchFavoriteLites(userId: string): Promise<FavoriteTruckLite[]> {
  const result = await FavoritesService.getFavoritedTrucks(userId);
  if (typeof result.error === 'string' && result.error.length > 0) {
    throw new Error(result.error);
  }
  return (result.data ?? []).map((f: FavoriteTruck) => ({
    id: f.id,
    name: f.name ?? 'Unnamed Truck',
    favorite_id: f.favorite_id,
    favorited_at: f.favorited_at,
    current_location: f.current_location ?? undefined,
    cuisine_type: f.cuisine_type ?? undefined,
    operating_hours: f.operating_hours ?? undefined,
    average_rating: typeof f.average_rating === 'number' ? f.average_rating : undefined,
    total_reviews: typeof f.total_reviews === 'number' ? f.total_reviews : undefined,
    contact_info: f.contact_info ?? undefined,
  }));
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteTruckLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [removingFavorite, setRemovingFavorite] = useState<string | undefined>();
  const router = useRouter();
  const { user, loading: authLoading } = useSafeAuth();
  const userId = user?.id;

  useEffect(() => {
    if (authLoading) return;
    if (userId == undefined) {
      router.push('/?auth=open&next=/favorites');
      return;
    }
    let active = true;
    setLoading(true);
    setError(undefined);
    fetchFavoriteLites(userId)
      .then((mapped) => {
        if (active) setFavorites(mapped);
      })
      .catch((error_: unknown) => {
        logError('Error loading favorites:', error_);
        if (active) setError(error_ instanceof Error ? error_.message : 'Failed to load favorites');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, userId, router]);

  const handleRemoveFavorite = async (favoriteId: string, truckName: string) => {
    try {
      setRemovingFavorite(favoriteId);

      const result = await FavoritesService.removeFavoriteById(favoriteId);

      if (typeof result.error === 'string' && result.error.length > 0) {
        throw new Error(result.error);
      }

      // Remove from local state
      setFavorites((prev) => prev.filter((fav) => fav.favorite_id !== favoriteId));
      void refreshFavoriteIds();

      // Show success feedback (you could add a toast here)
      logMessage(`Removed ${truckName} from favorites`);
    } catch (error_) {
      logError('Error removing favorite:', error_);
      setError(error_ instanceof Error ? error_.message : 'Failed to remove favorite');
    } finally {
      setRemovingFavorite(undefined);
    }
  };

  if (loading) {
    return <FavoritesLoading />;
  }

  if (typeof error === 'string' && error.length > 0) {
    return <FavoritesErrorCard message={error} onRetry={() => globalThis.location?.reload?.()} />;
  }

  return (
    <FavoritesPageContent
      favorites={favorites}
      removingFavorite={removingFavorite}
      onRemove={(id: string, name: string) => {
        void handleRemoveFavorite(id, name);
      }}
      onBack={() => router.back()}
      onProfile={() => router.push('/profile')}
    />
  );
}
