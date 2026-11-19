import type {
  CurrentDayScheduleOverride,
  CurrentDayScheduleRecurrence,
} from '@/lib/services/currentDaySchedule';
import type { OverrideLocation } from '@/lib/services/scheduleOverride';
import {
  dateKeyInTimezoneCached,
  formatHourMinuteInTimezone,
} from '@/lib/services/timezoneFormatter';

export interface NextStop {
  readonly serviceDate: string;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly isAllDay: boolean;
  readonly place: string | null;
}

export interface NextStopInput {
  readonly overrides: readonly CurrentDayScheduleOverride[];
  readonly recurrences: readonly CurrentDayScheduleRecurrence[];
  readonly today: string;
  readonly nowMinutes: number;
}

export const NEXT_STOP_WINDOW_DAYS = 14;

interface Candidate {
  readonly stop: NextStop;
  readonly endsNextDay: boolean;
}

function toMinutes(time: string | null): number | null {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

export function describeStopPlace(location: OverrideLocation | null | undefined): string | null {
  if (!location) return null;
  const address = location.fuzzy ? '' : (location.address?.trim() ?? '');
  if (address) return address;
  const city = location.city?.trim();
  const state = location.state?.trim();
  if (city && state) return `${city}, ${state}`;
  return city || null;
}

function fromOverride(override: CurrentDayScheduleOverride): Candidate | null {
  if (override.is_closed) return null;
  if (!override.is_all_day && !override.start_time) return null;
  return {
    stop: {
      serviceDate: override.service_date,
      startTime: override.is_all_day ? null : override.start_time,
      endTime: override.is_all_day ? null : override.end_time,
      isAllDay: override.is_all_day,
      place: describeStopPlace(override.location_data),
    },
    endsNextDay: override.ends_next_day,
  };
}

function fromRecurrence(recurrence: CurrentDayScheduleRecurrence): Candidate {
  return {
    stop: {
      serviceDate: recurrence.service_date,
      startTime: recurrence.start_time,
      endTime: recurrence.end_time,
      isAllDay: false,
      place: describeStopPlace(recurrence.location_data),
    },
    endsNextDay: recurrence.ends_next_day,
  };
}

function hasEnded(candidate: Candidate, today: string, nowMinutes: number): boolean {
  const { stop } = candidate;
  if (stop.serviceDate !== today || stop.isAllDay || candidate.endsNextDay) return false;
  const end = toMinutes(stop.endTime);
  return end !== null && end <= nowMinutes;
}

export function pickNextStop(input: NextStopInput): NextStop | null {
  const overridesByDate = new Map(input.overrides.map((item) => [item.service_date, item]));
  const recurrencesByDate = new Map(input.recurrences.map((item) => [item.service_date, item]));
  const dates = [...new Set([...overridesByDate.keys(), ...recurrencesByDate.keys()])]
    .filter((date) => date >= input.today)
    .sort();

  for (const date of dates) {
    const override = overridesByDate.get(date);
    const recurrence = recurrencesByDate.get(date);
    let candidate: Candidate | null = null;
    if (override) candidate = fromOverride(override);
    else if (recurrence) candidate = fromRecurrence(recurrence);
    if (candidate && !hasEnded(candidate, input.today, input.nowMinutes)) return candidate.stop;
  }
  return null;
}

export function isNextStopOver(stop: NextStop, timezone: string | null, now: Date): boolean {
  if (!timezone) return false;
  let today: string | null;
  let nowMinutes: number;
  try {
    today = dateKeyInTimezoneCached(now.toISOString(), timezone);
    const { hour, minute } = formatHourMinuteInTimezone(now, timezone);
    nowMinutes = hour * 60 + minute;
  } catch {
    return false;
  }
  if (!today || !Number.isFinite(nowMinutes) || stop.serviceDate > today) return false;
  if (stop.serviceDate < today) return true;
  if (stop.isAllDay) return false;
  const start = toMinutes(stop.startTime);
  const end = toMinutes(stop.endTime);
  if (end === null || (start !== null && end <= start)) return false;
  return end <= nowMinutes;
}
