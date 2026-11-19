import type { FoodTruckCurrentLocation } from '@/lib/types';

export interface ActiveLocationTruck {
  readonly current_location?: FoodTruckCurrentLocation | null;
  readonly current_day_location?: FoodTruckCurrentLocation | null;
  readonly default_lat?: number | null;
  readonly default_lng?: number | null;
}

export type ActiveLocation = FoodTruckCurrentLocation;

export function hasValidCoordinates(
  location: ActiveLocation | null | undefined,
): location is ActiveLocation & { lat: number; lng: number } {
  if (!location) return false;
  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') return false;
  return (
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng) &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    location.lng >= -180 &&
    location.lng <= 180
  );
}

/**
 * The location that governs the truck "now": a dated override's position on
 * its service date (coords required — words-only events never move anything),
 * otherwise the truck's base location. Pure and date-driven; consumers just
 * read it.
 */
export function resolveActiveLocation(
  truck: ActiveLocationTruck,
): ActiveLocation | null {
  const override = truck.current_day_location;
  if (hasValidCoordinates(override)) return override;
  if (hasValidCoordinates(truck.current_location)) return truck.current_location;
  const fallback = {
    lat: truck.default_lat ?? undefined,
    lng: truck.default_lng ?? undefined,
  };
  return hasValidCoordinates(fallback) ? fallback : null;
}
