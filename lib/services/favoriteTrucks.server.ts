import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { PUBLIC_TRUCK_CLIENT_COLUMNS } from '@/lib/supabase/services/foodTruckService.client.helpers';
import { toPublicFoodTruck } from '@/lib/mappers/publicView';
import type { FoodTruck, PublicFoodTruck } from '@/lib/types';

export type FavoriteTruckRecord = PublicFoodTruck & {
  readonly favorite_id: string;
  readonly favorited_at: string;
};

type FavoriteLink = { id: string; created_at: string; food_truck_id: string };

async function listFavoriteLinks(userId: string): Promise<FavoriteLink[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('user_favorites')
    .select('id, created_at, food_truck_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Favorite lookup failed: ${error.message}`);
  return data ?? [];
}

async function listTrucksById(ids: string[]): Promise<Map<string, PublicFoodTruck>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await getSupabaseAdmin()
    .from('food_trucks')
    .select(PUBLIC_TRUCK_CLIENT_COLUMNS)
    .in('id', ids);
  if (error) throw new Error(`Favorite truck lookup failed: ${error.message}`);
  const trucks = (data ?? []) as unknown as FoodTruck[];
  return new Map(trucks.map((truck) => [truck.id, toPublicFoodTruck(truck)]));
}

export async function listFavoriteTrucks(userId: string): Promise<FavoriteTruckRecord[]> {
  const links = await listFavoriteLinks(userId);
  const trucks = await listTrucksById([...new Set(links.map((link) => link.food_truck_id))]);
  return links.flatMap((link) => {
    const truck = trucks.get(link.food_truck_id);
    return truck ? [{ ...truck, favorite_id: link.id, favorited_at: link.created_at }] : [];
  });
}
