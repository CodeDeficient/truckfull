import { parseEventSlug } from '@/lib/events/eventSlug';
import { parseCitySlug } from '@/lib/utils/slugify';

export type EventDetailPathClassification = 'not-event-detail' | 'malformed' | 'valid';

const EVENTS_PATH_PREFIX = '/events/';
const CITY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z]{2}$/;
const EVENT_TITLE_SLUG_PATTERN = /^[a-z0-9_]+(?:-[a-z0-9_]+)*-?$/;

function isValidIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function classifyEventDetailPath(pathname: string): EventDetailPathClassification {
  if (pathname === '/events' || pathname === '/events/') return 'not-event-detail';
  if (!pathname.startsWith(EVENTS_PATH_PREFIX)) return 'not-event-detail';

  const segments = pathname.slice(EVENTS_PATH_PREFIX.length).split('/');
  if (segments.at(-1) === '') segments.pop();
  if (segments.length === 1 && segments[0]) return 'not-event-detail';
  if (segments.length !== 2) return 'malformed';

  const [citySlug, eventSlug] = segments;
  const parsedCity = citySlug && parseCitySlug(citySlug);
  const parsedEvent = eventSlug && parseEventSlug(eventSlug);
  if (
    !parsedCity ||
    !parsedEvent ||
    !CITY_SLUG_PATTERN.test(citySlug) ||
    !EVENT_TITLE_SLUG_PATTERN.test(parsedEvent.titleSlug) ||
    !isValidIsoDate(parsedEvent.date)
  ) {
    return 'malformed';
  }

  return 'valid';
}
