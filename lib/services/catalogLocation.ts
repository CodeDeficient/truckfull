export interface CatalogLocation {
  readonly lat: number;
  readonly lng: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function toCatalogLocation(value: unknown): CatalogLocation | null {
  if (typeof value !== 'object' || value === null) return null;
  const { lat, lng } = value as Record<string, unknown>;
  return isFiniteNumber(lat) && isFiniteNumber(lng) ? { lat, lng } : null;
}
