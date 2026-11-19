import { haversineMiles } from '@/lib/events/radiusFilter';
import { resolveActiveLocation, type ActiveLocationTruck } from '@/lib/services/activeLocation';

export const NEARBY_CELL_DEGREES = 0.1;
export const NEARBY_CELL_PADDING_MILES = 5;
const METERS_PER_MILE = 1609.344;

export interface NearbyOrigin {
  readonly lat: number;
  readonly lng: number;
}

type NearbyRow = Readonly<Record<string, unknown>>;

function snap(value: number): number {
  return Number((Math.round(value / NEARBY_CELL_DEGREES) * NEARBY_CELL_DEGREES).toFixed(1));
}

export function nearbyCell(lat: number, lng: number): NearbyOrigin {
  return { lat: snap(lat), lng: snap(lng) };
}

export function paddedCellRadiusMiles(radiusMiles: number): number {
  return Math.ceil(radiusMiles) + NEARBY_CELL_PADDING_MILES;
}

function milesFromOrigin(row: NearbyRow, origin: NearbyOrigin, radiusMiles: number): number | null {
  const location = resolveActiveLocation(row as ActiveLocationTruck);
  if (location?.lat !== undefined && location.lng !== undefined) {
    return haversineMiles(origin.lat, origin.lng, location.lat, location.lng);
  }
  const cellMiles = row.distance_miles;
  if (typeof cellMiles !== 'number' || !Number.isFinite(cellMiles)) return null;
  return cellMiles + NEARBY_CELL_PADDING_MILES <= radiusMiles ? cellMiles : null;
}

export function narrowToRadius<T extends NearbyRow>(
  rows: readonly T[],
  origin: NearbyOrigin,
  radiusMiles: number,
): T[] {
  const kept: { row: T; miles: number }[] = [];
  for (const row of rows) {
    const miles = milesFromOrigin(row, origin, radiusMiles);
    if (miles !== null && miles <= radiusMiles) kept.push({ row, miles });
  }
  kept.sort((a, b) => a.miles - b.miles || String(a.row.id).localeCompare(String(b.row.id), 'en'));
  return kept.map(({ row, miles }) => ({
    ...row,
    distance_miles: miles,
    distance_meters: miles * METERS_PER_MILE,
  }));
}
