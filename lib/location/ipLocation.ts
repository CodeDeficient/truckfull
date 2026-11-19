interface IpLocationResponse {
  lat: number;
  lng: number;
  city?: string;
  source: string;
}

export interface IpLocation {
  readonly lat: number;
  readonly lng: number;
  readonly city: string | null;
}

function toCity(city: unknown): string | null {
  if (typeof city !== 'string') return null;
  const trimmed = city.trim();
  return trimmed === '' || trimmed === 'Unknown' ? null : trimmed;
}

export async function getIpLocation(): Promise<IpLocation | null> {
  try {
    const response = await fetch('/api/geo/ip-location');
    if (!response.ok) return null;
    const data: IpLocationResponse = await response.json();
    if (Number.isFinite(data?.lat) && Number.isFinite(data?.lng)) {
      return { lat: data.lat, lng: data.lng, city: toCity(data.city) };
    }
    return null;
  } catch {
    return null;
  }
}
