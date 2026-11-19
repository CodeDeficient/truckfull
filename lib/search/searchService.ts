import { logDebug } from '@/lib/logging';
import { calculateDistance } from '@/lib/utils/geoUtils';
// lib/search/searchService.ts
// Search functionality for food truck finder application

export interface SearchFilters {
  cuisine?: string;
  location?: { lat: number; lng: number; radius?: number };
  rating?: number;
  price?: 'low' | 'medium' | 'high' | 'any';
  availability?: 'open_now' | 'all';
  dietary_restrictions?: string[];
}

export interface SearchParams {
  query?: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  name: string;
  cuisine: string[];
  location: { lat: number; lng: number };
  rating: number;
  price: 'low' | 'medium' | 'high';
  distance?: number; // Calculated if location filter is provided
  is_open: boolean;
}

export class SearchService {
  private static instance: SearchService;

  private constructor() {}

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  private calculateDistance(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number },
  ): number {
    return calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
  }

  searchFoodTrucks(params: SearchParams): Promise<SearchResult[]> {
    logDebug('Searching for food trucks with params:', params);

    // This would connect to an actual search service like PostgreSQL with pg_trgm,
    // or a dedicated search service like Elasticsearch/Algolia in a complete implementation
    const results: SearchResult[] = [
      {
        id: '1',
        name: 'Taco Express',
        cuisine: ['Mexican'],
        location: { lat: 40.7128, lng: -74.006 },
        rating: 4.5,
        price: 'medium',
        distance: params.filters?.location
          ? this.calculateDistance(params.filters.location, { lat: 40.7128, lng: -74.006 })
          : undefined,
        is_open: true,
      },
      {
        id: '2',
        name: 'Burger Palace',
        cuisine: ['American', 'Burgers'],
        location: { lat: 40.7589, lng: -73.9851 },
        rating: 4.2,
        price: 'medium',
        distance: params.filters?.location
          ? this.calculateDistance(params.filters.location, { lat: 40.7589, lng: -73.9851 })
          : undefined,
        is_open: true,
      },
    ];

    // Apply filters
    return Promise.resolve(this.applyFilters(results, params.filters));
  }

  private applyFilters(results: SearchResult[], filters?: SearchFilters): SearchResult[] {
    if (!filters) return results;

    return results.filter((result) => {
      // Apply cuisine filter
      if (
        filters &&
        filters.cuisine &&
        !result.cuisine.some((c) => c.toLowerCase().includes(filters.cuisine!.toLowerCase()))
      ) {
        return false;
      }

      // Apply rating filter
      if (filters && filters.rating && result.rating < filters.rating) {
        return false;
      }

      // Apply price filter
      if (filters && filters.price && filters.price !== 'any' && result.price !== filters.price) {
        return false;
      }

      // Apply location filter with radius
      if (
        filters &&
        filters.location?.radius &&
        result.distance !== undefined &&
        result.distance > filters.location.radius
      ) {
        return false;
      }

      // Apply open now filter
      if (filters && filters.availability === 'open_now' && !result.is_open) {
        return false;
      }

      return true;
    });
  }

  autocompleteSearch(query: string): Promise<string[]> {
    // This would connect to an actual autocomplete service in a complete implementation
    logDebug('Autocomplete search for:', query);
    return Promise.resolve([`Suggestion for "${query}"`, `Another suggestion for "${query}"`]);
  }
}
