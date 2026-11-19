import {
  dateKeyInTimezone,
  effectiveHoursForDate,
  type OverrideLocation,
  type EffectiveHours,
  type RecurringHours,
} from '@/lib/services/scheduleOverride';
import { formatHourMinuteInTimezone } from '@/lib/services/timezoneFormatter';
import type { DailyOperatingHours } from '@/lib/types';

export interface CurrentDayTruckInput {
  readonly timezone?: string | null;
  readonly operating_hours?: RecurringHours | null;
}

export interface CurrentDayScheduleOverride {
  readonly food_truck_id: string;
  readonly service_date: string;
  readonly is_closed: boolean;
  readonly is_all_day: boolean;
  readonly start_time: string | null;
  readonly end_time: string | null;
  readonly ends_next_day: boolean;
  readonly timezone: string;
  readonly location_data: OverrideLocation | null;
}

export interface CurrentDayScheduleRecurrence {
  readonly food_truck_id: string;
  readonly service_date: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly ends_next_day: boolean;
  readonly location_data?: OverrideLocation | null;
}

export interface CurrentDaySchedule {
  readonly serviceDate: string;
  readonly hoursServiceDate: string;
  readonly timezone: string;
  readonly hours: DailyOperatingHours;
  readonly location: OverrideLocation | null;
}

export function buildCurrentDaySchedule(
  truck: CurrentDayTruckInput,
  now: Date,
  override: CurrentDayScheduleOverride | null,
  previousOverride: CurrentDayScheduleOverride | null = null,
  recurrence: CurrentDayScheduleRecurrence | null = null,
  previousRecurrence: CurrentDayScheduleRecurrence | null = null,
): CurrentDaySchedule | null {
  const timezone = truck.timezone?.trim();
  if (!timezone) return null;

  const serviceDate = dateKeyInTimezone(now.toISOString(), timezone);
  if (!serviceDate) return null;

  const matchingOverride = override?.service_date === serviceDate ? toOverrideRow(override) : null;
  const matchingRecurrence =
    recurrence?.service_date === serviceDate ? toRecurrenceRow(recurrence, timezone) : null;
  const currentEffective = effectiveHoursForDate(
    serviceDate,
    timezone,
    truck.operating_hours ?? {},
    matchingOverride ?? matchingRecurrence,
  );
  const previousServiceDate = previousDateKey(serviceDate);
  const previousRow = previousServiceDate
    ? scheduleRowForDate(previousOverride, previousRecurrence, previousServiceDate, timezone)
    : null;
  const previousEffective = previousServiceDate
    ? effectiveHoursForDate(previousServiceDate, timezone, truck.operating_hours ?? {}, previousRow)
    : null;
  const usesPreviousHours =
    !matchingOverride && !!previousEffective && isActiveOvernight(previousEffective, now, timezone);
  const effective = usesPreviousHours && previousEffective ? previousEffective : currentEffective;
  // Only a dated override or recurrence may relocate the truck today; closed
  // events and plain weekly hours never provide a location (hours.location on
  // weekly entries is legacy display text, not a dated position).
  const governingRow = usesPreviousHours ? previousRow : (matchingOverride ?? matchingRecurrence);
  const governingLocation =
    governingRow && !governingRow.isClosed ? (governingRow.location ?? null) : null;

  return {
    serviceDate,
    hoursServiceDate: usesPreviousHours ? (previousServiceDate ?? serviceDate) : serviceDate,
    timezone,
    hours: {
      open: effective.open ?? undefined,
      close: effective.close ?? undefined,
      closed: effective.isClosed,
      isAllDay: effective.isAllDay,
      endsNextDay: effective.endsNextDay,
    },
    location: governingLocation,
  };
}

function isActiveOvernight(effective: EffectiveHours | null, now: Date, timezone: string): boolean {
  if (!effective?.endsNextDay || effective.isClosed || !effective.open || !effective.close) {
    return false;
  }
  const { hour, minute } = formatHourMinuteInTimezone(now, timezone);
  const [endHour, endMinute] = effective.close.split(':').map(Number);
  return hour * 60 + minute <= endHour * 60 + endMinute;
}

export function previousDateKey(dateKey: string): string | null {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function addDaysToDateKey(dateKey: string, days: number): string | null {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function chunkTruckIds(ids: readonly string[], chunkSize: number): string[][] {
  if (chunkSize < 1) return [];
  const uniqueIds = [...new Set(ids)];
  const chunks: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    chunks.push(uniqueIds.slice(index, index + chunkSize));
  }
  return chunks;
}

function toOverrideRow(override: CurrentDayScheduleOverride) {
  return {
    serviceDate: override.service_date,
    isClosed: override.is_closed,
    isAllDay: override.is_all_day,
    startTime: override.start_time,
    endTime: override.end_time,
    endsNextDay: override.ends_next_day,
    timezone: override.timezone,
    location: override.location_data,
  };
}

function toRecurrenceRow(recurrence: CurrentDayScheduleRecurrence, timezone: string) {
  return {
    serviceDate: recurrence.service_date,
    isClosed: false,
    isAllDay: false,
    startTime: recurrence.start_time,
    endTime: recurrence.end_time,
    endsNextDay: recurrence.ends_next_day,
    timezone,
    location: recurrence.location_data ?? null,
  };
}

function scheduleRowForDate(
  override: CurrentDayScheduleOverride | null,
  recurrence: CurrentDayScheduleRecurrence | null,
  serviceDate: string,
  timezone: string,
) {
  if (override?.service_date === serviceDate) return toOverrideRow(override);
  if (recurrence?.service_date === serviceDate) return toRecurrenceRow(recurrence, timezone);
  return null;
}
