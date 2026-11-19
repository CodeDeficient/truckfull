import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getSupabasePublicReader } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import { getUpcomingEventFilters } from '@/lib/events/seoEventFilters';
import { haversineMiles } from '@/lib/events/radiusFilter';
import { SEO_NEARBY_CITY_RADIUS_MILES } from '@/lib/seo/seoConstants';
import { slugifyCity } from '@/lib/utils/slugify';
import {
  EVENT_NEARBY_CITIES_CACHE_TAG,
  EVENT_SECONDARY_REVALIDATE_SECONDS,
  eventNearbyCitiesCacheTag,
} from '@/lib/events/eventCacheIdentity';

const MILES_PER_LATITUDE_DEGREE = 69;
const MILES_PER_LONGITUDE_DEGREE_AT_EQUATOR = 69.172;
const CANONICAL_EVENT_PAGE_SIZE = 1000;

export interface NearbyEventRow {
  readonly city: string | null;
  readonly state: string | null;
  readonly location_lat: number | null;
  readonly location_lng: number | null;
}

export interface NearbyCity {
  readonly city: string;
  readonly state: string;
  readonly slug: string;
  readonly minimumDistance: number;
}

interface LongitudeBounds {
  readonly min: number;
  readonly max: number;
  readonly wrapsAntimeridian: boolean;
}

export interface NearbyBoundingBox {
  readonly minLat: number;
  readonly maxLat: number;
  readonly longitude: LongitudeBounds | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeLongitude(value: number): number {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

export function buildNearbyBoundingBox(
  originLat: number,
  originLng: number,
  radiusMiles: number,
): NearbyBoundingBox {
  const latitude = clamp(originLat, -90, 90);
  const longitude = normalizeLongitude(originLng);
  const latitudeDelta = radiusMiles / MILES_PER_LATITUDE_DEGREE;
  const minLat = clamp(latitude - latitudeDelta, -90, 90);
  const maxLat = clamp(latitude + latitudeDelta, -90, 90);

  if (minLat <= -90 || maxLat >= 90) {
    return { minLat, maxLat, longitude: null };
  }

  const polewardLatitude = Math.max(Math.abs(minLat), Math.abs(maxLat));
  const longitudeScale =
    MILES_PER_LONGITUDE_DEGREE_AT_EQUATOR * Math.cos((polewardLatitude * Math.PI) / 180);
  if (longitudeScale <= Number.EPSILON) {
    return { minLat, maxLat, longitude: null };
  }

  const longitudeDelta = radiusMiles / longitudeScale;
  if (longitudeDelta >= 180) {
    return { minLat, maxLat, longitude: null };
  }

  const min = normalizeLongitude(longitude - longitudeDelta);
  const max = normalizeLongitude(longitude + longitudeDelta);
  return {
    minLat,
    maxLat,
    longitude: { min, max, wrapsAntimeridian: min > max },
  };
}

function compareLabels(left: NearbyCity, right: NearbyCity): number {
  const cityComparison = left.city.toLowerCase().localeCompare(right.city.toLowerCase());
  if (cityComparison === 0) {
    return left.state.toLowerCase().localeCompare(right.state.toLowerCase());
  }
  return cityComparison;
}

function isFiniteCoordinate(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function selectNearbyCities(
  rows: readonly NearbyEventRow[],
  origin: { readonly lat: number; readonly lng: number },
  currentCity: string,
  currentState: string,
  radiusMiles: number,
): NearbyCity[] {
  if (
    radiusMiles <= 0 ||
    !Number.isFinite(radiusMiles) ||
    !Number.isFinite(origin.lat) ||
    !Number.isFinite(origin.lng)
  ) {
    return [];
  }

  const currentKey = slugifyCity(currentCity.trim(), currentState.trim());
  const normalizedOrigin = {
    lat: clamp(origin.lat, -90, 90),
    lng: normalizeLongitude(origin.lng),
  };
  const closestByCity = new Map<string, NearbyCity>();

  for (const row of rows) {
    if (!row.city?.trim() || !row.state?.trim()) continue;
    if (!isFiniteCoordinate(row.location_lat) || !isFiniteCoordinate(row.location_lng)) continue;

    const city = row.city.trim();
    const state = row.state.trim();
    const slug = slugifyCity(city, state);
    if (slug === currentKey) continue;

    const distance = haversineMiles(
      normalizedOrigin.lat,
      normalizedOrigin.lng,
      row.location_lat,
      row.location_lng,
    );
    if (distance > radiusMiles) continue;

    const candidate: NearbyCity = { city, state, slug, minimumDistance: distance };
    const existing = closestByCity.get(slug);
    if (
      !existing ||
      distance < existing.minimumDistance ||
      (distance === existing.minimumDistance && compareLabels(candidate, existing) < 0)
    ) {
      closestByCity.set(slug, candidate);
    }
  }

  return [...closestByCity.values()].sort((left, right) => {
    const distanceComparison = left.minimumDistance - right.minimumDistance;
    if (distanceComparison === 0) return compareLabels(left, right);
    return distanceComparison;
  });
}

async function getNearbyCitiesImpl(
  eventId: string,
  currentCity: string,
  currentState: string,
  originLat: number | null,
  originLng: number | null,
  radiusMiles = SEO_NEARBY_CITY_RADIUS_MILES,
): Promise<NearbyCity[]> {
  if (!isFiniteCoordinate(originLat) || !isFiniteCoordinate(originLng)) return [];

  try {
    const filters = getUpcomingEventFilters();
    const box = buildNearbyBoundingBox(originLat, originLng, radiusMiles);
    const supabase = getSupabasePublicReader();
    let query = supabase
      .from('canonical_events')
      .select('city, state, location_lat, location_lng')
      .gte('location_lat', box.minLat)
      .lte('location_lat', box.maxLat)
      .eq('is_food_truck_relevant', filters.isFoodTruckRelevant)
      .eq('is_hidden', filters.isHidden)
      .gte('vetting_score', filters.minimumVettingScore)
      .gte('event_start_date', filters.today)
      .lte('event_start_date', filters.horizon);

    if (box.longitude) {
      query = box.longitude.wrapsAntimeridian
        ? query.or(`location_lng.gte.${box.longitude.min},location_lng.lte.${box.longitude.max}`)
        : query.gte('location_lng', box.longitude.min).lte('location_lng', box.longitude.max);
    }

    const orderedQuery = query
      .order('city', { ascending: true })
      .order('state', { ascending: true })
      .order('id', { ascending: true });
    const rows: NearbyEventRow[] = [];
    for (let offset = 0; ; offset += CANONICAL_EVENT_PAGE_SIZE) {
      const { data, error } = await orderedQuery.range(
        offset,
        offset + CANONICAL_EVENT_PAGE_SIZE - 1,
      );
      if (error) {
        logNearbyCityError(eventId, originLat, originLng, radiusMiles, error);
        return [];
      }
      rows.push(...(data ?? []));
      if ((data ?? []).length < CANONICAL_EVENT_PAGE_SIZE) break;
    }

    return selectNearbyCities(
      rows,
      { lat: originLat, lng: originLng },
      currentCity,
      currentState,
      radiusMiles,
    );
  } catch (error) {
    logNearbyCityError(eventId, originLat, originLng, radiusMiles, error);
    return [];
  }
}

function logNearbyCityError(
  eventId: string,
  originLat: number,
  originLng: number,
  radiusMiles: number,
  error: unknown,
): void {
  const details = isRecord(error) ? error : null;
  logError('Nearby-city lookup failed', {
    code: getStringProperty(details, 'code') ?? 'unknown',
    message:
      getStringProperty(details, 'message') ?? (error instanceof Error ? error.message : 'unknown'),
    details: getStringProperty(details, 'details'),
    hint: getStringProperty(details, 'hint'),
    eventId,
    originLat,
    originLng,
    radiusMiles,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringProperty(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' ? value : null;
}

async function getCachedNearbyCities(
  eventId: string,
  currentCity: string,
  currentState: string,
  originLat: number | null,
  originLng: number | null,
  radiusMiles = SEO_NEARBY_CITY_RADIUS_MILES,
): Promise<NearbyCity[]> {
  return unstable_cache(
    () => getNearbyCitiesImpl(eventId, currentCity, currentState, originLat, originLng, radiusMiles),
    ['event-page-nearby-cities', eventId, currentCity, currentState, String(radiusMiles)],
    {
      revalidate: EVENT_SECONDARY_REVALIDATE_SECONDS,
      tags: [EVENT_NEARBY_CITIES_CACHE_TAG, eventNearbyCitiesCacheTag(eventId)],
    },
  )();
}

export const getNearbyCities = cache(getCachedNearbyCities);
