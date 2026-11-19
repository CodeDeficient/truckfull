import { FavoritesService } from '@/lib/services/favorites';
import { createFavoriteIdsStore } from '@/lib/stores/favoriteIdsStore';

export const useFavoriteIdsStore = createFavoriteIdsStore((userId) =>
  FavoritesService.getFavoriteTruckIds(userId),
);

export function refreshFavoriteIds(): Promise<void> {
  const { userId, reload } = useFavoriteIdsStore.getState();
  return userId == undefined ? Promise.resolve() : reload(userId);
}
