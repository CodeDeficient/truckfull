export const EVENT_SECONDARY_REVALIDATE_SECONDS = 180 * 24 * 60 * 60;
export const EVENT_NEARBY_CITIES_CACHE_TAG = 'event-nearby-cities';
export const EVENT_INDEX_PATH = '/events';

function normalizeTagPart(value: string): string {
  return value.trim().toLowerCase();
}

export function eventCanonicalPath(citySlug: string, eventSlug: string): string {
  return `/events/${citySlug}/${eventSlug}`;
}

export function eventCityPath(citySlug: string): string {
  return `/events/${citySlug}`;
}

export function truckCityPath(citySlug: string): string {
  return `/city/${citySlug}`;
}

export function eventDetailCacheTag(citySlug: string, eventSlug: string): string {
  return `event-detail:${normalizeTagPart(citySlug)}:${normalizeTagPart(eventSlug)}`;
}

export function eventCityCacheTag(city: string, state: string): string {
  return `event-city:${normalizeTagPart(city)}:${normalizeTagPart(state)}`;
}

export function eventNearbyCitiesCacheTag(eventId: string): string {
  return `event-nearby:${normalizeTagPart(eventId)}`;
}
