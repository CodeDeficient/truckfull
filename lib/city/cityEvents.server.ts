import { unstable_cache } from 'next/cache';
import { getEventsForCityOrThrow } from '@/lib/events/eventPageData';
import {
  EVENT_SECONDARY_REVALIDATE_SECONDS,
  eventCityCacheTag,
} from '@/lib/events/eventCacheIdentity';
import { safeBuildEventSlug } from '@/lib/events/eventSlug';
import { cleanAddress } from '@/lib/utils/addressCleaner';

export const CITY_PAGE_EVENT_LIMIT = 3;

export interface CityPageEvent {
  readonly id: string;
  readonly title: string;
  readonly path: string;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly address: string | null;
}

export interface CityPageEvents {
  readonly total: number;
  readonly upcoming: readonly CityPageEvent[];
}

async function loadCityPageEvents(
  citySlug: string,
  cityName: string,
  stateName: string,
): Promise<CityPageEvents> {
  const events = await getEventsForCityOrThrow(cityName, stateName);
  const upcoming: CityPageEvent[] = [];
  for (const event of events) {
    if (upcoming.length >= CITY_PAGE_EVENT_LIMIT) break;
    const eventSlug = safeBuildEventSlug(event.title, event.eventStartDate ?? '');
    if (!eventSlug) continue;
    upcoming.push({
      id: event.id,
      title: event.title,
      path: `/events/${citySlug}/${eventSlug}`,
      startDate: event.eventStartDate,
      endDate: event.eventEndDate,
      address: event.locationAddress ? cleanAddress(event.locationAddress) : null,
    });
  }
  return { total: events.length, upcoming };
}

const NO_EVENTS: CityPageEvents = { total: 0, upcoming: [] };

export async function getCityPageEvents(
  citySlug: string,
  cityName: string,
  stateName: string,
): Promise<CityPageEvents> {
  const cached = unstable_cache(
    () => loadCityPageEvents(citySlug, cityName, stateName),
    ['city-page-events', citySlug],
    {
      revalidate: EVENT_SECONDARY_REVALIDATE_SECONDS,
      tags: [eventCityCacheTag(cityName, stateName)],
    },
  );
  try {
    return await cached();
  } catch {
    return NO_EVENTS;
  }
}
