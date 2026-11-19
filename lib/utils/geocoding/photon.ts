import { logError, logWarning } from '@/lib/logging';
import { stateFromPhotonState } from './stateConstants';
import { z } from 'zod';

const PHOTON_API_URL = 'https://photon.komoot.io/api';
const DEFAULT_LIMIT = 5;
const MAX_ADDRESS_LENGTH = 500;
const FETCH_TIMEOUT_MS = 8000;

const HOUSE_TYPES = new Set(['house', 'building']);
const STREET_TYPES = new Set(['street', 'residential', 'tertiary', 'secondary', 'primary']);

const PhotonFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  properties: z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    osm_type: z.string().optional(),
    osm_key: z.string().optional(),
    osm_value: z.string().optional(),
    countrycode: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    street: z.string().optional(),
    housenumber: z.string().optional(),
    postcode: z.string().optional(),
    district: z.string().optional(),
    county: z.string().optional(),
  }),
});

export const PhotonResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(PhotonFeatureSchema),
});

export type PhotonFeature = z.infer<typeof PhotonFeatureSchema>;

export function selectBestFeature(features: PhotonFeature[]): PhotonFeature | null {
  if (features.length === 0) return null;

  const houseMatch = features.find((f) => {
    const t = f.properties.type ?? '';
    return HOUSE_TYPES.has(t);
  });
  if (houseMatch) return houseMatch;

  const streetMatch = features.find((f) => {
    const t = f.properties.type ?? '';
    const v = f.properties.osm_value ?? '';
    return STREET_TYPES.has(t) || STREET_TYPES.has(v);
  });
  if (streetMatch) return streetMatch;

  const nonCityMatch = features.find((f) => {
    const t = f.properties.type ?? '';
    return t !== 'city' && t !== 'state' && t !== 'country';
  });
  if (nonCityMatch) return nonCityMatch;

  return features[0] ?? null;
}

export async function geocodeWithPhoton(
  address: string,
  bias?: { lat: number; lng: number },
): Promise<{ lat: number; lng: number; formatted_address: string; success: boolean; state?: string }> {
  if (!address || !address.trim()) {
    return { lat: Number.NaN, lng: Number.NaN, formatted_address: '', success: false };
  }

  const trimmed = address.trim();
  if (trimmed.length > MAX_ADDRESS_LENGTH) {
    logWarning('Photon: address too long', { length: trimmed.length });
    return { lat: Number.NaN, lng: Number.NaN, formatted_address: '', success: false };
  }

  try {
    const url = new URL(PHOTON_API_URL);
    url.searchParams.set('q', trimmed);
    url.searchParams.set('limit', String(DEFAULT_LIMIT));
    url.searchParams.set('lang', 'en');
    if (bias) {
      url.searchParams.set('lat', String(bias.lat));
      url.searchParams.set('lon', String(bias.lng));
    }

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

    if (!response.ok) {
      logWarning('Photon API error', { status: response.status });
      return { lat: Number.NaN, lng: Number.NaN, formatted_address: '', success: false };
    }

    const data = PhotonResponseSchema.parse(await response.json());

    if (!data.features || data.features.length === 0) {
      return { lat: Number.NaN, lng: Number.NaN, formatted_address: trimmed, success: false };
    }

    const best = selectBestFeature(data.features);
    if (!best) {
      return { lat: Number.NaN, lng: Number.NaN, formatted_address: trimmed, success: false };
    }

    const [lng, lat] = best.geometry.coordinates;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      logWarning('Photon returned invalid coordinates');
      return { lat: Number.NaN, lng: Number.NaN, formatted_address: '', success: false };
    }

    const name = best.properties.name ?? best.properties.street ?? trimmed;

    return {
      lat,
      lng,
      formatted_address: name,
      success: true,
      state: stateFromPhotonState(best.properties.state),
    };
  } catch (error) {
    logError('Photon geocoding error', { error });
    return { lat: Number.NaN, lng: Number.NaN, formatted_address: '', success: false };
  }
}
