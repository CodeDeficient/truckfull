import type { OverrideLocation } from '@/lib/services/scheduleOverride';

export interface OverrideGeocodeResult {
  readonly lat: number;
  readonly lng: number;
  readonly success: boolean;
}

export type OverrideGeocoder = (address: string) => Promise<OverrideGeocodeResult>;

export type GeocodableLocation = OverrideLocation & {
  lat?: number;
  lng?: number;
};

export function isGeocodableLocation(
  location: OverrideLocation | null | undefined,
): location is OverrideLocation & { address: string } {
  if (!location) return false;
  if (location.fuzzy === true) return false;
  if ('lat' in location && 'lng' in location) return false;
  return Boolean(location.address?.trim());
}

export function mergeCoordinatesIntoLocation(
  location: OverrideLocation,
  lat: number,
  lng: number,
): OverrideLocation & { lat?: number; lng?: number } {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return location;
  return { ...location, lat, lng };
}

export async function enrichOverrideLocation(
  location: OverrideLocation | null | undefined,
  geocoder: OverrideGeocoder,
): Promise<(OverrideLocation & { lat?: number; lng?: number }) | null> {
  if (!location || !isGeocodableLocation(location)) return location ?? null;
  try {
    const query = [location.address.trim(), location.city?.trim(), location.state?.trim()]
      .filter(Boolean)
      .join(', ');
    if (!query) return location;
    const result = await geocoder(query);
    if (!result.success) return location;
    return mergeCoordinatesIntoLocation(location, result.lat, result.lng);
  } catch {
    return location;
  }
}
