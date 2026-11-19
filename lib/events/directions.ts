const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface DirectionsResult {
  distance: number;
  duration: number;
}

export async function getDrivingDistance(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<DirectionsResult | null> {
  if (!MAPBOX_TOKEN) return null;

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=simplified&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url, { next: { revalidate: 86_400 } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) return null;
    const route = data.routes[0];
    return {
      distance: route.distance,
      duration: route.duration,
    };
  } catch {
    return null;
  }
}

export function formatDrivingDistance(meters: number): string {
  const miles = meters * 0.000_621_371;
  if (miles < 0.1) return `~${Math.round(miles * 5280)} ft`;
  if (miles < 10) return `~${miles.toFixed(1)} mi`;
  return `~${Math.round(miles)} mi`;
}

export function formatDrivingDuration(seconds: number): string {
  if (seconds < 60) return '<1 min';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
