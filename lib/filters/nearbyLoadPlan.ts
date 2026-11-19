import { haversineMiles } from '@/lib/events/radiusFilter';

export const INITIAL_RADIUS_MILES = 25;

export interface NearbySeed {
  readonly lat: number;
  readonly lng: number;
  readonly radiusMiles: number;
  readonly trucks: readonly Readonly<Record<string, unknown>>[];
}

export function seedCoversSearch(
  seed: NearbySeed | undefined,
  origin: { readonly lat: number; readonly lng: number },
  radiusMiles: number,
): seed is NearbySeed {
  if (!seed || seed.trucks.length === 0) return false;
  if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) return false;
  const offset = haversineMiles(seed.lat, seed.lng, origin.lat, origin.lng);
  return offset + radiusMiles <= seed.radiusMiles;
}

export function resolveInitialRadiusMiles(selectedRadiusMiles: number): number {
  if (!Number.isFinite(selectedRadiusMiles) || selectedRadiusMiles <= 0) {
    return INITIAL_RADIUS_MILES;
  }
  return Math.min(selectedRadiusMiles, INITIAL_RADIUS_MILES);
}

export function needsBackgroundRadiusLoad(selectedRadiusMiles: number): boolean {
  return resolveInitialRadiusMiles(selectedRadiusMiles) < selectedRadiusMiles;
}

export function resolveMobileDefaultRadiusMiles(
  hasLinkedTruck: boolean,
  maxRadiusMiles: number,
): number {
  return hasLinkedTruck ? maxRadiusMiles : INITIAL_RADIUS_MILES;
}
