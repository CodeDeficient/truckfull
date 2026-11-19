/**
 * SOTA Database Query Optimization and Caching
 * Implements Next.js unstable_cache for optimal performance
 */

import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { FoodTruckService } from '@/lib/supabase';
import type { FoodTruck } from '@/lib/types';
import { calculateDistance } from '@/lib/utils/foodTruckHelpers';
import type { FiltersState } from '../filters/types';
import { DEFAULT_FILTERS } from '../filters/types';
import { isOpenNow } from '@/lib/utils/operatingHours';
import { logWarning, logMessage } from '@/lib/logging';
import { PUBLIC_TRUCKS_TAG } from '@/lib/services/publicTruckPage';
import { fetchNearbyTrucks } from '@/lib/api/trucks/fetchNearbyTrucks';
import { fromFoodTruckRow, type FoodTruckMapperInput } from '@/lib/mappers/domain';
import { convertToFoodTruck } from '@/lib/utils/truckUtils';

// Cache configuration
const CACHE_CONFIG = {
  // Short-term cache for frequently changing data
  SHORT_TTL: 60 * 5, // 5 minutes
  // Medium-term cache for semi-static data
  MEDIUM_TTL: 60 * 30, // 30 minutes
  // Long-term cache for static data
  LONG_TTL: 60 * 60 * 24, // 24 hours
} as const;

/**
 * Cached food truck queries with optimized database access
 */
export const CachedFoodTruckService = {
  /**
   * Get all food trucks with caching
   * Cache for 30 minutes since truck data changes moderately
   */
  getAllTrucksCached: unstable_cache(
    async (): Promise<{ trucks: FoodTruck[]; count: number }> => {
      logMessage('CachedFoodTruckService: Cache miss - fetching all trucks from database');
      const result = await FoodTruckService.getAllTrucks();
      if ('error' in result) {
        throw new Error(`Failed to fetch all trucks: ${result.error}`);
      }
      return { trucks: result.trucks, count: result.total };
    },
    ['all-trucks'],
    {
      revalidate: CACHE_CONFIG.MEDIUM_TTL,
      tags: ['food-trucks', 'all-trucks'],
    },
  ),

  /**
   * Get trucks by location with caching
   * Cache for 5 minutes since location-based queries are time-sensitive
   */
  getTrucksByLocationCached: unstable_cache(
    async (
      lat: number,
      lng: number,
      radiusMilesOrFilters?: number | FiltersState,
    ): Promise<FoodTruck[]> => {
      let radiusMiles: number;
      if (typeof radiusMilesOrFilters === 'number') {
        // Backward compatibility: if a number is passed, treat as radiusMiles
        radiusMiles = radiusMilesOrFilters;
      } else {
        // New implementation: if FiltersState is passed, use its radiusMiles
        const filters = radiusMilesOrFilters ?? DEFAULT_FILTERS;
        radiusMiles = filters.radiusMiles;
      }

      logMessage(
        `CachedFoodTruckService: Cache miss - fetching trucks near ${lat},${lng} (${radiusMiles} miles)`,
      );
      const rows = await fetchNearbyTrucks({
        lat,
        lng,
        radiusMiles,
        client: getSupabaseAdmin(),
        enrichTiers: false,
      });
      return rows.map((row) =>
        convertToFoodTruck(fromFoodTruckRow(row as unknown as FoodTruckMapperInput), false),
      );
    },
    ['trucks-by-location'],
    {
      revalidate: CACHE_CONFIG.SHORT_TTL,
      tags: ['food-trucks', 'location-search'],
    },
  ),

  /**
   * Get truck by ID with caching
   * Cache for 30 minutes since individual truck data is relatively stable
   */
  getTruckByIdCached: unstable_cache(
    async (id: string): Promise<FoodTruck | null> => {
      logMessage(`CachedFoodTruckService: Cache miss - fetching truck ${id} from database`);
      const result = await FoodTruckService.getTruckById(id);
      if ('error' in result) {
        return null;
      }
      return result;
    },
    ['truck-by-id'],
    {
      revalidate: CACHE_CONFIG.MEDIUM_TTL,
      tags: ['food-trucks', 'truck-details'],
    },
  ),

  /**
   * Search trucks with caching
   * Cache for 5 minutes since search results should be relatively fresh
   */
  searchTrucksCached: unstable_cache(
    async (
      query: string,
      filters?: {
        cuisine?: string;
        openNow?: boolean;
        lat?: number;
        lng?: number;
        radius?: number;
      },
    ): Promise<FoodTruck[]> => {
      logMessage(`CachedFoodTruckService: Cache miss - searching trucks for "${query}"`);

      if (getSupabaseAdmin() == undefined) {
        throw new Error('Supabase admin client not available');
      }

      let dbQuery = getSupabaseAdmin()
        .from('food_trucks')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,cuisine_type.cs.{${query}}`);

      // Apply filters
      if (filters?.cuisine != undefined && filters.cuisine !== '') {
        dbQuery = dbQuery.contains('cuisine_type', [filters.cuisine]);
      }

      const { data, error } = (await dbQuery.limit(5000)) as {
        data: FoodTruck[] | null;
        error: unknown;
      };
      const trucks: FoodTruck[] = data ?? [];

      if (error != undefined) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        throw new Error(`Search query failed: ${errorMessage}`);
      }

      let results: FoodTruck[] = trucks ?? [];

      // Apply location filter if provided
      if (filters?.lat != undefined && filters?.lng != undefined && filters?.radius != undefined) {
        results = results.filter((truck: FoodTruck): truck is FoodTruck => {
          if (
            truck.current_location?.lat == undefined ||
            truck.current_location?.lng == undefined
          ) {
            return false;
          }
          const distance = calculateDistance(
            filters.lat!, // Assert as number, as it's checked by the outer if condition
            filters.lng!, // Assert as number, as it's checked by the outer if condition
            truck.current_location.lat,
            truck.current_location.lng,
          );
          return distance <= (filters.radius ?? 10);
        });
      }

      // Apply openNow filter if provided
      if (filters?.openNow === true) {
        results = results.filter((truck) => isOpenNow(truck));
      }

      return results;
    },
    ['search-trucks'],
    {
      revalidate: CACHE_CONFIG.SHORT_TTL,
      tags: ['food-trucks', 'search'],
    },
  ),

  /**
   * Get data quality statistics with caching
   * Cache for 24 hours since quality stats change slowly
   */
  getDataQualityStatsCached: unstable_cache(
    async (): Promise<{
      averageScore: number;
      distribution: Record<string, number>;
      totalTrucks: number;
    }> => {
      logMessage('CachedFoodTruckService: Cache miss - calculating data quality stats');

      if (getSupabaseAdmin() == undefined) {
        throw new Error('Supabase admin client not available');
      }

      const { data: trucks, error } = await getSupabaseAdmin()
        .from('food_trucks')
        .select('data_quality_score');

      if (error) {
        throw new Error(`Quality stats query failed: ${error.message}`);
      }

      const scores =
        trucks == undefined
          ? []
          : trucks.map((t: { data_quality_score: number | null }) => t.data_quality_score ?? 0);
      const averageScore =
        scores.length > 0
          ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
          : 0;

      const distribution = {
        high: scores.filter((s: number) => s >= 0.8).length,
        medium: scores.filter((s: number) => s >= 0.6 && s < 0.8).length,
        low: scores.filter((s: number) => s < 0.6).length,
      };

      return {
        averageScore: Math.round(averageScore * 100) / 100,
        distribution,
        totalTrucks: scores.length,
      };
    },
    ['data-quality-stats'],
    {
      revalidate: CACHE_CONFIG.LONG_TTL,
      tags: ['food-trucks', 'data-quality'],
    },
  ),
};

/**
 * Cache invalidation utilities
 */
export const CacheManager = {
  /**
   * Invalidate all food truck related caches
   */
  async invalidateAllFoodTruckCaches(): Promise<void> {
    try {
      const { revalidateTag } = await import('next/cache');
      revalidateTag('food-trucks', 'max');
      revalidateTag(PUBLIC_TRUCKS_TAG, 'max');
      logMessage('CacheManager: Invalidated all food truck caches');
    } catch (error) {
      logWarning('CacheManager: Failed to invalidate caches:', error);
    }
  },

  /**
   * Invalidate specific truck cache
   */
  async invalidateTruckCache(truckId: string): Promise<void> {
    try {
      const { revalidateTag } = await import('next/cache');
      revalidateTag(`truck-${truckId}`, 'max');
      revalidateTag('food-trucks', 'max'); // Also invalidate general caches
      revalidateTag(PUBLIC_TRUCKS_TAG, 'max');
      logMessage(`CacheManager: Invalidated cache for truck ${truckId}`);
    } catch (error) {
      logWarning('CacheManager: Failed to invalidate truck cache:', error);
    }
  },

  /**
   * Invalidate search and location caches
   */
  async invalidateSearchCaches(): Promise<void> {
    try {
      const { revalidateTag } = await import('next/cache');
      revalidateTag('search', 'max');
      revalidateTag('location-search', 'max');
      logMessage('CacheManager: Invalidated search caches');
    } catch (error) {
      logWarning('CacheManager: Failed to invalidate search caches:', error);
    }
  },
};
