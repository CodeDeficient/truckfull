import { DEFAULT_SEARCH_RADIUS_MILES } from '@/lib/api/trucks/radiusLimits';

/**
 * Unified filter state types for the food truck finder application.
 * These types define the structure of all filtering options available in the app.
 */

/**
 * User's geographical location for distance-based filtering
 */
export interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Main filter state interface containing all filter properties
 */
export interface FiltersState {
  /** Filter to show only favorited food trucks */
  favoritesOnly: boolean;

  /** Array of selected cuisine types to filter by */
  cuisines: string[];

  /** Maximum distance in miles from user location */
  radiusMiles: number;

  /** User's current location for distance calculations */
  userLocation?: UserLocation;

  /** Text search query for truck names, descriptions, or specialties */
  searchQuery?: string;

  /** Filter to show only currently open trucks */
  openNow?: boolean;

  /** Price range filter (1-4 where 1=$, 2=$, 3=$, 4=$) */
  priceRange?: number;
}

/**
 * Default filter values to use when no filters are applied
 */
export const DEFAULT_FILTERS: FiltersState = {
  favoritesOnly: false,
  cuisines: [],
  radiusMiles: DEFAULT_SEARCH_RADIUS_MILES,
  userLocation: undefined,
  searchQuery: undefined,
  openNow: false,
  priceRange: undefined,
};

/**
 * Available cuisine types for filtering
 */
export const CUISINE_TYPES = [
  'Mexican',
  'American',
  'Asian',
  'Italian',
  'BBQ',
  'Burgers',
  'Tacos',
  'Pizza',
  'Sandwiches',
  'Desserts',
  'Mediterranean',
  'Thai',
  'Vietnamese',
  'Chinese',
  'Japanese',
  'Korean',
  'Indian',
  'Greek',
  'French',
  'Vegan',
  'Vegetarian',
  'Seafood',
  'Breakfast',
  'Coffee & Tea',
  'Ice Cream',
  'Healthy',
  'Fusion',
] as const;

export type CuisineType = (typeof CUISINE_TYPES)[number];

export const RADIUS_OPTIONS_GUEST = [5, 10, 25, 50] as const;

export const RADIUS_OPTIONS_AUTHENTICATED = [5, 10, 25, 50, 100, 150] as const;

export type RadiusOption =
  | (typeof RADIUS_OPTIONS_GUEST)[number]
  | (typeof RADIUS_OPTIONS_AUTHENTICATED)[number];

/**
 * URL query parameter names for filter synchronization
 */
export const FILTER_QUERY_PARAMS = {
  FAVORITES: 'favorites',
  CUISINES: 'cuisines',
  RADIUS: 'radius',
  LAT: 'lat',
  LNG: 'lng',
  SEARCH: 'q',
  OPEN_NOW: 'openNow',
} as const;

/**
 * Storage keys for localStorage persistence
 */
export const STORAGE_KEYS = {
  FILTERS: 'foodTruck_filters',
  USER_LOCATION: 'foodTruck_userLocation',
} as const;
