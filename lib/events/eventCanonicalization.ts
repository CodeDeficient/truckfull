import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.remote.types';
import { getSupabasePublicReader } from '@/lib/supabase/admin';
import { logError, logWarning } from '@/lib/logging';
import { classifyEventDetailPath } from '@/lib/events/eventDetailPath';
import { parseEventSlug, slugifyEventTitle } from '@/lib/events/eventSlug';
import { parseCitySlug, slugifyCity } from '@/lib/utils/slugify';

const EVENT_DETAIL_PATH = /^\/events\/([^/]+)\/([^/]+)\/?$/;
const SLUG_SEGMENT = /^[a-z0-9_-]+$/;

export const EVENT_CANONICAL_LOOKUP_PAGE_SIZE = 1000;
export const EVENT_CANONICAL_LOOKUP_MAX_PAGES = 10;
export const EVENT_CANONICAL_LOOKUP_EXHAUSTED = 'lookup_exhausted';
export const EVENT_CANONICAL_LOOKUP_FAILED = 'lookup_failed';
export const EVENT_CANONICAL_CONFIRMED = 'canonical_confirmed';
export const EVENT_EVENT_NOT_FOUND = 'event_not_found';

export type EventCanonicalLookupResult =
  | string
  | null
  | typeof EVENT_CANONICAL_LOOKUP_EXHAUSTED
  | typeof EVENT_CANONICAL_LOOKUP_FAILED
  | typeof EVENT_CANONICAL_CONFIRMED
  | typeof EVENT_EVENT_NOT_FOUND;

export function isEventCanonicalRedirect(result: EventCanonicalLookupResult): result is string {
  return (
    typeof result === 'string' &&
    result !== EVENT_CANONICAL_CONFIRMED &&
    result !== EVENT_CANONICAL_LOOKUP_EXHAUSTED &&
    result !== EVENT_CANONICAL_LOOKUP_FAILED &&
    result !== EVENT_EVENT_NOT_FOUND
  );
}

export async function findEventCanonicalRedirect(
  supabase: SupabaseClient<Database>,
  pathname: string,
): Promise<EventCanonicalLookupResult> {
  const match = pathname.match(EVENT_DETAIL_PATH);
  if (!match) return null;
  const city = parseCitySlug(match[1]);
  const event = parseEventSlug(match[2]);
  if (!city || !event || !SLUG_SEGMENT.test(event.titleSlug)) return null;

  const titlePattern = `%${event.titleSlug
    .split('-')
    .map((part) =>
      [...part].map((character) => (character === '_' ? String.raw`\_` : character)).join('%'),
    )
    .join('%')}%`;
  const { data: currentRows, error: currentError } = await supabase
    .from('external_events')
    .select('id, title, is_canonical')
    .ilike('city', city.cityName)
    .eq('state', city.stateName)
    .eq('event_start_date', event.date)
    .eq('is_food_truck_relevant', true)
    .eq('is_hidden', false)
    .gte('vetting_score', 30)
    .ilike('title', titlePattern)
    .order('id', { ascending: true })
    .limit(EVENT_CANONICAL_LOOKUP_PAGE_SIZE);
  if (currentError) {
    logError('Event source canonical status query failed:', currentError);
    return EVENT_CANONICAL_LOOKUP_FAILED;
  }

  const currentEvent = (currentRows ?? []).find(
    (row) => row.title && slugifyEventTitle(row.title) === event.titleSlug,
  );
  if (!currentEvent) {
    return (currentRows ?? []).length >= EVENT_CANONICAL_LOOKUP_PAGE_SIZE
      ? EVENT_CANONICAL_LOOKUP_EXHAUSTED
      : EVENT_EVENT_NOT_FOUND;
  }
  if (currentEvent.is_canonical === true) return EVENT_CANONICAL_CONFIRMED;
  if (currentEvent.is_canonical !== false) return null;

  for (let page = 0; page < EVENT_CANONICAL_LOOKUP_MAX_PAGES; page++) {
    const offset = page * EVENT_CANONICAL_LOOKUP_PAGE_SIZE;
    const { data, error } = await supabase
      .from('canonical_events')
      .select('id, city, state, title')
      .eq('event_start_date', event.date)
      .eq('state', city.stateName)
      .eq('is_food_truck_relevant', true)
      .eq('is_hidden', false)
      .gte('vetting_score', 30)
      .ilike('title', titlePattern)
      .order('vetting_score', { ascending: false, nullsFirst: false })
      .order('ingested_at', { ascending: true })
      .order('city', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + EVENT_CANONICAL_LOOKUP_PAGE_SIZE - 1);

    if (error) {
      logError('Event canonical redirect query failed:', error);
      return EVENT_CANONICAL_LOOKUP_FAILED;
    }

    const canonical = (data ?? []).find(
      (row) => row.title && slugifyEventTitle(row.title) === event.titleSlug,
    );
    if (canonical?.city && canonical.state) {
      const canonicalCitySlug = slugifyCity(canonical.city, canonical.state);
      return canonicalCitySlug === match[1]
        ? EVENT_CANONICAL_CONFIRMED
        : `/events/${canonicalCitySlug}/${match[2]}`;
    }
    if ((data ?? []).length < EVENT_CANONICAL_LOOKUP_PAGE_SIZE) return null;
  }
  return EVENT_CANONICAL_LOOKUP_EXHAUSTED;
}

export async function resolveEventCanonicalRedirect(
  citySlug: string,
  eventSlug: string,
  supabase?: SupabaseClient<Database>,
): Promise<EventCanonicalLookupResult> {
  const pathname = `/events/${citySlug}/${eventSlug}`;
  if (classifyEventDetailPath(pathname) !== 'valid') return EVENT_EVENT_NOT_FOUND;

  try {
    const result = await findEventCanonicalRedirect(supabase ?? getSupabasePublicReader(), pathname);
    if (result === EVENT_CANONICAL_LOOKUP_EXHAUSTED) {
      logWarning('Event canonical lookup reached its safety limit; rendering the requested path');
    }
    if (result === EVENT_CANONICAL_LOOKUP_FAILED) {
      logWarning('Event canonical lookup failed; rendering the requested path');
    }
    return result;
  } catch (error) {
    logError('Event canonical redirect lookup threw an exception:', error);
    return EVENT_CANONICAL_LOOKUP_FAILED;
  }
}
