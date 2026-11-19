/**
 * Data access layer for event landing pages.
 *
 * All queries use getSupabasePublicReader() (service role, RLS-bypassed,
 * build-time read-only) and target the staging/production
 * external_events table. Functions return a normalized EventPageData
 * shape with the vetting_result JSONB parsed into typed fields so
 * pages and SEO helpers never touch unknown JSON. Index and discovery
 * queries use the SEO horizon; exact detail lookups resolve retained
 * public records by their requested date.
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getSupabasePublicReader } from '@/lib/supabase/admin';
import type { Json, Tables } from '@/lib/database.remote.types';
import { citySlugMatchesName, parseCitySlug } from '@/lib/utils/slugify';
import { parseEventSlug, slugifyEventTitle } from '@/lib/events/eventSlug';
import { getUpcomingEventFilters } from '@/lib/events/seoEventFilters';
import { collapseConsecutiveDays, pickBestDuplicate } from '@/lib/events/collapseEvents';
import {
  EVENT_SECONDARY_REVALIDATE_SECONDS,
  eventCityCacheTag,
  eventDetailCacheTag,
} from '@/lib/events/eventCacheIdentity';

/** Parsed vetting_result JSONB fields used by event pages. */
export interface VettingFactors {
  readonly trafficScore: number;
  readonly researchConfidence: number;
  readonly historyScore: number;
  readonly areaEventCount: number;
  readonly recurringCount: number;
  readonly venuePopularity: number;
  readonly previouslyOccurredScore: number;
  readonly titleScore: number;
}

/** Normalized event data for landing pages. */
export interface EventPageData {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly organization: string | null;
  readonly website: string | null;
  readonly sourceUrl: string | null;
  readonly source: string;
  readonly sourceType: string;
  readonly city: string;
  readonly state: string;
  readonly locationAddress: string | null;
  readonly locationLat: number | null;
  readonly locationLng: number | null;
  readonly eventStartDate: string | null;
  readonly eventStartTime: string | null;
  readonly eventEndDate: string | null;
  readonly eventEndTime: string | null;
  readonly permitStatus: string;
  readonly verificationTier: number | null;
  readonly vettingScore: number | null;
  readonly vettedAt: string | null;
  readonly recommendation: string | null;
  readonly reasoning: string | null;
  readonly factors: VettingFactors | null;
  readonly isFoodTruckRelevant: boolean;
  readonly isCanonical: boolean;
}

type EventRow = Pick<
  Tables<'external_events'>,
  | 'id'
  | 'title'
  | 'description'
  | 'organization'
  | 'website'
  | 'source_url'
  | 'source'
  | 'source_type'
  | 'city'
  | 'state'
  | 'location_address'
  | 'location_lat'
  | 'location_lng'
  | 'event_start_date'
  | 'event_start_time'
  | 'event_end_date'
  | 'event_end_time'
  | 'permit_status'
  | 'verification_tier'
  | 'vetting_score'
  | 'vetted_at'
  | 'vetting_result'
  | 'is_food_truck_relevant'
  | 'is_canonical'
>;

interface CityCountEvent {
  readonly id: string;
  readonly title: string;
  readonly city: string;
  readonly state: string;
  readonly locationAddress: string | null;
  readonly eventStartDate: string | null;
  readonly eventEndDate: string | null;
}

const EVENT_SELECT =
  'id, title, description, organization, website, source_url, source, source_type, city, state, location_address, location_lat, location_lng, event_start_date, event_start_time, event_end_date, event_end_time, permit_status, verification_tier, vetting_score, vetted_at, vetting_result, is_food_truck_relevant, is_canonical';

const CITY_SLUG_LOOKUP_PAGE_SIZE = 1000;
export const EVENT_PAGE_SECONDARY_REVALIDATE_SECONDS = EVENT_SECONDARY_REVALIDATE_SECONDS;

export interface EventCityTruck {
  readonly id: string;
  readonly name: string;
  readonly slug: string | null;
  readonly cuisine_type: string[] | null;
  readonly photo_url: string | null;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Safely extract typed factors from the vetting_result JSONB blob. */
function parseVettingResult(raw: unknown): {
  factors: VettingFactors | null;
  recommendation: string | null;
  reasoning: string | null;
} {
  if (!isRecord(raw)) {
    return { factors: null, recommendation: null, reasoning: null };
  }
  const factorsRaw = raw['factors'];
  const factorsObject = isRecord(factorsRaw) ? factorsRaw : null;
  const factors: VettingFactors | null = factorsObject
    ? {
        trafficScore: asNumber(factorsObject['trafficScore']),
        researchConfidence: asNumber(factorsObject['researchConfidence']),
        historyScore: asNumber(factorsObject['historyScore']),
        areaEventCount: asNumber(factorsObject['areaEventCount']),
        recurringCount: asNumber(factorsObject['recurringCount']),
        venuePopularity: asNumber(factorsObject['venuePopularity']),
        previouslyOccurredScore: asNumber(factorsObject['previouslyOccurredScore']),
        titleScore: asNumber(factorsObject['titleScore']),
      }
    : null;
  return {
    factors,
    recommendation: asString(raw['recommendation']),
    reasoning: asString(raw['reasoning']),
  };
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function mapRow(row: EventRow): EventPageData {
  const parsed = parseVettingResult(row.vetting_result);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    organization: row.organization,
    website: row.website,
    sourceUrl: row.source_url,
    source: row.source,
    sourceType: row.source_type,
    city: toTitleCase(row.city),
    state: row.state,
    locationAddress: row.location_address,
    locationLat: row.location_lat,
    locationLng: row.location_lng,
    eventStartDate: row.event_start_date,
    eventStartTime: row.event_start_time,
    eventEndDate: row.event_end_date,
    eventEndTime: row.event_end_time,
    permitStatus: row.permit_status,
    verificationTier: row.verification_tier,
    vettingScore: row.vetting_score,
    vettedAt: row.vetted_at,
    recommendation: parsed.recommendation,
    reasoning: parsed.reasoning,
    factors: parsed.factors,
    isFoodTruckRelevant: row.is_food_truck_relevant ?? false,
    isCanonical: row.is_canonical ?? true,
  };
}

/** Traffic score bucket label for the owner intelligence section. */
export function getTrafficLabel(event: EventPageData): 'Low' | 'Moderate' | 'High' {
  const score = event.factors?.trafficScore ?? 0;
  if (score > 0.6) return 'High';
  if (score >= 0.3) return 'Moderate';
  return 'Low';
}

/**
 * Fetch all upcoming food-truck-relevant, non-hidden events (score >= 30)
 * grouped by city, with consecutive-day events collapsed — the same
 * deduplication applied by getEventsForCity(). Used by the all-events
 * index page so the city list and total count match what users see when
 * they click through to a city page.
 */
export async function getCityEventCounts(
  today: Date = new Date(),
): Promise<{ city: string; state: string; count: number }[]> {
  const supabase = getSupabasePublicReader();
  const filters = getUpcomingEventFilters(today);
  const { data, error } = await supabase
    .from('canonical_events')
    .select('id, title, city, state, location_address, event_start_date, event_end_date')
    .gte('event_start_date', filters.today)
    .lte('event_start_date', filters.horizon)
    .eq('is_food_truck_relevant', filters.isFoodTruckRelevant)
    .eq('is_hidden', filters.isHidden)
    .gte('vetting_score', filters.minimumVettingScore)
    .order('event_start_date', { ascending: true });

  if (error || !data?.length) return [];

  const byCity = new Map<string, CityCountEvent[]>();
  for (const row of data) {
    if (!row.id || !row.title || !row.city || !row.state) continue;
    const mapped: CityCountEvent = {
      id: row.id,
      title: row.title,
      city: toTitleCase(row.city),
      state: row.state,
      locationAddress: row.location_address,
      eventStartDate: row.event_start_date,
      eventEndDate: row.event_end_date,
    };
    const key = `${mapped.city}-${mapped.state}`;
    const arr = byCity.get(key);
    if (arr) arr.push(mapped);
    else byCity.set(key, [mapped]);
  }

  const results: { city: string; state: string; count: number }[] = [];
  for (const [, events] of byCity) {
    const collapsed = collapseConsecutiveDays(events);
    const first = collapsed[0];
    results.push({ city: first.city, state: first.state, count: collapsed.length });
  }
  return results.sort((a, b) => b.count - a.count);
}

/**
 * Fetch a single event by city slug + event slug.
 *
 * Wrapped in React's cache() so generateMetadata and the page body share
 * the same Supabase result within a single request — no duplicate queries.
 *
 * The city slug resolves to {cityName, stateName}; the event slug
 * resolves to {titleSlug, date}. We query by city (ilike, case-insensitive),
 * state, and exact start date, then fuzzy-match the title slug against
 * slugifyEventTitle(title) to pick the right event among same-date entries.
 */
async function getEventBySlugImpl(
  citySlug: string,
  eventSlug: string,
): Promise<EventPageData | null> {
  const city = parseCitySlug(citySlug);
  if (!city) return null;
  const parsed = parseEventSlug(eventSlug);
  if (!parsed) return null;

  const supabase = getSupabasePublicReader();
  const { data, error } = await supabase
    .from('external_events')
    .select(EVENT_SELECT)
    .ilike('city', city.cityName)
    .eq('state', city.stateName)
    .eq('event_start_date', parsed.date)
    .eq('is_food_truck_relevant', true)
    .eq('is_hidden', false)
    .gte('vetting_score', 30);

  if (error) throw error;
  if (!data?.length) return null;

  const target = parsed.titleSlug;
  const rows = data;
  rows.sort((a, b) => {
    const aCanon = a.is_canonical ? 1 : 0;
    const bCanon = b.is_canonical ? 1 : 0;
    return bCanon - aCanon;
  });
  const exact = rows.find((r) => slugifyEventTitle(r.title) === target);
  if (!exact) return null;
  const mapped = mapRow(exact);
  const duplicates = rows
    .filter((r) => r.id !== exact.id && slugifyEventTitle(r.title) === target)
    .map((r) => mapRow(r));
  if (duplicates.length === 0) return mapped;
  let merged = mapped;
  for (const dup of duplicates) {
    merged = pickBestDuplicate(merged, dup);
  }
  return merged;
}

async function getCachedEventBySlug(
  citySlug: string,
  eventSlug: string,
): Promise<EventPageData | null> {
  return unstable_cache(
    () => getEventBySlugImpl(citySlug, eventSlug),
    ['event-page-detail', citySlug, eventSlug],
    { revalidate: false, tags: [eventDetailCacheTag(citySlug, eventSlug)] },
  )();
}

/** Request-level wrapper shares the persistent result between metadata and page rendering. */
export const getEventBySlug = cache(getCachedEventBySlug);

/** Fetch all future, food-truck-relevant, non-hidden events for a city (score >= 30). */
export async function getEventsForCityOrThrow(
  cityName: string,
  stateName: string,
  today: Date = new Date(),
): Promise<EventPageData[]> {
  const supabase = getSupabasePublicReader();
  const filters = getUpcomingEventFilters(today);
  const { data, error } = await supabase
    .from('external_events')
    .select(EVENT_SELECT)
    .ilike('city', cityName)
    .eq('state', stateName)
    .gte('event_start_date', filters.today)
    .lte('event_start_date', filters.horizon)
    .eq('is_food_truck_relevant', filters.isFoodTruckRelevant)
    .eq('is_hidden', filters.isHidden)
    .gte('vetting_score', filters.minimumVettingScore)
    .order('event_start_date', { ascending: true });

  if (error) throw new Error(`City events query failed: ${error.message}`);

  let rows = data ?? [];
  if (rows.length === 0) {
    const matchingCities = new Set<string>();
    for (let offset = 0; ; offset += CITY_SLUG_LOOKUP_PAGE_SIZE) {
      const lookup = await supabase
        .from('external_events')
        .select('id, city, state')
        .eq('state', stateName)
        .gte('event_start_date', filters.today)
        .lte('event_start_date', filters.horizon)
        .eq('is_food_truck_relevant', filters.isFoodTruckRelevant)
        .eq('is_hidden', filters.isHidden)
        .gte('vetting_score', filters.minimumVettingScore)
        .order('city', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + CITY_SLUG_LOOKUP_PAGE_SIZE - 1);
      if (lookup.error) throw new Error(`City events lookup failed: ${lookup.error.message}`);

      for (const row of lookup.data ?? []) {
        if (row.city && citySlugMatchesName(row.city, row.state, cityName, stateName)) {
          matchingCities.add(row.city);
        }
      }
      if ((lookup.data ?? []).length < CITY_SLUG_LOOKUP_PAGE_SIZE) break;
    }

    if (matchingCities.size === 0) return [];
    const fallback = await supabase
      .from('external_events')
      .select(EVENT_SELECT)
      .in('city', [...matchingCities])
      .eq('state', stateName)
      .gte('event_start_date', filters.today)
      .lte('event_start_date', filters.horizon)
      .eq('is_food_truck_relevant', filters.isFoodTruckRelevant)
      .eq('is_hidden', filters.isHidden)
      .gte('vetting_score', filters.minimumVettingScore)
      .order('event_start_date', { ascending: true });
    if (fallback.error) throw new Error(`City events fallback failed: ${fallback.error.message}`);
    rows = fallback.data ?? [];
  }

  if (rows.length === 0) return [];
  const mapped = rows.map((row) => mapRow(row));
  return collapseConsecutiveDays(mapped);
}

export async function getEventsForCity(
  cityName: string,
  stateName: string,
  today: Date = new Date(),
): Promise<EventPageData[]> {
  try {
    return await getEventsForCityOrThrow(cityName, stateName, today);
  } catch {
    return [];
  }
}

/**
 * Fetch other upcoming events in the same city, excluding the given event id.
 * Used by the "More Events in {City}" section on event detail pages.
 */
async function getOtherEventsInCityImpl(
  cityName: string,
  stateName: string,
  excludeEventId: string,
  limit = 8,
  today: Date = new Date(),
): Promise<EventPageData[]> {
  const supabase = getSupabasePublicReader();
  const filters = getUpcomingEventFilters(today);
  const { data, error } = await supabase
    .from('external_events')
    .select(EVENT_SELECT)
    .ilike('city', cityName)
    .eq('state', stateName)
    .gte('event_start_date', filters.today)
    .lte('event_start_date', filters.horizon)
    .eq('is_food_truck_relevant', filters.isFoodTruckRelevant)
    .eq('is_hidden', filters.isHidden)
    .gte('vetting_score', filters.minimumVettingScore)
    .neq('id', excludeEventId)
    .order('event_start_date', { ascending: true })
    .limit(limit * 3);

  if (error || !data?.length) return [];
  const mapped = data.map((row) => mapRow(row));
  return collapseConsecutiveDays(mapped).slice(0, limit);
}

async function getCachedOtherEventsInCity(
  cityName: string,
  stateName: string,
  excludeEventId: string,
  limit = 8,
): Promise<EventPageData[]> {
  return unstable_cache(
    () => getOtherEventsInCityImpl(cityName, stateName, excludeEventId, limit),
    ['event-page-city-list', cityName, stateName, excludeEventId, String(limit)],
    {
      revalidate: EVENT_PAGE_SECONDARY_REVALIDATE_SECONDS,
      tags: [eventCityCacheTag(cityName, stateName)],
    },
  )();
}

export const getOtherEventsInCity = cache(getCachedOtherEventsInCity);

function photoUrlFromSocialMedia(socialMedia: Json | null): string | null {
  if (typeof socialMedia !== 'object' || socialMedia === null || Array.isArray(socialMedia)) {
    return null;
  }
  const photoUrl = socialMedia['photo_url'];
  return typeof photoUrl === 'string' ? photoUrl : null;
}

async function getEventCityTrucksImpl(city: string, state: string): Promise<EventCityTruck[]> {
  const supabase = getSupabasePublicReader();
  const { data } = await supabase
    .from('food_trucks')
    .select('id, name, slug, cuisine_type, social_media')
    .ilike('city', city)
    .eq('state', state)
    .eq('is_active', true)
    .limit(6);
  return (data ?? []).map((truck) => ({
    id: truck.id,
    name: truck.name,
    slug: truck.slug,
    cuisine_type: truck.cuisine_type,
    photo_url: photoUrlFromSocialMedia(truck.social_media),
  }));
}

async function getCachedEventCityTrucks(city: string, state: string): Promise<EventCityTruck[]> {
  return unstable_cache(
    () => getEventCityTrucksImpl(city, state),
    ['event-page-city-trucks', city, state],
    {
      revalidate: EVENT_PAGE_SECONDARY_REVALIDATE_SECONDS,
      tags: [eventCityCacheTag(city, state)],
    },
  )();
}

export const getEventCityTrucks = cache(getCachedEventCityTrucks);
