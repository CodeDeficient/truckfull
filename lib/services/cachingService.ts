/**
 * Caching Service for Mobile App
 *
 * Implements cost-effective caching strategies for Supabase free tier:
 * - Client-side caching with localStorage/IndexedDB
 * - Request rate limiting for unauthenticated users
 * - Smart cache invalidation based on data type
 * - Offline-first approach for better UX
 */

import type { FoodTruckDomain } from '@/lib/types';
import { logWarning } from '@/lib/logging';

export interface CacheConfig {
  maxAge: number; // milliseconds
  maxRequestsPerMinute: number;
  enableOfflineMode: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

export class CachingService {
  private static instance: CachingService;
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  private readonly CACHE_VERSION = '1.0';
  private readonly STORAGE_KEYS = {
    FOOD_TRUCKS: 'food_trucks_cache',
    FEATURED_CONTENT: 'featured_content_cache',
    USER_LOCATION: 'user_location_cache',
    LAST_REQUEST_TIME: 'last_request_time',
  };

  // Cache durations based on data volatility
  private readonly CACHE_DURATIONS = {
    // Static data - cache for longer periods
    FOOD_TRUCKS_BASE: 4 * 60 * 60 * 1000, // 4 hours
    FEATURED_CONTENT: 2 * 60 * 60 * 1000, // 2 hours

    // Dynamic data - cache for shorter periods
    OPERATING_HOURS: 30 * 60 * 1000, // 30 minutes
    USER_LOCATION: 15 * 60 * 1000, // 15 minutes

    // Real-time data - minimal caching
    REVIEWS_AND_RATINGS: 5 * 60 * 1000, // 5 minutes
  };

  static getInstance(): CachingService {
    if (!CachingService.instance) {
      CachingService.instance = new CachingService();
    }
    return CachingService.instance;
  }

  /**
   * Check if user has exceeded rate limits
   */
  canMakeRequest(userId?: string): boolean {
    const key = userId ?? 'anonymous';
    const now = Date.now();
    const userRequests = this.requestCounts.get(key);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset counter for new minute
      this.requestCounts.set(key, { count: 1, resetTime: now + 60_000 });
      return true;
    }

    // Different limits for authenticated vs anonymous users
    const maxRequests = userId ? 120 : 30; // 120/min for auth, 30/min for anonymous

    if (userRequests.count >= maxRequests) {
      return false;
    }

    userRequests.count++;
    return true;
  }

  /**
   * Get cached food trucks data
   */
  getCachedFoodTrucks(): Promise<FoodTruckDomain[] | null> {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEYS.FOOD_TRUCKS);
      if (!cached) return Promise.resolve(null);

      const entry: CacheEntry<FoodTruckDomain[]> = JSON.parse(cached);

      // Check if cache is still valid
      if (this.isCacheValid(entry, this.CACHE_DURATIONS.FOOD_TRUCKS_BASE)) {
        return Promise.resolve(entry.data);
      }

      // Remove expired cache
      localStorage.removeItem(this.STORAGE_KEYS.FOOD_TRUCKS);
    } catch (error) {
      logWarning('Error reading food trucks cache:', error);
    }

    return Promise.resolve(null);
  }

  /**
   * Cache food trucks data
   */
  setCachedFoodTrucks(trucks: FoodTruckDomain[]): Promise<void> {
    try {
      const entry: CacheEntry<FoodTruckDomain[]> = {
        data: trucks,
        timestamp: Date.now(),
        version: this.CACHE_VERSION,
      };

      localStorage.setItem(this.STORAGE_KEYS.FOOD_TRUCKS, JSON.stringify(entry));
    } catch (error) {
      logWarning('Error caching food trucks:', error);
    }
    return Promise.resolve();
  }

  /**
   * Get cached featured content
   */
  getCachedFeaturedContent<T = unknown>(): Promise<T | null> {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEYS.FEATURED_CONTENT);
      if (!cached) return Promise.resolve(null);

      const entry: CacheEntry<T> = JSON.parse(cached);

      if (this.isCacheValid(entry, this.CACHE_DURATIONS.FEATURED_CONTENT)) {
        return Promise.resolve(entry.data);
      }

      localStorage.removeItem(this.STORAGE_KEYS.FEATURED_CONTENT);
    } catch (error) {
      logWarning('Error reading featured content cache:', error);
    }

    return Promise.resolve(null);
  }

  /**
   * Cache featured content
   */
  setCachedFeaturedContent<T = unknown>(content: T): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data: content,
        timestamp: Date.now(),
        version: this.CACHE_VERSION,
      };

      localStorage.setItem(this.STORAGE_KEYS.FEATURED_CONTENT, JSON.stringify(entry));
    } catch (error) {
      logWarning('Error caching featured content:', error);
    }
    return Promise.resolve();
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid<T>(entry: CacheEntry<T>, maxAge: number): boolean {
    const now = Date.now();
    return entry.version === this.CACHE_VERSION && now - entry.timestamp < maxAge;
  }

  /**
   * Clear all cached data
   */
  clearAllCache(): Promise<void> {
    try {
      for (const key of Object.values(this.STORAGE_KEYS)) {
        localStorage.removeItem(key);
      }
      this.requestCounts.clear();
    } catch (error) {
      logWarning('Error clearing cache:', error);
    }
    return Promise.resolve();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    foodTrucksSize: number;
    featuredContentSize: number;
    requestCounts: Record<string, number>;
  } {
    let foodTrucksSize = 0;
    let featuredContentSize = 0;

    try {
      const foodTrucks = localStorage.getItem(this.STORAGE_KEYS.FOOD_TRUCKS);
      const featured = localStorage.getItem(this.STORAGE_KEYS.FEATURED_CONTENT);

      if (foodTrucks) foodTrucksSize = new Blob([foodTrucks]).size;
      if (featured) featuredContentSize = new Blob([featured]).size;
    } catch (error) {
      logWarning('Error calculating cache stats:', error);
    }

    const requestCounts: Record<string, number> = {};
    for (const [key, value] of this.requestCounts) {
      requestCounts[key] = value.count;
    }

    return {
      foodTrucksSize,
      featuredContentSize,
      requestCounts,
    };
  }
}

// Export singleton instance
export const cachingService = CachingService.getInstance();
