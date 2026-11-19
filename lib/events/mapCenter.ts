export interface MapCenter {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface RadiusOrigin {
  lat: number;
  lng: number;
  isFallback: boolean;
}

export const AUGUSTA_CENTER: MapCenter = {
  longitude: -81.9748,
  latitude: 33.4735,
  zoom: 7,
};

export const AUGUSTA_RADIUS_ORIGIN: RadiusOrigin = {
  lat: 33.4735,
  lng: -81.9748,
  isFallback: true,
};

export function resolveMapCenter(
  gps: { lat: number; lng: number } | null,
  ip: { lat: number; lng: number } | null,
): MapCenter {
  if (gps) return { longitude: gps.lng, latitude: gps.lat, zoom: 9 };
  if (ip) return { longitude: ip.lng, latitude: ip.lat, zoom: 9 };
  return { ...AUGUSTA_CENTER };
}

export function resolveRadiusOrigin(
  gps: { lat: number; lng: number } | null,
  ip: { lat: number; lng: number } | null,
): RadiusOrigin {
  if (gps) return { lat: gps.lat, lng: gps.lng, isFallback: false };
  if (ip) return { lat: ip.lat, lng: ip.lng, isFallback: false };
  return { ...AUGUSTA_RADIUS_ORIGIN };
}