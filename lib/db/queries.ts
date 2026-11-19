import { logWarning } from '@/lib/logging';
/**
 * Database query constants and functions for the food truck finder application.
 * This file contains SQL query constants and functions that can be used across the application.
 */

/**
 * Fallback Haversine query for distance calculations when PostGIS is unavailable.
 * This query uses the Haversine formula to calculate distances between geographic coordinates.
 * The Earth's radius is specified in miles (3959) for direct mile-based results.
 */
export const FALLBACK_HAVERSINE_QUERY = `
  SELECT 
    *,
    (3959 * acos(
      cos(radians($1)) * 
      cos(radians(CAST(current_location->>'lat' AS double precision))) * 
      cos(radians(CAST(current_location->>'lng' AS double precision)) - radians($2)) + 
      sin(radians($1)) * 
      sin(radians(CAST(current_location->>'lat' AS double precision)))
    )) AS distance_miles
  FROM food_trucks 
  WHERE is_active = true 
    AND current_location IS NOT NULL 
    AND current_location->>'lat' IS NOT NULL 
    AND current_location->>'lng' IS NOT NULL
    AND (3959 * acos(
      cos(radians($1)) * 
      cos(radians(CAST(current_location->>'lat' AS double precision))) * 
      cos(radians(CAST(current_location->>'lng' AS double precision)) - radians($2)) + 
      sin(radians($1)) * 
      sin(radians(CAST(current_location->>'lat' AS double precision)))
    )) <= $3
  ORDER BY distance_miles ASC
`;

/**
 * Function that implements the fallback Haversine query
 * @param _lat Latitude of the user's location
 * @param _lng Longitude of the user's location
 * @param _radiusMiles Maximum distance in miles
 * @returns null (placeholder implementation)
 */
export function getTrucksByLocationWithFallback(_lat: number, _lng: number, _radiusMiles: number) {
  // This function would typically execute the above SQL query
  // using raw SQL execution if PostGIS is not available
  logWarning(
    'Using fallback Haversine query. This should be implemented based on your DB access pattern.',
  );
  return null;
}
