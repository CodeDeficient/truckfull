import { cache } from 'react';
import { getSupabasePublicReader } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import { parseEventSlug, slugifyEventTitle } from '@/lib/events/eventSlug';
import { slugifyCity, parseCitySlug } from '@/lib/utils/slugify';

async function findCanonicalCitySlugImpl(
  eventSlug: string,
  currentCitySlug: string,
): Promise<string | null> {
  const parsed = parseEventSlug(eventSlug);
  if (!parsed) return null;

  const currentCity = parseCitySlug(currentCitySlug);
  if (!currentCity) return null;

  const supabase = getSupabasePublicReader();
  const { data, error } = await supabase
    .from('canonical_events')
    .select('city, state, title, vetting_score, ingested_at')
    .eq('event_start_date', parsed.date)
    .eq('state', currentCity.stateName)
    .eq('is_food_truck_relevant', true)
    .eq('is_hidden', false)
    .gte('vetting_score', 30)
    .order('vetting_score', { ascending: false, nullsFirst: false })
    .order('ingested_at', { ascending: true })
    .order('city', { ascending: true });

  if (error) {
    logError('findCanonicalCitySlug query failed:', error);
    return null;
  }
  if (!data?.length) return null;

  const target = parsed.titleSlug;
  for (const row of data) {
    if (!row.title || !row.city || !row.state) continue;
    if (slugifyEventTitle(row.title) === target) {
      const canonicalSlug = slugifyCity(row.city, row.state);
      if (canonicalSlug !== currentCitySlug) {
        return canonicalSlug;
      }
    }
  }

  return null;
}

export const findCanonicalCitySlug = cache(findCanonicalCitySlugImpl);
