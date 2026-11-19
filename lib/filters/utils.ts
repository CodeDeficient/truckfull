import type { FiltersState, UserLocation } from './types.ts';
import { calculateDistance as calculateDistanceMiles } from '@/lib/utils/geoUtils';
import { DEFAULT_FILTERS } from './types.ts';

/**
 * Parse boolean from URL parameter
 */
export function parseBooleanParam(value: string | null): boolean | undefined {
  if (value == undefined) return undefined;
  return value === '1' || value === 'true';
}

/**
 * Parse number from URL parameter
 */
export function parseNumberParam(value: string | null): number | undefined {
  if (value == undefined) return undefined;
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? undefined : num;
}

/**
 * Parse array from comma-separated URL parameter
 */
export function parseArrayParam(value: string | null): string[] {
  if (value == undefined || value === '') return [];
  return value.split(',').filter(Boolean);
}

/**
 * Parse user location from lat/lng parameters
 */
export function parseLocationParams(
  lat: string | null,
  lng: string | null,
): UserLocation | undefined {
  if (lat == undefined || lat === '' || lng == undefined || lng === '') return undefined;

  const latNum = parseNumberParam(lat);
  const lngNum = parseNumberParam(lng);

  if (latNum == undefined || lngNum == undefined) return undefined;

  // Validate latitude and longitude ranges
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return undefined;
  }

  return { lat: latNum, lng: lngNum };
}

/**
 * Serialize array to comma-separated string
 */
export function serializeArrayParam(values: string[]): string {
  return values.filter(Boolean).join(',');
}

/**
 * Check if filters have any non-default values
 */
export function hasActiveFilters(filters: FiltersState): boolean {
  return (
    filters.favoritesOnly !== DEFAULT_FILTERS.favoritesOnly ||
    filters.cuisines.length > 0 ||
    filters.radiusMiles !== DEFAULT_FILTERS.radiusMiles ||
    filters.userLocation != undefined ||
    filters.searchQuery != undefined ||
    filters.openNow !== DEFAULT_FILTERS.openNow
  );
}

/**
 * Count number of active filters
 */
export function countActiveFilters(filters: FiltersState): number {
  let count = 0;

  if (filters.favoritesOnly === true) count++;
  if (filters.cuisines.length > 0) count++;
  if (filters.radiusMiles !== DEFAULT_FILTERS.radiusMiles) count++;
  // Don't count userLocation as an active filter - it's a search parameter, not a filter
  if (typeof filters.searchQuery === 'string' && filters.searchQuery.length > 0) count++;
  if (filters.openNow === true) count++;
  if (filters.priceRange !== undefined) count++;

  return count;
}

/**
 * Get human-readable filter summary
 */
export function getFilterSummary(filters: FiltersState): string[] {
  const summary: string[] = [];

  if (filters.favoritesOnly === true) {
    summary.push('Favorites only');
  }

  if (filters.cuisines.length > 0) {
    if (filters.cuisines.length === 1) {
      summary.push(`${filters.cuisines[0]} cuisine`);
    } else {
      summary.push(`${filters.cuisines.length} cuisines`);
    }
  }

  if (filters.radiusMiles !== DEFAULT_FILTERS.radiusMiles) {
    summary.push(`Within ${filters.radiusMiles} miles`);
  }

  if (typeof filters.searchQuery === 'string' && filters.searchQuery.length > 0) {
    summary.push(`"${filters.searchQuery}"`);
  }

  if (filters.openNow === true) {
    summary.push('Open now');
  }

  return summary;
}

/**
 * Merge partial filters with defaults
 */
export function mergeWithDefaults(partial: Partial<FiltersState>): FiltersState {
  return {
    ...DEFAULT_FILTERS,
    ...partial,
  };
}

/**
 * Validate and sanitize filters
 */
export function sanitizeFilters(filters: Partial<FiltersState>): Partial<FiltersState> {
  const sanitized: Partial<FiltersState> = {};

  // Validate boolean fields
  if (filters.favoritesOnly != undefined) {
    sanitized.favoritesOnly = Boolean(filters.favoritesOnly);
  }

  if (filters.openNow != undefined) {
    sanitized.openNow = Boolean(filters.openNow);
  }

  // Validate cuisines array
  if (filters.cuisines != undefined) {
    sanitized.cuisines = Array.isArray(filters.cuisines)
      ? filters.cuisines.filter((c): c is string => typeof c === 'string')
      : [];
  }

  // Validate radius (must be positive)
  if (filters.radiusMiles != undefined) {
    const radius = Number(filters.radiusMiles);
    if (!Number.isNaN(radius) && radius > 0 && radius <= 100) {
      sanitized.radiusMiles = radius;
    }
  }

  // Validate location
  if (filters.userLocation != undefined) {
    const loc = filters.userLocation;
    if (
      loc != undefined &&
      typeof loc.lat === 'number' &&
      typeof loc.lng === 'number' &&
      loc.lat >= -90 &&
      loc.lat <= 90 &&
      loc.lng >= -180 &&
      loc.lng <= 180
    ) {
      sanitized.userLocation = loc;
    }
  }

  // Validate search query
  if (filters.searchQuery != undefined) {
    const query = String(filters.searchQuery).trim();
    sanitized.searchQuery = query.length > 0 ? query.slice(0, 100) : undefined;
  }

  return sanitized;
}

/**
 * Calculate distance between two coordinates in miles
 */
export function calculateDistance(loc1: UserLocation, loc2: UserLocation): number {
  return calculateDistanceMiles(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
}
