import { cleanAddress, extractIntersection } from './addressCleaner';
import { logError } from '@/lib/logging';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const PERIODS_AND_COMMAS = /[.,]/g;
const WHITESPACE_RUNS = /\s+/g;

export interface KnownLocation {
  name: string;
  aliases: string[];
  lat: number;
  lng: number;
  type: 'park' | 'venue' | 'landmark' | 'neighborhood';
  city?: string;
  state?: string;
}

export interface LocationMatch {
  name: string;
  lat: number;
  lng: number;
  source: 'lookup' | 'intersection';
  confidence: number;
}

const DEFAULT_CITY = 'Savannah';
const DEFAULT_STATE = 'GA';

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Savannah,GA': { lat: 32.0809, lng: -81.0912 },
  'Charleston,SC': { lat: 32.7765, lng: -79.9311 },
  'Greenville,SC': { lat: 34.8526, lng: -82.394 },
  'Spartanburg,SC': { lat: 34.9496, lng: -81.9321 },
  'Myrtle Beach,SC': { lat: 33.6891, lng: -78.8867 },
  'Valdosta,GA': { lat: 30.8327, lng: -83.2785 },
  'Macon,GA': { lat: 32.8407, lng: -83.6324 },
  'Columbus,GA': { lat: 32.4608, lng: -84.9877 },
};

const CACHE_TTL_MS = 10 * 60 * 1000;

function getLocationPriority(type: KnownLocation['type'], isFullMatch: boolean): number {
  const base = isFullMatch ? 0 : -5;
  if (type === 'park') return 100 + base;
  if (type === 'venue') return 90 + base;
  return 70 + base;
}

interface LocationCache {
  locations: KnownLocation[];
  fetchedAt: number;
  city: string;
  state: string;
}

let locationCache: LocationCache | null = null;

async function fetchLocationsFromDB(city: string, state: string): Promise<KnownLocation[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('known_locations')
    .select('name, aliases, lat, lng, type, city, state')
    .eq('city', city)
    .eq('state', state);

  if (error) {
    logError('[LocationLookup] Database error:', { error });
    return [];
  }

  return (data ?? []).map((row) => ({
    name: row.name,
    aliases: row.aliases ?? [],
    lat: row.lat,
    lng: row.lng,
    type: row.type as KnownLocation['type'],
    city: row.city,
    state: row.state,
  }));
}

async function getLocations(city: string, state: string): Promise<KnownLocation[]> {
  const now = Date.now();

  if (
    locationCache &&
    locationCache.city === city &&
    locationCache.state === state &&
    now - locationCache.fetchedAt < CACHE_TTL_MS
  ) {
    return locationCache.locations;
  }

  const locations = await fetchLocationsFromDB(city, state);

  locationCache = {
    locations,
    fetchedAt: now,
    city,
    state,
  };

  return locations;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(PERIODS_AND_COMMAS, ' ')
    .replaceAll(WHITESPACE_RUNS, ' ')
    .trim();
}

export interface LocationLookupOptions {
  city: string;
  state: string;
}

export async function findLocation(
  address: string,
  options?: Partial<LocationLookupOptions>,
): Promise<LocationMatch | null> {
  const normalizedInput = normalizeText(address);

  const city = options?.city ?? DEFAULT_CITY;
  const state = options?.state ?? DEFAULT_STATE;
  const locations = await getLocations(city, state);

  const scoredMatches: Array<{ location: KnownLocation; score: number }> = [];

  for (const location of locations) {
    const normalizedName = normalizeText(location.name);
    const isFullNameMatch = normalizedInput.includes(normalizedName);

    if (isFullNameMatch) {
      const priorityMultiplier = getLocationPriority(location.type, true);
      const score = normalizedName.length + priorityMultiplier;
      scoredMatches.push({ location, score });
      continue;
    }

    for (const alias of location.aliases) {
      const normalizedAlias = normalizeText(alias);
      if (normalizedInput.includes(normalizedAlias)) {
        const priorityMultiplier = getLocationPriority(location.type, false);
        const score = normalizedAlias.length + priorityMultiplier;
        scoredMatches.push({ location, score });
        break;
      }
    }
  }

  if (scoredMatches.length > 0) {
    scoredMatches.sort((a, b) => b.score - a.score);
    const best = scoredMatches[0];
    if (best && best.score >= 70) {
      return {
        name: best.location.name,
        lat: best.location.lat,
        lng: best.location.lng,
        source: 'lookup',
        confidence: Math.min(best.score / 100, 0.95),
      };
    }
  }

  const cleaned = cleanAddress(address);
  if (!cleaned) return null;

  const intersection = extractIntersection(cleaned);
  if (intersection) {
    const center = CITY_CENTERS[`${city},${state}`] ?? CITY_CENTERS['Savannah,GA'];
    return {
      name: intersection.split(',')[0] ?? intersection,
      lat: center.lat,
      lng: center.lng,
      source: 'intersection',
      confidence: 0.5,
    };
  }

  return null;
}

export function clearCache(): void {
  locationCache = null;
}
