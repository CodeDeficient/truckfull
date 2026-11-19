import { logError, logWarning, logMessage } from '@/lib/logging';
import { expandStreetAbbreviations } from './addressCleaner';
import { geocodeWithLocationIQ, isLocationIQAvailable } from './geocoding/locationIq';
import { geocodeWithPhoton, selectBestFeature, PhotonResponseSchema } from './geocoding/photon';
import {
  STATE_NAME_TO_ABBREV,
  STATE_ABBREVIATIONS,
  STATE_BOUNDS,
  stateFromPhotonState,
} from './geocoding/stateConstants';

const STATE_CODES = /\b([A-Z]{2})\b/g;
// eslint-disable-next-line sonarjs/slow-regex -- deterministic zip-code strip, no backtracking risk
const TRAILING_ZIP = /\s+\d{5}(?:-\d{4})?\s*$/;
const WHITESPACE = /\s+/;

const getSelfHostedPhotonUrl = (): string | undefined => process.env.PHOTON_URL;
const SELF_HOSTED_FETCH_TIMEOUT_MS = 5000;

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address: string;
  success: boolean;
  type?: string;
  state?: string;
}

const US_BOUNDS = { minLat: 24, maxLat: 50, minLng: -126, maxLng: -65 };

export function parseStateFromAddress(address: string): string | null {
  const upperAddress = address.toUpperCase();
  const commaParts = upperAddress.split(',');
  const lastPart = commaParts.at(-1)?.trim() ?? '';

  const matches = lastPart.match(STATE_CODES);
  if (matches) {
    for (let i = matches.length - 1; i >= 0; i--) {
      if (STATE_ABBREVIATIONS.has(matches[i])) {
        return matches[i];
      }
    }
  }

  const zipStrippedLower = lastPart.toLowerCase().replace(TRAILING_ZIP, '').trim();
  const fullMatch = STATE_NAME_TO_ABBREV[zipStrippedLower];
  if (fullMatch) return fullMatch;

  const words = lastPart.split(WHITESPACE);
  for (let i = words.length - 1; i >= 0; i--) {
    const abbrev = STATE_NAME_TO_ABBREV[words[i]?.toLowerCase() ?? ''];
    if (abbrev) return abbrev;
  }
  return null;
}

function extractStateFromDisplayName(displayName: string): string | undefined {
  const parts = displayName.split(',').map((s) => s.trim());
  for (const part of parts) {
    const abbrev = STATE_NAME_TO_ABBREV[part.toLowerCase()];
    if (abbrev) return abbrev;
    if (STATE_ABBREVIATIONS.has(part.toUpperCase())) return part.toUpperCase();
  }
  return undefined;
}

function getStateFromResult(result: { state?: string; formatted_address: string }): string | undefined {
  if (result.state) return result.state;
  return extractStateFromDisplayName(result.formatted_address);
}

function resultStateMatches(
  result: { state?: string; formatted_address: string },
  parsedState: string | null,
): boolean {
  if (!parsedState) return true;
  const resultState = getStateFromResult(result);
  if (!resultState) return false;
  return resultState === parsedState;
}

export function validateStateBounds(
  lat: number,
  lng: number,
  state?: string | null,
): boolean {
  if (!state || !STATE_BOUNDS[state]) return true;
  const bounds = STATE_BOUNDS[state];
  return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
}

function isWithinUS(lat: number, lng: number): boolean {
  return (
    lat >= US_BOUNDS.minLat &&
    lat <= US_BOUNDS.maxLat &&
    lng >= US_BOUNDS.minLng &&
    lng <= US_BOUNDS.maxLng
  );
}

function validateUsBounds(result: GeocodeResult): GeocodeResult {
  if (!result.success) return result;
  if (!isWithinUS(result.lat, result.lng)) {
    logWarning('Geocode result outside US bounds, rejecting', {
      lat: result.lat,
      lng: result.lng,
      address: result.formatted_address,
    });
    return {
      lat: Number.NaN,
      lng: Number.NaN,
      formatted_address: result.formatted_address,
      success: false,
    };
  }
  return result;
}

async function geocodeWithRetry(address: string): Promise<GeocodeResult> {
  if (!address || !address.trim()) {
    return {
      lat: Number.NaN,
      lng: Number.NaN,
      formatted_address: '',
      success: false,
    };
  }

  const expanded = expandStreetAbbreviations(address);

  try {
    const parsedState = parseStateFromAddress(expanded);
    const selfHostedUrl = getSelfHostedPhotonUrl();

    if (selfHostedUrl) {
      logMessage('Trying self-hosted Photon', { url: selfHostedUrl });
      try {
        const result = await geocodeWithSelfHostedPhoton(expanded, selfHostedUrl);
        if (result.success && resultStateMatches(result, parsedState)) {
          return validateUsBounds(result);
        }
        if (result.success) {
          logWarning('Self-hosted Photon result state does not match, rejecting', {
            resultState: getStateFromResult(result),
            parsedState,
          });
        }
        logWarning('Self-hosted Photon returned no matching results, trying public Photon');
      } catch (error) {
        logWarning('Self-hosted Photon unavailable, trying public Photon', { error });
      }
    }

    logMessage('Trying public Photon');
    const photonResult = await geocodeWithPhoton(expanded);
    if (photonResult.success && resultStateMatches(photonResult, parsedState)) {
      return validateUsBounds(photonResult);
    }
    if (photonResult.success) {
      logWarning('Public Photon result state does not match, rejecting', {
        resultState: getStateFromResult(photonResult),
        parsedState,
      });
    }

    if (isLocationIQAvailable()) {
      logMessage('Trying LocationIQ (fallback geocoder)');
      const fallbackResult = await geocodeWithLocationIQ(expanded);
      if (fallbackResult.success && resultStateMatches(fallbackResult, parsedState)) {
        return validateUsBounds(fallbackResult);
      }
      if (fallbackResult.success) {
        logWarning('LocationIQ result state does not match, rejecting', {
          resultState: getStateFromResult(fallbackResult),
          parsedState,
        });
      }
    }

    if (parsedState) {
      logWarning('All geocoders returned results outside requested state', { state: parsedState });
    }

    return {
      lat: Number.NaN,
      lng: Number.NaN,
      formatted_address: expanded,
      success: false,
    };
  } catch (error) {
    logError(`Geocoding failed for address: ${expanded}`, error);
    return {
      lat: Number.NaN,
      lng: Number.NaN,
      formatted_address: expanded,
      success: false,
    };
  }
}

async function geocodeWithSelfHostedPhoton(
  address: string,
  baseUrl: string,
  bias?: { lat: number; lng: number },
): Promise<GeocodeResult> {
  const trimmed = address.trim();
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const url = new URL(`${base}/api`);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('limit', '5');
  url.searchParams.set('lang', 'en');
  if (bias) {
    url.searchParams.set('lat', String(bias.lat));
    url.searchParams.set('lon', String(bias.lng));
  }

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(SELF_HOSTED_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Self-hosted Photon API error: ${response.status}`);
  }

  const data = PhotonResponseSchema.parse(await response.json());

  if (!data.features || data.features.length === 0) {
    return {
      lat: Number.NaN,
      lng: Number.NaN,
      formatted_address: trimmed,
      success: false,
    };
  }

  const best = selectBestFeature(
    data.features.map((f) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: f.geometry.coordinates },
      properties: {
        name: f.properties.name,
        type: f.properties.type,
        osm_value: f.properties.osm_value,
        state: f.properties.state,
        city: f.properties.city,
        street: f.properties.street,
      },
    })),
  );
  if (!best) {
    return {
      lat: Number.NaN,
      lng: Number.NaN,
      formatted_address: trimmed,
      success: false,
    };
  }

  const [lng, lat] = best.geometry.coordinates;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      lat: Number.NaN,
      lng: Number.NaN,
      formatted_address: trimmed,
      success: false,
    };
  }

  const name = best.properties.name ?? best.properties.street ?? trimmed;

  return {
    lat,
    lng,
    formatted_address: name,
    success: true,
    type: best.properties.type,
    state: stateFromPhotonState(best.properties.state),
  };
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult> {
  return await geocodeWithRetry(address);
}

export async function geocodeAddressesBatch(
  addresses: string[],
  delayMs: number = 1000,
): Promise<GeocodeResult[]> {
  const results: GeocodeResult[] = [];

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    const result = await geocodeAddress(address);
    results.push(result);

    if (i < addresses.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

export const REGION_FALLBACK = {
  lat: 33.4728,
  lng: -82.0105,
};