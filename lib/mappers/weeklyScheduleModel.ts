import type { DayOfWeek, FoodTruckDomain, FoodTruckOperatingHours } from '@/lib/types';
import { isOvernightTimeRange, normalizeOverrideTime } from '@/lib/services/scheduleOverride';

const DAY_ORDER: readonly DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export interface WeeklyDayModel {
  readonly day: DayOfWeek;
  readonly label: string;
  readonly isOpen: boolean;
  readonly open?: string;
  readonly close?: string;
  readonly location?: string;
}

/**
 * Build a complete Monday-Sunday week model from persisted operating hours.
 * Missing or `closed:true` days are returned as closed entries so the calendar
 * always renders seven columns.
 */
export function buildWeeklySchedule(
  hours: FoodTruckOperatingHours | null | undefined,
): WeeklyDayModel[] {
  return DAY_ORDER.map((day) => {
    const entry = hours?.[day];
    const isOpen = isDayOpen(entry);
    return {
      day,
      label: DAY_LABELS[day],
      isOpen,
      open: isOpen ? entry?.open : undefined,
      close: isOpen ? entry?.close : undefined,
      location: isOpen ? readLocation(entry) : undefined,
    };
  });
}

function isDayOpen(
  entry: { open?: string; close?: string; closed?: boolean } | undefined,
): boolean {
  if (!entry) return false;
  if (entry.closed) return false;
  if (!entry.open || !entry.close) return false;
  return true;
}

function readLocation(entry: unknown): string | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  const loc = (entry as { location?: unknown }).location;
  return typeof loc === 'string' && loc.trim() ? loc : undefined;
}

/**
 * Return a new operating-hours object with the given day set to open/close
 * and an optional location. The original object is not mutated.
 */
export function setDayHours(
  hours: FoodTruckOperatingHours | null | undefined,
  day: DayOfWeek,
  open: string,
  close: string,
  location?: string,
): FoodTruckOperatingHours {
  const base: FoodTruckOperatingHours = hours ?? {};
  const normalizedOpen = normalizeOverrideTime(open);
  const normalizedClose = normalizeOverrideTime(close);
  if (!normalizedOpen || !normalizedClose) {
    throw new Error('Schedule times must use HH:MM format');
  }
  if (normalizedOpen === normalizedClose) {
    throw new Error('Start and end times must differ');
  }
  const dayEntry: { open: string; close: string; location?: string; endsNextDay?: boolean } = {
    open: normalizedOpen,
    close: normalizedClose,
  };
  if (isOvernightTimeRange(normalizedOpen, normalizedClose)) dayEntry.endsNextDay = true;
  if (location && location.trim()) dayEntry.location = location.trim();
  return { ...base, [day]: dayEntry };
}

export function normalizeWeeklyScheduleForWrite(hours: FoodTruckOperatingHours): {
  value: FoodTruckOperatingHours | null;
  error: string | null;
} {
  const normalized: FoodTruckOperatingHours = { ...hours };
  for (const day of DAY_ORDER) {
    const entry = hours[day];
    if (!entry || entry.closed) continue;
    const open = entry.open ? normalizeOverrideTime(entry.open) : null;
    const close = entry.close ? normalizeOverrideTime(entry.close) : null;
    if (!open || !close) {
      return { value: null, error: `${DAY_LABELS[day]} requires valid opening and closing times` };
    }
    if (open === close) {
      return { value: null, error: `${DAY_LABELS[day]} opening and closing times must differ` };
    }
    const dayEntry: { open: string; close: string; endsNextDay?: boolean } = {
      ...entry,
      open,
      close,
    };
    if (isOvernightTimeRange(open, close)) {
      dayEntry.endsNextDay = true;
    } else {
      // A same-day rewrite must clear a stale overnight flag from the stored entry.
      delete dayEntry.endsNextDay;
    }
    normalized[day] = dayEntry;
  }
  return { value: normalized, error: null };
}

/**
 * Return a new operating-hours object with the given day marked closed.
 * The original object is not mutated.
 */
export function closeDay(
  hours: FoodTruckOperatingHours | null | undefined,
  day: DayOfWeek,
): FoodTruckOperatingHours {
  const base: FoodTruckOperatingHours = hours ?? {};
  return { ...base, [day]: { closed: true } };
}

/**
 * Format a truck's address into a single display string.
 * Falls back through: street+city+state+zip → current_location.address → undefined.
 */
export function formatTruckLocation(truck: FoodTruckDomain | undefined): string | undefined {
  if (!truck) return undefined;
  const addressParts = [truck.street_address, truck.city, truck.state, truck.zip]
    .map((part) => part?.trim())
    .filter(Boolean);
  if (addressParts.length > 0) return addressParts.join(', ');
  return truck.current_location?.address?.trim() || undefined;
}

/**
 * Build the JSON-serialisable payload body for a schedule update request.
 * Returns `{ operating_hours }` so the caller only needs to stringify and send.
 */
export function buildScheduleUpdatePayload(hours: FoodTruckOperatingHours): {
  operating_hours: FoodTruckOperatingHours;
} {
  return { operating_hours: hours };
}

/**
 * Stamp the canonical manual-source metadata the Facebook arbitration layer
 * (sourceTracker.checkScheduleUpdate) keys on, so a dashboard recurring-hours
 * edit participates in the latest-owner-action-wins contract instead of being
 * silently overwritten by an older Facebook recurring post.
 */
export function withManualScheduleSource<T extends object>(
  payload: T,
  now: string,
): T & { schedule_updated_by: 'manual'; schedule_updated_at: string } {
  return {
    ...payload,
    schedule_updated_by: 'manual' as const,
    schedule_updated_at: now,
  };
}

type WeeklyHoursEntry = { open?: string; close?: string; closed?: boolean } & Record<
  string,
  unknown
>;
type WeeklyHours = { [key: string]: WeeklyHoursEntry | undefined };

function canonicalWeeklyHours(hours: WeeklyHours | null | undefined): string {
  if (!hours || typeof hours !== 'object') return 'null';
  // Key-order-insensitive serialization: Postgres JSONB does not preserve
  // client key order, and day spreads on edit-then-revert reorder keys, so
  // raw JSON.stringify would misreport no-op re-saves as changed hours.
  // Every entry field (times, closed, and per-day location) participates —
  // a location-only edit is still a schedule decision for arbitration.
  return JSON.stringify(
    Object.keys(hours)
      .filter((day) => hours[day] !== undefined && hours[day] !== null)
      .sort()
      .map((day) => {
        const entry = hours[day] as WeeklyHoursEntry;
        const parts = Object.keys(entry)
          .sort()
          .filter((field) => entry[field] !== undefined)
          .map((field) => `${field}:${String(entry[field])}`);
        return `${day}{${parts.join(',')}}`;
      }),
  );
}

export function weeklyHoursChanged(
  prior: WeeklyHours | null | undefined,
  next: WeeklyHours | null | undefined,
): boolean {
  return canonicalWeeklyHours(prior) !== canonicalWeeklyHours(next);
}
