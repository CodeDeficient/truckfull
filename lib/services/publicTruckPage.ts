import { cache } from 'react';
import { revalidateTag, unstable_cache } from 'next/cache';
import { getSupabasePublicReader } from '@/lib/supabase/admin';
import { isValidSlug, RESERVED_SLUGS, isCitySlugPattern } from '@/lib/utils/slugify';
import type { Database } from '@/lib/database.remote.types';
import {
  addDaysToDateKey,
  buildCurrentDaySchedule,
  previousDateKey,
  type CurrentDayScheduleOverride,
  type CurrentDayScheduleRecurrence,
} from '@/lib/services/currentDaySchedule';
import {
  dateKeyInTimezone,
  type OverrideLocation,
  type RecurringHours,
} from '@/lib/services/scheduleOverride';
import { formatHourMinuteInTimezone } from '@/lib/services/timezoneFormatter';
import { NEXT_STOP_WINDOW_DAYS, pickNextStop, type NextStop } from '@/lib/truck-profile/nextStop';
import { currentDayRecurrenceKey } from '@/lib/services/publicScheduleRecurrence';
import { fetchPublicScheduleRecurrences } from '@/lib/services/publicScheduleRecurrence.server';
import { withFetchRetry } from '@/lib/services/fetchRetry';
import { shortenPublicTruckCacheLifetime } from '@/lib/services/publicTruckFallbackTtl';
import { logError } from '@/lib/logging';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PUBLIC_TRUCK_SELECT_FIELDS = [
  'id',
  'name',
  'slug',
  'description',
  'cuisine_type',
  'city',
  'state',
  'updated_at',
  'contact_info',
  'social_media',
  'current_location',
  'default_lat',
  'default_lng',
  'live_gps_lat',
  'live_gps_lng',
  'status',
  'price_range',
  'menu',
  'operating_hours',
  'timezone',
  'is_active',
  'average_rating',
  'review_count',
  'is_claimed',
  'schedule_updated_at',
  'schedule_updated_by',
] as const;

export type PublicTruckRow = Pick<
  Database['public']['Tables']['food_trucks']['Row'],
  (typeof PUBLIC_TRUCK_SELECT_FIELDS)[number]
> & {
  current_day_hours?: unknown;
  current_day_service_date?: string | null;
  next_stop?: NextStop | null;
};

const OVERRIDE_FIELDS =
  'food_truck_id, service_date, is_closed, is_all_day, start_time, end_time, ends_next_day, timezone, location_data';

export const PUBLIC_TRUCK_CACHE_TTL = 86_400;
export const PUBLIC_TRUCKS_TAG = 'public-trucks';

export function normalizePublicTruckSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function isAllowedPublicTruckSlug(slug: string): boolean {
  if (!isValidSlug(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return !isCitySlugPattern(slug);
}

export const publicTruckTag = (slug: string): string =>
  `public-truck:${normalizePublicTruckSlug(slug)}`;

async function fetchPublicTruckRowBySlug(slug: string): Promise<PublicTruckRow | null> {
  return withFetchRetry(async () => {
    const supabase = getSupabasePublicReader();
    const { data, error } = (await supabase
      .from('food_trucks')
      .select(PUBLIC_TRUCK_SELECT_FIELDS.join(', '))
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()) as { data: PublicTruckRow | null; error: unknown };

    if (error) throw error;
    if (data || !isUuid(slug)) return data;

    const fallback = (await supabase
      .from('food_trucks')
      .select(PUBLIC_TRUCK_SELECT_FIELDS.join(', '))
      .eq('id', slug)
      .eq('is_active', true)
      .maybeSingle()) as { data: PublicTruckRow | null; error: unknown };

    if (fallback.error) throw fallback.error;
    return fallback.data;
  });
}

function toScheduleOverride(override: {
  food_truck_id: string;
  service_date: string;
  is_closed: boolean;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  ends_next_day: boolean;
  timezone: string;
  location_data: unknown;
}): CurrentDayScheduleOverride {
  return { ...override, location_data: override.location_data as OverrideLocation | null };
}

async function loadNextStop(
  truckId: string,
  timezone: string,
  now: Date,
): Promise<NextStop | null> {
  const today = dateKeyInTimezone(now.toISOString(), timezone);
  const end = today ? addDaysToDateKey(today, NEXT_STOP_WINDOW_DAYS) : null;
  if (!today || !end) return null;
  const [overrideResult, recurrences] = await Promise.all([
    getSupabasePublicReader()
      .from('food_truck_schedule_overrides')
      .select(OVERRIDE_FIELDS)
      .eq('food_truck_id', truckId)
      .gte('service_date', today)
      .lte('service_date', end),
    fetchPublicScheduleRecurrences([truckId], today, end),
  ]);
  if (overrideResult.error) {
    await shortenPublicTruckCacheLifetime();
    return null;
  }
  const { hour, minute } = formatHourMinuteInTimezone(now, timezone);
  return pickNextStop({
    overrides: (overrideResult.data ?? []).map((row) => toScheduleOverride(row)),
    recurrences: Object.values(recurrences),
    today,
    nowMinutes: hour * 60 + minute,
  });
}

export async function enrichPublicTruckRow(row: PublicTruckRow): Promise<PublicTruckRow> {
  if (!row.timezone) return row;
  const now = new Date();
  const timezone = row.timezone;
  const [enriched, nextStop] = await Promise.all([
    enrichCurrentDay(row, timezone, now),
    row.is_claimed
      ? loadNextStop(row.id, timezone, now).catch(async (error: unknown): Promise<null> => {
          logError('Public next stop enrichment failed', error);
          await shortenPublicTruckCacheLifetime();
          return null;
        })
      : Promise.resolve(null),
  ]);
  return nextStop ? { ...enriched, next_stop: nextStop } : enriched;
}

type OverrideQueryRow = Parameters<typeof toScheduleOverride>[0];

function buildOverrideMap(
  data: readonly OverrideQueryRow[] | null,
): Map<string, CurrentDayScheduleOverride> {
  return new Map(
    (data ?? []).map((override) => [
      override.service_date,
      {
        food_truck_id: override.food_truck_id,
        service_date: override.service_date,
        is_closed: override.is_closed,
        is_all_day: override.is_all_day,
        start_time: override.start_time,
        end_time: override.end_time,
        ends_next_day: override.ends_next_day,
        timezone: override.timezone,
        location_data: override.location_data as OverrideLocation | null,
      } satisfies CurrentDayScheduleOverride,
    ]),
  );
}

async function fetchRecurrencesWithFallback(
  truckId: string,
  from: string,
  to: string,
): Promise<Record<string, CurrentDayScheduleRecurrence>> {
  return fetchPublicScheduleRecurrences([truckId], from, to).catch(
    async (error: unknown): Promise<Record<string, CurrentDayScheduleRecurrence>> => {
      logError('Public recurrence enrichment failed; preserving legacy schedule', error);
      await shortenPublicTruckCacheLifetime();
      return {};
    },
  );
}

async function enrichCurrentDay(
  row: PublicTruckRow,
  timezone: string,
  now: Date,
): Promise<PublicTruckRow> {
  const truck = {
    timezone,
    operating_hours: (row.operating_hours ?? {}) as RecurringHours,
  };
  const initial = buildCurrentDaySchedule(truck, now, null);
  if (!initial) return row;
  const previousDate = previousDateKey(initial.serviceDate);
  const serviceDates = [initial.serviceDate, ...(previousDate ? [previousDate] : [])];
  const [overrideResult, recurrences] = await Promise.all([
    getSupabasePublicReader()
      .from('food_truck_schedule_overrides')
      .select(OVERRIDE_FIELDS)
      .eq('food_truck_id', row.id)
      .in('service_date', serviceDates),
    fetchRecurrencesWithFallback(row.id, previousDate ?? initial.serviceDate, initial.serviceDate),
  ]);
  const { data, error } = overrideResult;
  if (error) {
    await shortenPublicTruckCacheLifetime();
    return row;
  }

  const overrides = buildOverrideMap(data);
  const current = buildCurrentDaySchedule(
    truck,
    now,
    overrides.get(initial.serviceDate) ?? null,
    previousDate ? (overrides.get(previousDate) ?? null) : null,
    recurrences[currentDayRecurrenceKey(row.id, initial.serviceDate)] ?? null,
    previousDate ? (recurrences[currentDayRecurrenceKey(row.id, previousDate)] ?? null) : null,
  );
  if (!current) return row;
  return {
    ...row,
    current_day_hours: current.hours,
    current_day_service_date: current.hoursServiceDate,
  };
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export const getPublicTruckBySlug = cache(
  async (inputSlug: string): Promise<PublicTruckRow | null> => {
    const slug = normalizePublicTruckSlug(inputSlug);

    if (!isAllowedPublicTruckSlug(slug) && !isUuid(slug)) {
      return null;
    }

    const row = await unstable_cache(
      () => fetchPublicTruckRowBySlug(slug),
      ['public-truck-by-slug-v4', slug],
      {
        revalidate: PUBLIC_TRUCK_CACHE_TTL,
        tags: [PUBLIC_TRUCKS_TAG, publicTruckTag(slug)],
      },
    )();
    return row ? enrichPublicTruckRow(row) : row;
  },
);

export function invalidatePublicTruckBySlug(slug: string): void {
  revalidateTag(publicTruckTag(slug), { expire: 0 });
  revalidateTag(PUBLIC_TRUCKS_TAG, { expire: 0 });
}

export function invalidatePublicTruckSearchCaches(): void {
  revalidateTag('food-trucks', 'max');
}
