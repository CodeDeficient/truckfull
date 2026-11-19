const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return Number.NaN;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return 'N/A';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

export type AccuracyTier = 'excellent' | 'good' | 'acceptable' | 'poor' | 'miss';

export function classifyAccuracy(meters: number): AccuracyTier {
  if (!Number.isFinite(meters)) return 'miss';
  if (meters < 50) return 'excellent';
  if (meters < 100) return 'good';
  if (meters < 500) return 'acceptable';
  return 'poor';
}
