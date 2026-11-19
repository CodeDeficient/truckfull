import { logError, logWarning } from '@/lib/logging';
import { z } from 'zod';

const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';

const STATE_ABBREVS: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};
const MAX_ADDRESS_LENGTH = 500;
const FETCH_TIMEOUT_MS = 10_000;

const NominatimResultSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string(),
  place_id: z.coerce.number(),
  osm_type: z.string().optional(),
  osm_id: z.coerce.number().optional(),
  type: z.string().optional(),
  importance: z.number().optional(),
  address: z
    .object({
      house_number: z.string().optional(),
      road: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      country: z.string().optional(),
      country_code: z.string().optional(),
    })
    .optional(),
});

const NominatimResponseSchema = z.array(NominatimResultSchema);

export async function geocodeWithNominatim(
  address: string,
): Promise<{ lat: number; lng: number; formatted_address: string; success: boolean; state?: string }> {
  if (!address || typeof address !== 'string') {
    return { lat: Number.NaN, lng: Number.NaN, formatted_address: '', success: false };
  }

  const trimmed = address.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_ADDRESS_LENGTH) {
    logWarning('Nominatim: address too long', { length: trimmed.length });
    return { lat: Number.NaN, lng: Number.NaN, formatted_address: '', success: false };
  }

  try {
    const url = new URL(NOMINATIM_API_URL);
    url.searchParams.set('q', trimmed);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'us');
    url.searchParams.set('accept-language', 'en');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'TruckFull/1.0 (https://truckfull.food)',
      },
    });

    if (!response.ok) {
      logError('Nominatim API error', { status: response.status });
      return { lat: Number.NaN, lng: Number.NaN, formatted_address: '', success: false };
    }

    const data = NominatimResponseSchema.parse(await response.json());

    if (!data || data.length === 0) {
      return { lat: Number.NaN, lng: Number.NaN, formatted_address: trimmed, success: false };
    }

    const firstResult = data[0];
    const lat = Number.parseFloat(firstResult.lat);
    const lng = Number.parseFloat(firstResult.lon);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      logWarning('Nominatim returned invalid coordinates');
      return { lat: Number.NaN, lng: Number.NaN, formatted_address: '', success: false };
    }

    const rawState = firstResult.address?.state?.toLowerCase().trim();
    const state = rawState ? (STATE_ABBREVS[rawState] ?? rawState.toUpperCase()) : undefined;

    return {
      lat,
      lng,
      formatted_address: firstResult.display_name || trimmed,
      success: true,
      state,
    };
  } catch (error) {
    logError('Nominatim geocoding error', { error });
    return { lat: Number.NaN, lng: Number.NaN, formatted_address: '', success: false };
  }
}
