import type { Json } from '@/lib/database.remote.types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';
export type MonthlyMode = 'same_date' | 'ordinal_weekday';

export interface RecurrenceSeries {
  id: string;
  foodTruckId: string;
  frequency: RecurrenceFrequency;
  monthlyMode: MonthlyMode | null;
  startDate: string;
  /** null = repeat forever */
  occurrences: number | null;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  location: { address?: string } | null;
}

export interface RecurrenceOccurrence {
  seriesId: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  location: RecurrenceSeries['location'];
}

const DAY_MS = 86_400_000;

function parseDateKey(dateKey: string): Date | null {
  if (!ISO_DATE.test(dateKey)) return null;
  const date = new Date(`${dateKey}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * True when the given year/month contains the same numeric day.
 * Monthly same-date semantics: months without that day are SKIPPED entirely —
 * never clamped to the month's last day, never shifted earlier.
 */
export function monthContainsDay(year: number, monthIndex: number, day: number): boolean {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate() >= day;
}

function nextMonthlySameDate(from: Date, day: number): Date | null {
  let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  for (let guard = 0; guard < 1200; guard += 1) {
    if (monthContainsDay(cursor.getUTCFullYear(), cursor.getUTCMonth(), day)) {
      const candidate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), day));
      if (candidate.getTime() > from.getTime()) return candidate;
    }
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return null;
}

function nextMonthlyOrdinalWeekday(from: Date, patternDate: Date): Date | null {
  const weekday = patternDate.getUTCDay();
  const ordinal = Math.floor((patternDate.getUTCDate() - 1) / 7);
  let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  for (let guard = 0; guard < 1200; guard += 1) {
    const firstOfMonthWeekday = cursor.getUTCDay();
    const offset = (weekday - firstOfMonthWeekday + 7) % 7;
    const candidateDay = 1 + offset + ordinal * 7;
    const daysInMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
    if (candidateDay <= daysInMonth) {
      const candidate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), candidateDay));
      if (candidate.getTime() > from.getTime()) return candidate;
    }
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return null;
}

export function nextOccurrenceDate(
  frequency: RecurrenceFrequency,
  monthlyMode: MonthlyMode | null,
  previous: Date,
  patternStart: Date,
): Date | null {
  if (frequency === 'daily') {
    return new Date(previous.getTime() + DAY_MS);
  }
  if (frequency === 'weekly') {
    return new Date(previous.getTime() + 7 * DAY_MS);
  }
  return monthlyMode === 'ordinal_weekday'
    ? nextMonthlyOrdinalWeekday(previous, patternStart)
    : nextMonthlySameDate(previous, patternStart.getUTCDate());
}

/**
 * Expand a recurrence series into concrete occurrences within [from, to]
 * (inclusive date keys). The start date counts as occurrence #1. Months
 * without the numeric day are skipped for same-date monthly series.
 */
export function expandRecurrence(
  series: RecurrenceSeries,
  from: string,
  to: string,
): RecurrenceOccurrence[] {
  const start = parseDateKey(series.startDate);
  const windowTo = parseDateKey(to);
  if (!start || !windowTo) return [];

  const limit = series.occurrences ?? Number.POSITIVE_INFINITY;
  if (limit < 1) return [];

  const occurrences: RecurrenceOccurrence[] = [];
  // Walk from the series start so skipping (short months) and the occurrence
  // counter (start = #1) stay correct regardless of where the window begins.
  let current = start;
  let index = 1;
  while (index <= limit) {
    const key = dateKey(current);
    if (key > to) break;
    if (key >= from) {
      occurrences.push({
        seriesId: series.id,
        serviceDate: key,
        startTime: series.startTime,
        endTime: series.endTime,
        endsNextDay: series.endsNextDay,
        location: series.location,
      });
    }
    const next = nextOccurrenceDate(series.frequency, series.monthlyMode, current, start);
    if (!next) break;
    current = next;
    index += 1;
  }
  return occurrences;
}

export interface RecurrenceRow {
  id: string;
  food_truck_id: string;
  frequency: string;
  monthly_mode: string | null;
  start_date: string;
  occurrences: number | null;
  start_time: string | null;
  end_time: string | null;
  ends_next_day: boolean | null;
  location_data: Json | null;
}

export function toRecurrenceSeries(row: RecurrenceRow): RecurrenceSeries | null {
  if (row.frequency !== 'daily' && row.frequency !== 'weekly' && row.frequency !== 'monthly') {
    return null;
  }
  if (row.monthly_mode !== null && row.monthly_mode !== 'same_date' && row.monthly_mode !== 'ordinal_weekday') {
    return null;
  }
  if (!row.start_time || !row.end_time) return null;
  const location =
    typeof row.location_data === 'object' && row.location_data !== null && 'address' in row.location_data
      ? (row.location_data as { address?: string })
      : null;
  return {
    id: row.id,
    foodTruckId: row.food_truck_id,
    frequency: row.frequency,
    monthlyMode: row.monthly_mode,
    startDate: row.start_date,
    occurrences: row.occurrences,
    startTime: row.start_time,
    endTime: row.end_time,
    endsNextDay: row.ends_next_day === true,
    location,
  };
}

export function describeMonthlyChoice(
  startDate: string,
  mode: MonthlyMode,
): string {
  const start = parseDateKey(startDate);
  if (!start) return '';
  if (mode === 'same_date') {
    const day = start.getUTCDate();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    return `${day}${suffix} of each month`;
  }
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][start.getUTCDay()];
  const ordinalName = ['First', 'Second', 'Third', 'Fourth', 'Fifth'][Math.floor((start.getUTCDate() - 1) / 7)];
  return `${ordinalName} ${weekday}`;
}

export function describeMonthlySkipNote(startDate: string, mode: MonthlyMode): string | null {
  if (mode !== 'same_date') return null;
  const start = parseDateKey(startDate);
  if (!start) return null;
  const day = start.getUTCDate();
  return day > 28 ? `Months without a ${day}${day === 29 ? 'th' : day === 30 ? 'th' : 'st'} are skipped.` : null;
}