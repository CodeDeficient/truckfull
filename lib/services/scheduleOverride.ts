import type { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Database, Json } from '@/lib/database.remote.types';
import {
  dateKeyInTimezoneCached,
  isValidTimezoneCached,
} from '@/lib/services/timezoneFormatter';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ORDINAL_SUFFIXES = /(\d)(st|nd|rd|th)\b/g;
const LOOSE_ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const YEAR_FIRST_SLASH_DATE = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;
const MONTH_DAY_SLASH_DATE = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/;
const MONTH_NAME_DATE = /^([a-z]{3,9})\.?\s+(\d{1,2})(?:,\s*(\d{4}))?$/;
const THIS_WEEKDAY =
  /^this\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|weds|thu|thurs|fri|sat)$/;
const YEARLESS_DATE = /^(?:\d{1,2}\/\d{1,2}|[a-z]{3,9}\.?\s+\d{1,2})$/;
const TWELVE_HOUR_TIME = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i;
const TWENTY_FOUR_HOUR_TIME = /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/;

type AdminClient = ReturnType<typeof getSupabaseAdmin>;
type GeneratedOverrideInsert = Database['public']['Tables']['food_truck_schedule_overrides']['Insert'];
type OverrideInsert = GeneratedOverrideInsert & {
  location_data?: Json | null;
  source_post_created_at?: string | null;
};

export interface OverrideLocation {
  address?: string;
  city?: string;
  state?: string;
  fuzzy?: boolean;
  /** Attached at write time by overrideLocationEnrichment; optional by design. */
  lat?: number;
  lng?: number;
}

export interface DateResolutionInput {
  dateReference: string;
  createdAt: string;
  timezone: string;
}

export interface ResolvedDate {
  status: 'resolved' | 'unresolved';
  serviceDate?: string;
  reason?: string;
}

export interface DateReferencesInput {
  dateReferences: string[];
  createdAt: string;
  timezone: string;
}

export interface OverrideShape {
  serviceDate: string;
  isClosed: boolean;
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
  endsNextDay: boolean;
  location?: OverrideLocation | null;
}

export interface ValidationOutcome {
  valid: boolean;
  reason?: string;
}

export type OverrideSource = 'manual' | 'admin' | 'facebook';

export interface WriteOverrideArgs {
  truckId: string;
  shape: OverrideShape;
  source: OverrideSource;
  sourcePostId: string | null;
  timezone: string;
  now: string;
  sourcePostCreatedAt?: string | null;
}

export interface WriteOverrideResult {
  success: boolean;
  error?: string;
  blockedBySource?: OverrideSource;
  updatedAt?: string | null;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function isValidTimezone(timezone: string): boolean {
  return isValidTimezoneCached(timezone);
}

export function dateKeyInTimezone(createdAt: string, timezone: string): string | null {
  return dateKeyInTimezoneCached(createdAt, timezone);
}

function parseDateKey(dateKey: string): Date | null {
  const match = dateKey.match(ISO_DATE);
  if (!match) return null;

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
    ? date
    : null;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

function parseExplicitDate(reference: string, fallbackYear: number): string | null {
  const normalized = reference.toLowerCase().replaceAll(ORDINAL_SUFFIXES, '$1').trim();

  const isoMatch = normalized.match(LOOSE_ISO_DATE);
  if (isoMatch) return toDateKey(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));

  const slashIsoMatch = normalized.match(YEAR_FIRST_SLASH_DATE);
  if (slashIsoMatch) {
    return toDateKey(Number(slashIsoMatch[1]), Number(slashIsoMatch[2]), Number(slashIsoMatch[3]));
  }

  const numericMatch = normalized.match(MONTH_DAY_SLASH_DATE);
  if (numericMatch) {
    const year = numericMatch[3]
      ? numericMatch[3].length === 2
        ? 2000 + Number(numericMatch[3])
        : Number(numericMatch[3])
      : fallbackYear;
    return toDateKey(year, Number(numericMatch[1]), Number(numericMatch[2]));
  }

  const monthMatch = normalized.match(MONTH_NAME_DATE);
  if (!monthMatch) return null;

  const month = MONTH_INDEX[monthMatch[1].replace('.', '')];
  if (!month) return null;
  const year = monthMatch[3] ? Number(monthMatch[3]) : fallbackYear;
  return toDateKey(year, month, Number(monthMatch[2]));
}

function toDateKey(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return formatDateKey(date);
}

export function resolveServiceDate(input: DateResolutionInput): ResolvedDate {
  const dateReference = input.dateReference.trim().toLowerCase();
  const createdAt = new Date(input.createdAt);
  const timezone = input.timezone.trim();

  if (!dateReference || Number.isNaN(createdAt.getTime()) || !timezone) {
    return { status: 'unresolved', reason: 'Missing date reference, created time, or timezone' };
  }
  if (!isValidTimezone(timezone)) {
    return { status: 'unresolved', reason: 'Invalid timezone' };
  }

  const localDate = dateKeyInTimezone(input.createdAt, timezone);
  if (!localDate) return { status: 'unresolved', reason: 'Invalid created time' };

  if (dateReference === 'today') {
    return { status: 'resolved', serviceDate: localDate };
  }
  if (dateReference === 'tomorrow') {
    return { status: 'resolved', serviceDate: addDays(localDate, 1) };
  }

  const weekdayMatch = dateReference.match(
    THIS_WEEKDAY,
  );
  if (weekdayMatch) {
    const localDateValue = parseDateKey(localDate);
    if (!localDateValue) return { status: 'unresolved', reason: 'Invalid local date' };
    const currentDay = localDateValue.getUTCDay();
    const targetWeekday = normalizeWeekdayReference(weekdayMatch[1]);
    if (!targetWeekday) return { status: 'unresolved', reason: 'Unsupported weekday reference' };
    const targetDay = WEEKDAY_INDEX[targetWeekday];
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    return { status: 'resolved', serviceDate: addDays(localDate, daysUntilTarget) };
  }

  const localYear = Number(localDate.slice(0, 4));
  const explicitDate = parseExplicitDate(dateReference, localYear);
  if (explicitDate && isYearlessDateReference(dateReference) && explicitDate < localDate) {
    const parsedDate = parseDateKey(explicitDate);
    if (!parsedDate) return { status: 'unresolved', reason: 'Invalid explicit date' };
    for (let year = parsedDate.getUTCFullYear() + 1; year <= parsedDate.getUTCFullYear() + 8; year += 1) {
      const nextOccurrence = new Date(Date.UTC(year, parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
      if (
        nextOccurrence.getUTCFullYear() === year &&
        nextOccurrence.getUTCMonth() === parsedDate.getUTCMonth() &&
        nextOccurrence.getUTCDate() === parsedDate.getUTCDate()
      ) {
        return { status: 'resolved', serviceDate: nextOccurrence.toISOString().slice(0, 10) };
      }
    }
    return { status: 'unresolved', reason: 'Unable to resolve next occurrence' };
  }
  return explicitDate
    ? { status: 'resolved', serviceDate: explicitDate }
    : { status: 'unresolved', reason: 'Unsupported date reference' };
}

const WEEKDAY_ALIASES: Record<string, string> = {
  sun: 'sunday',
  sunday: 'sunday',
  mon: 'monday',
  monday: 'monday',
  tue: 'tuesday',
  tues: 'tuesday',
  tuesday: 'tuesday',
  wed: 'wednesday',
  weds: 'wednesday',
  wednesday: 'wednesday',
  thu: 'thursday',
  thurs: 'thursday',
  thursday: 'thursday',
  fri: 'friday',
  friday: 'friday',
  sat: 'saturday',
  saturday: 'saturday',
};

function normalizeWeekdayReference(reference: string): string | null {
  return WEEKDAY_ALIASES[reference.trim().toLowerCase()] ?? null;
}

export function resolveDateReferences(input: DateReferencesInput): ResolvedDate {
  const resolvedDates: string[] = [];
  const weekdayConstraints: string[] = [];

  for (const reference of input.dateReferences) {
    const weekday = normalizeWeekdayReference(reference);
    if (weekday) {
      weekdayConstraints.push(weekday);
      continue;
    }

    const resolved = resolveServiceDate({
      dateReference: reference,
      createdAt: input.createdAt,
      timezone: input.timezone,
    });
    if (resolved.status === 'unresolved' || !resolved.serviceDate) {
      return {
        status: 'unresolved',
        reason: `Date reference could not be resolved: ${reference}`,
      };
    }
    resolvedDates.push(resolved.serviceDate);
  }

  const serviceDates = new Set(resolvedDates);
  if (serviceDates.size > 1 || resolvedDates.length === 0) {
    return {
      status: 'unresolved',
      reason: 'Date references resolve to conflicting service dates',
    };
  }

  const serviceDate = resolvedDates[0];
  const serviceWeekday = weekdayForDateKey(serviceDate);
  if (!serviceWeekday || weekdayConstraints.some((day) => day !== serviceWeekday)) {
    return {
      status: 'unresolved',
      reason: 'Date references resolve to conflicting service dates',
    };
  }

  return { status: 'resolved', serviceDate };
}

function isYearlessDateReference(reference: string): boolean {
  return YEARLESS_DATE.test(reference);
}

export function validateOverrideShape(shape: OverrideShape): ValidationOutcome {
  if (!shape.serviceDate) return { valid: false, reason: 'service_date is required' };

  if (shape.isClosed) {
    if (shape.isAllDay || shape.endsNextDay) {
      return { valid: false, reason: 'Closed override must not be all-day or overnight' };
    }
    if (shape.startTime !== null || shape.endTime !== null) {
      return { valid: false, reason: 'Closed override must not carry times' };
    }
    return { valid: true };
  }

  if (shape.isAllDay) {
    if (shape.endsNextDay) {
      return { valid: false, reason: 'All-day override must not be overnight' };
    }
    if (shape.startTime !== null || shape.endTime !== null) {
      return { valid: false, reason: 'All-day override must not carry times' };
    }
    return { valid: true };
  }

  if (shape.startTime === null || shape.endTime === null) {
    return { valid: false, reason: 'Normal override requires both start and end times' };
  }
  const startTime = normalizeOverrideTime(shape.startTime);
  const endTime = normalizeOverrideTime(shape.endTime);
  if (!startTime || !endTime) {
    return { valid: false, reason: 'Override times must use HH:MM format' };
  }
  if (startTime === endTime) {
    return { valid: false, reason: 'Start and end times must differ' };
  }
  return { valid: true };
}

export function normalizeOverrideTime(value: string): string | null {
  const normalized = value.trim();
  const meridiemMatch = TWELVE_HOUR_TIME.exec(normalized);
  const timeMatch = TWENTY_FOUR_HOUR_TIME.exec(normalized);
  const match = meridiemMatch ?? timeMatch;
  if (!match) return null;
  const rawHour = Number(match[1]);
  const minute = Number(match[2] ?? '00');
  const seconds = meridiemMatch ? 0 : Number(match[3] ?? '00');
  if (minute > 59) return null;
  if (seconds > 59) return null;
  if (meridiemMatch) {
    if (rawHour < 1 || rawHour > 12) return null;
    const hour = rawHour % 12 + (meridiemMatch[3].toLowerCase() === 'pm' ? 12 : 0);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  if (rawHour > 23) return null;
  return `${String(rawHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function isOvernightTimeRange(startTime: string, endTime: string): boolean {
  const start = normalizeOverrideTime(startTime);
  const end = normalizeOverrideTime(endTime);
  if (!start || !end || start === end) return false;
  return start > end;
}

export interface OverrideRow {
  serviceDate: string;
  isClosed: boolean;
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
  endsNextDay: boolean;
  timezone: string;
  location?: OverrideLocation | null;
  sourcePostCreatedAt?: string | null;
}

export type RecurringHours = Record<
  string,
  { open?: string; close?: string; closed?: boolean; endsNextDay?: boolean; location?: string } | undefined
>;

export interface EffectiveHours {
  open: string | null;
  close: string | null;
  isClosed: boolean;
  isAllDay: boolean;
  endsNextDay: boolean;
  source: 'override' | 'recurring';
  location: OverrideLocation | string | null;
  closedReason: 'closed' | 'no_hours' | null;
}

export interface ResolvedScheduleSlice {
  effective: EffectiveHours;
  /** Which layer answered for this date: dated override, generated recurrence, or weekly operating_hours. */
  origin: 'override' | 'recurrence' | 'recurring';
}

export function weekdayForDateKey(dateKey: string): string | null {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  const weekday = Object.entries(WEEKDAY_INDEX).find(([, index]) => index === date.getUTCDay());
  return weekday?.[0] ?? null;
}

export function effectiveHoursForDate(
  dateKey: string,
  _timezone: string,
  recurring: RecurringHours,
  override: OverrideRow | null,
): EffectiveHours {
  if (override) {
    if (override.isClosed) {
      return {
        open: null,
        close: null,
        isClosed: true,
        isAllDay: false,
        endsNextDay: false,
        source: 'override',
        location: override.location ?? null,
        closedReason: 'closed',
      };
    }
    if (override.isAllDay) {
      return {
        open: '00:00',
        close: '23:59',
        isClosed: false,
        isAllDay: true,
        endsNextDay: false,
        source: 'override',
        location: override.location ?? null,
        closedReason: null,
      };
    }
    return {
      open: override.startTime,
      close: override.endTime,
      isClosed: false,
      isAllDay: false,
      endsNextDay: override.endsNextDay,
      source: 'override',
      location: override.location ?? null,
      closedReason: null,
    };
  }

  const weekday = weekdayForDateKey(dateKey);
  const hours = weekday ? recurring[weekday] : undefined;
  if (!hours || hours.closed || !hours.open || !hours.close) {
    return {
      open: null,
      close: null,
      isClosed: true,
      isAllDay: false,
        endsNextDay: false,
        source: 'recurring',
        location: null,
        closedReason: hours?.closed ? 'closed' : 'no_hours',
    };
  }

  return {
    open: hours.open,
    close: hours.close,
    isClosed: false,
    isAllDay: false,
    endsNextDay: hours.endsNextDay === true,
    source: 'recurring',
    location: hours.location ?? null,
    closedReason: null,
  };
}

const SOURCE_PRIORITY: Record<OverrideSource, number> = {
  facebook: 1,
  manual: 2,
  admin: 3,
};

export function isOverrideSource(value: string): value is OverrideSource {
  return value in SOURCE_PRIORITY;
}

export function canOverrideExisting(
  candidate: OverrideSource,
  existing: OverrideSource | null,
): boolean {
  if (existing === null) return true;
  return SOURCE_PRIORITY[candidate] >= SOURCE_PRIORITY[existing];
}

export function canRemoveOverride(role: 'food_truck_owner' | 'admin', source: OverrideSource): boolean {
  return role === 'admin' || source !== 'admin';
}

export function isValidServiceDate(value: string): boolean {
  return parseDateKey(value) !== null;
}

export function buildOverrideInsert(args: WriteOverrideArgs): OverrideInsert {
  return {
    food_truck_id: args.truckId,
    service_date: args.shape.serviceDate,
    is_closed: args.shape.isClosed,
    is_all_day: args.shape.isAllDay,
    start_time: args.shape.startTime ? normalizeOverrideTime(args.shape.startTime) : null,
    end_time: args.shape.endTime ? normalizeOverrideTime(args.shape.endTime) : null,
    ends_next_day: args.shape.endsNextDay,
    timezone: args.timezone,
    source_type: args.source,
    source_post_id: args.sourcePostId,
    location_data: (args.shape.location ?? null) as Json,
    source_post_created_at: args.sourcePostCreatedAt ?? null,
    updated_at: args.now,
  };
}

function allowedExistingSources(candidate: OverrideSource): OverrideSource[] {
  return (Object.keys(SOURCE_PRIORITY) as OverrideSource[]).filter((source) =>
    canOverrideExisting(candidate, source),
  );
}

async function updateAllowedOverride(
  supabase: AdminClient,
  row: OverrideInsert,
  source: OverrideSource,
): Promise<{ updated: boolean; error?: string; updatedAt?: string | null }> {
  let query = supabase
    .from('food_truck_schedule_overrides')
    .update(row)
    .eq('food_truck_id', row.food_truck_id)
    .eq('service_date', row.service_date)
    .in('source_type', allowedExistingSources(source));
  if (source === 'facebook' && row.source_post_created_at) {
    const equalSourcePost = row.source_post_id
      ? `,and(source_post_created_at.eq.${row.source_post_created_at},source_post_id.eq.${row.source_post_id})`
      : '';
    query = query.or(
      `source_post_created_at.is.null,source_post_created_at.lt.${row.source_post_created_at}${equalSourcePost}`,
    );
  }
  const { data, error } = await query
    .select('id, updated_at, source_post_created_at, source_post_id')
    .maybeSingle();

  if (error) return { updated: false, error: error.message };
  return { updated: data !== null, updatedAt: data?.updated_at };
}

async function readExistingSource(
  supabase: AdminClient,
  row: OverrideInsert,
): Promise<OverrideSource | null> {
  const { data, error } = await supabase
    .from('food_truck_schedule_overrides')
    .select('source_type')
    .eq('food_truck_id', row.food_truck_id)
    .eq('service_date', row.service_date)
    .maybeSingle();

  if (error || !data) return null;
  return isOverrideSource(data.source_type) ? data.source_type : null;
}

async function insertOverride(
  supabase: AdminClient,
  row: OverrideInsert,
): Promise<{ success: boolean; conflict: boolean; error?: string; updatedAt?: string | null }> {
  const { data, error } = await supabase
    .from('food_truck_schedule_overrides')
    .insert(row)
    .select('id, updated_at')
    .single();
  if (!error) return { success: true, conflict: false, updatedAt: data?.updated_at };
  return { success: false, conflict: error.code === '23505', error: error.message };
}

export async function writeScheduleOverride(
  supabase: AdminClient,
  args: WriteOverrideArgs,
): Promise<WriteOverrideResult> {
  const validation = validateOverrideShape(args.shape);
  if (!validation.valid) return { success: false, error: validation.reason };
  if (!isValidTimezone(args.timezone)) {
    return { success: false, error: 'A valid IANA timezone is required' };
  }

  const row = buildOverrideInsert(args);
  const update = await updateAllowedOverride(supabase, row, args.source);
  if (update.error) return { success: false, error: update.error };
  if (update.updated) return { success: true, updatedAt: update.updatedAt };

  const insert = await insertOverride(supabase, row);
  if (insert.success) return { success: true, updatedAt: insert.updatedAt };
  if (!insert.conflict) return { success: false, error: insert.error };

  const retry = await updateAllowedOverride(supabase, row, args.source);
  if (retry.error) return { success: false, error: retry.error };
  if (retry.updated) return { success: true, updatedAt: retry.updatedAt };

  const existing = await readExistingSource(supabase, row);
  return {
    success: false,
    error: existing
      ? `Existing ${existing} override takes precedence over ${args.source}`
      : 'Override was created concurrently',
    ...(existing ? { blockedBySource: existing } : {}),
  };
}
