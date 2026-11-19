export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 0.621_371;
}

interface Locatable {
  location_data: { lat: number | null; lng: number | null } | null;
}

export function filterByRadius<T extends Locatable>(
  events: T[],
  originLat: number,
  originLng: number,
  radiusMiles: number,
): T[] {
  if (radiusMiles <= 0) return events;

  return events.filter((event) => {
    const lat = event.location_data?.lat;
    const lng = event.location_data?.lng;
    if (lat == null || lng == null) return false;
    return haversineMiles(originLat, originLng, lat, lng) <= radiusMiles;
  });
}

export function formatRadius(miles: number): string {
  if (miles >= 1000)
    return `${(miles / 1000).toFixed(miles % 1000 === 0 ? 0 : 1)}k mi`;
  return `${miles} mi`;
}
