import { logError, logWarning } from '@/lib/logging';
import { z } from 'zod';

/**
 * LocationIQ fallback geocoding service
 *
 * Primary geocoder is public Photon (photon.komoot.io).
 * This is a fallback when Photon fails or rate limits are hit.
 *
 * Note: LocationIQ has rate limits — use with care.
 *
 * SECURITY NOTE: LocationIQ API requires key in URL params (not header-based auth).
 * Server logs should redact 'key=' parameters. Ensure log rotation excludes full URLs.
 */

const LocationIQResultSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string(),
  place_id: z.coerce.number(),
  importance: z.coerce.number(),
  class: z.string().optional(),
  type: z.string().optional(),
});

const LocationIQResponseSchema = z.array(LocationIQResultSchema);

const LOCATIONIQ_API_URL = 'https://us1.locationiq.com/v1/search.php';
const MAX_ADDRESS_LENGTH = 500;
const FETCH_TIMEOUT_MS = 8000;

function getApiKey(): string | undefined {
  return process.env.LOCATIONIQ_API_KEY;
}

export function sanitizeAddress(address: string): string | null {
  if (!address || typeof address !== 'string') {
    return null;
  }
  const trimmed = address.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_ADDRESS_LENGTH) {
    return null;
  }
  return trimmed;
}

export async function geocodeWithLocationIQ(
  address: string,
): Promise<{ lat: number; lng: number; formatted_address: string; success: boolean }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logWarning('LocationIQ API key not configured');
    return {
      lat: Number.NaN,
      lng: Number.NaN,
      formatted_address: '',
      success: false,
    };
  }

  const sanitizedAddress = sanitizeAddress(address);
  if (!sanitizedAddress) {
    logWarning('Invalid address provided to LocationIQ');
    return {
      lat: Number.NaN,
      lng: Number.NaN,
      formatted_address: '',
      success: false,
    };
  }

  try {
    const url = new URL(LOCATIONIQ_API_URL);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', sanitizedAddress);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'us');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      logError('LocationIQ API error', { status: response.status });
      return {
        lat: Number.NaN,
        lng: Number.NaN,
        formatted_address: '',
        success: false,
      };
    }

    const data = LocationIQResponseSchema.parse(await response.json());

    if (!data || data.length === 0) {
      logWarning('LocationIQ returned no results');
      return {
        lat: Number.NaN,
        lng: Number.NaN,
        formatted_address: '',
        success: false,
      };
    }

    const firstResult = data[0];
    const lat = Number.parseFloat(firstResult.lat);
    const lng = Number.parseFloat(firstResult.lon);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      logWarning('LocationIQ returned invalid coordinates');
      return {
        lat: Number.NaN,
        lng: Number.NaN,
        formatted_address: '',
        success: false,
      };
    }

    return {
      lat,
      lng,
      formatted_address: firstResult.display_name || sanitizedAddress,
      success: true,
    };
  } catch (error) {
    logError('LocationIQ geocoding error', { error });
    return {
      lat: Number.NaN,
      lng: Number.NaN,
      formatted_address: '',
      success: false,
    };
  }
}

export function isLocationIQAvailable(): boolean {
  return Boolean(getApiKey());
}
