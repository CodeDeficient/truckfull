import { US_STATE_FALLBACKS } from '@/lib/location/usStateFallbacks';

export interface RequestLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
  source: 'cf-geo' | 'vercel-geo' | 'cf-region';
}

interface GeoHeaderSource {
  readonly source: RequestLocation['source'];
  readonly latitude: string;
  readonly longitude: string;
  readonly city: string;
  readonly country: string;
}

const GEO_SOURCES: readonly GeoHeaderSource[] = [
  {
    source: 'cf-geo',
    latitude: 'cf-ip-latitude',
    longitude: 'cf-ip-longitude',
    city: 'cf-ip-city',
    country: 'cf-ip-country',
  },
  {
    source: 'vercel-geo',
    latitude: 'x-vercel-ip-latitude',
    longitude: 'x-vercel-ip-longitude',
    city: 'x-vercel-ip-city',
    country: 'x-vercel-ip-country',
  },
];

function inRange(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function resolveRegionLocation(requestHeaders: Headers): RequestLocation | null {
  if (requestHeaders.get('cf-ip-country') !== 'US') return null;
  const regionCode = requestHeaders.get('cf-region-code')?.toUpperCase() ?? '';
  const fallback = Object.hasOwn(US_STATE_FALLBACKS, regionCode)
    ? US_STATE_FALLBACKS[regionCode]
    : undefined;
  if (!fallback) return null;
  return {
    lat: fallback.lat,
    lng: fallback.lng,
    city: fallback.city,
    country: 'US',
    source: 'cf-region',
  };
}

export function resolveRequestLocation(requestHeaders: Headers): RequestLocation | null {
  return resolveCoordinateLocation(requestHeaders) ?? resolveRegionLocation(requestHeaders);
}

function resolveCoordinateLocation(requestHeaders: Headers): RequestLocation | null {
  for (const geo of GEO_SOURCES) {
    const rawLat = requestHeaders.get(geo.latitude);
    const rawLng = requestHeaders.get(geo.longitude);
    if (!rawLat || !rawLng) continue;

    const lat = Number.parseFloat(rawLat);
    const lng = Number.parseFloat(rawLng);
    if (Number.isNaN(lat) || Number.isNaN(lng) || !inRange(lat, lng)) continue;

    return {
      lat,
      lng,
      city: requestHeaders.get(geo.city) || 'Unknown',
      country: requestHeaders.get(geo.country) || 'Unknown',
      source: geo.source,
    };
  }

  return null;
}
