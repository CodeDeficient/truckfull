import { revalidatePath, revalidateTag } from 'next/cache';
import {
  EVENT_INDEX_PATH,
  EVENT_NEARBY_CITIES_CACHE_TAG,
  eventCanonicalPath,
  eventCityCacheTag,
  eventCityPath,
  eventDetailCacheTag,
  eventNearbyCitiesCacheTag,
  truckCityPath,
} from '@/lib/events/eventCacheIdentity';
import { slugifyCity } from '@/lib/utils/slugify';

const TRAILING_DATE = /-(\d{4})-(\d{2})-(\d{2})$/;

export interface EventCacheTarget {
  readonly citySlug: string;
  readonly eventSlug: string;
  readonly city: string;
  readonly state: string;
  readonly eventId: string;
  /** Detail invalidates only detail; city adds city caches; full invalidates every event cache. */
  readonly cacheScope?: EventCacheScope;
  /** Canonical eligibility changes can alter cached outcomes for other event routes. */
  readonly canonicalizationChanged?: boolean;
}

export type EventCacheScope = 'detail' | 'city' | 'full';

const EVENT_ID_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EVENT_SLUG_PATTERN = /^[a-z0-9_-]{1,60}-(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const CITY_SLUG_PATTERN = /^[a-z0-9-]{2,200}-(ga|sc|nc)$/;
const EVENT_DETAIL_PAGE_PATTERN = '/events/[city-slug]/[event-slug]';
export const PLATFORM_STATES: ReadonlySet<string> = new Set(['GA', 'SC', 'NC']);
const MAX_CITY_NAME_LENGTH = 100;
const CITY_CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

function hasValidCalendarDate(eventSlug: string): boolean {
  const match = eventSlug.match(TRAILING_DATE);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function chunkEventCacheTargets(
  targets: readonly EventCacheTarget[],
  chunkSize: number,
): EventCacheTarget[][] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error('chunkSize must be a positive integer');
  }

  const chunks: EventCacheTarget[][] = [];
  for (let index = 0; index < targets.length; index += chunkSize) {
    chunks.push(targets.slice(index, index + chunkSize));
  }
  return chunks;
}

export function invalidateEventPage(target: EventCacheTarget): void {
  const cacheScope = target.cacheScope ?? 'full';
  revalidateTag(eventDetailCacheTag(target.citySlug, target.eventSlug), { expire: 0 });
  revalidatePath(eventCanonicalPath(target.citySlug, target.eventSlug));
  if (target.canonicalizationChanged) {
    revalidatePath(EVENT_DETAIL_PAGE_PATTERN, 'page');
  }
  if (cacheScope === 'detail') return;

  revalidateTag(eventCityCacheTag(target.city, target.state), { expire: 0 });
  revalidatePath(eventCityPath(target.citySlug));
  revalidatePath(truckCityPath(target.citySlug));
  if (cacheScope === 'city') return;

  revalidateTag(EVENT_NEARBY_CITIES_CACHE_TAG, { expire: 0 });
  revalidateTag(eventNearbyCitiesCacheTag(target.eventId), { expire: 0 });
  revalidatePath(EVENT_INDEX_PATH);
}

export function invalidateEventCacheTargets(targets: readonly EventCacheTarget[]): void {
  for (const target of targets) invalidateEventPage(target);
}

export function isEventCacheTarget(value: unknown): value is EventCacheTarget {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (
    typeof record['citySlug'] !== 'string' ||
    typeof record['eventSlug'] !== 'string' ||
    typeof record['city'] !== 'string' ||
    typeof record['state'] !== 'string' ||
    typeof record['eventId'] !== 'string'
  ) {
    return false;
  }

  const { citySlug, eventSlug, city, state, eventId } = record as Record<string, string>;
  const cacheScope = record['cacheScope'];
  const canonicalizationChanged = record['canonicalizationChanged'];
  if (
    cacheScope !== undefined &&
    cacheScope !== 'detail' &&
    cacheScope !== 'city' &&
    cacheScope !== 'full'
  ) {
    return false;
  }
  if (canonicalizationChanged !== undefined && typeof canonicalizationChanged !== 'boolean') {
    return false;
  }
  if (city.length === 0 || city.length > MAX_CITY_NAME_LENGTH || CITY_CONTROL_CHARS.test(city)) {
    return false;
  }
  if (!PLATFORM_STATES.has(state)) return false;
  if (!EVENT_SLUG_PATTERN.test(eventSlug)) return false;
  if (!hasValidCalendarDate(eventSlug)) return false;
  if (!CITY_SLUG_PATTERN.test(citySlug)) return false;
  if (!EVENT_ID_UUID_V4.test(eventId)) return false;
  if (slugifyCity(city, state) !== citySlug) return false;

  return true;
}
