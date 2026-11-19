import { getSupabase } from '@/lib/supabase/client';
import type { FoodTruck } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { logError } from '@/lib/logging';

/**
 * Represents a favorite food truck with metadata
 */
export interface FavoriteTruck extends FoodTruck {
  favorite_id: string;
  favorited_at: string;
  total_reviews?: number;
}

/**
 * Result type for favorites operations
 */
export interface FavoritesResult<T> {
  data: T | undefined;
  error: string | undefined;
}

/**
 * Service class for managing user favorites
 * Ensures RLS is enforced for user-specific favorites
 */
export const FavoritesService = {
  /**
   * Get all favorite truck IDs for a user
   * @param userId - The user's ID
   * @returns Promise with array of truck IDs or error
   */
  async getFavoriteTruckIds(userId: string): Promise<FavoritesResult<string[]>> {
    try {
      const { data, error } = await getSupabase()
        .from('user_favorites')
        .select('food_truck_id')
        .eq('user_id', userId);

      if (error) {
        logError('Error fetching favorite IDs:', error);
        return { data: undefined, error: error.message };
      }

      const truckIds = (data ?? []).map((fav) => fav.food_truck_id);
      return { data: truckIds, error: undefined };
    } catch (error) {
      logError('Unexpected error fetching favorite IDs:', error);
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to fetch favorite IDs',
      };
    }
  },

  /**
   * Get all favorited trucks with full details for a user
   * @param userId - The user's ID
   * @returns Promise with array of FavoriteTruck objects or error
   */
  async getFavoritedTrucks(_userId: string): Promise<FavoritesResult<FavoriteTruck[]>> {
    try {
      const response = await fetch('/api/favorites/trucks', { cache: 'no-store' });
      if (!response.ok) {
        logError('Error fetching favorited trucks:', response.status);
        return { data: undefined, error: `Favorite trucks API returned ${response.status}` };
      }
      const body = (await response.json()) as { trucks?: FavoriteTruck[] };
      const formattedFavorites = body.trucks ?? [];

      return { data: formattedFavorites, error: undefined };
    } catch (error) {
      logError('Unexpected error fetching favorited trucks:', error);
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to fetch favorited trucks',
      };
    }
  },

  /**
   * Add a truck to user's favorites
   * @param userId - The user's ID
   * @param truckId - The truck's ID to favorite
   * @returns Promise with success boolean or error
   */
  async addFavorite(userId: string, truckId: string): Promise<FavoritesResult<boolean>> {
    try {
      const { error } = await getSupabase()
        .from('user_favorites')
        .insert({ user_id: userId, food_truck_id: truckId });

      if (error) {
        // Check if it's a duplicate error
        if (error.code === '23505') {
          return { data: true, error: undefined }; // Already favorited, consider it success
        }
        logError('Error adding favorite:', error);
        return { data: undefined, error: error.message };
      }

      return { data: true, error: undefined };
    } catch (error) {
      logError('Unexpected error adding favorite:', error);
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to add favorite',
      };
    }
  },

  /**
   * Remove a truck from user's favorites
   * @param userId - The user's ID
   * @param truckId - The truck's ID to unfavorite
   * @returns Promise with success boolean or error
   */
  async removeFavorite(userId: string, truckId: string): Promise<FavoritesResult<boolean>> {
    try {
      const { error } = await getSupabase()
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('food_truck_id', truckId);

      if (error) {
        logError('Error removing favorite:', error);
        return { data: undefined, error: error.message };
      }

      return { data: true, error: undefined };
    } catch (error) {
      logError('Unexpected error removing favorite:', error);
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to remove favorite',
      };
    }
  },

  /**
   * Remove a favorite by its favorite ID
   * @param favoriteId - The favorite entry's ID
   * @returns Promise with success boolean or error
   */
  async removeFavoriteById(favoriteId: string): Promise<FavoritesResult<boolean>> {
    try {
      const { error } = await getSupabase().from('user_favorites').delete().eq('id', favoriteId);

      if (error) {
        logError('Error removing favorite by ID:', error);
        return { data: undefined, error: error.message };
      }

      return { data: true, error: undefined };
    } catch (error) {
      logError('Unexpected error removing favorite by ID:', error);
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to remove favorite',
      };
    }
  },

  /**
   * Toggle favorite status for a truck
   * @param userId - The user's ID
   * @param truckId - The truck's ID to toggle
   * @param currentStatus - Current favorite status
   * @returns Promise with new favorite status or error
   */
  /**
   * Toggle favorite status for a truck (explicit action-based)
   * Prefer using addFavorite/removeFavorite directly when possible.
   */
  async toggleFavorite(
    userId: string,
    truckId: string,
    action: 'add' | 'remove',
  ): Promise<FavoritesResult<boolean>> {
    if (action === 'remove') {
      const result = await this.removeFavorite(userId, truckId);
      return typeof result.error === 'string' ? result : { data: false, error: undefined };
    }
    const result = await this.addFavorite(userId, truckId);
    return typeof result.error === 'string' ? result : { data: true, error: undefined };
  },

  /**
   * Check if a truck is favorited by a user
   * @param userId - The user's ID
   * @param truckId - The truck's ID to check
   * @returns Promise with favorite status or error
   */
  async isFavorited(userId: string, truckId: string): Promise<FavoritesResult<boolean>> {
    try {
      const { data, error } = await getSupabase()
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('food_truck_id', truckId)
        .single();

      if (error) {
        // Not found is not an error, just means not favorited
        if (error.code === 'PGRST116') {
          return { data: false, error: undefined };
        }
        logError('Error checking favorite status:', error);
        return { data: undefined, error: error.message };
      }

      const hasRecord = (data as { id?: unknown } | undefined)?.id != undefined;
      return { data: hasRecord, error: undefined };
    } catch (error) {
      logError('Unexpected error checking favorite status:', error);
      return {
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to check favorite status',
      };
    }
  },

  /**
   * Get current authenticated user
   * @returns Promise with User or null
   */
  async getCurrentUser(): Promise<User | undefined> {
    try {
      const {
        data: { user },
        error,
      } = await getSupabase().auth.getUser();

      if (error) {
        logError('Error getting current user:', error);
        return undefined;
      }

      return user ?? undefined;
    } catch (error) {
      logError('Unexpected error getting current user:', error);
      return undefined;
    }
  },
};
