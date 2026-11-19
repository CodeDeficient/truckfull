import type { Database } from '@/lib/database.remote.types';
import type {
  CurrentDayScheduleOverride,
  CurrentDayScheduleRecurrence,
} from '@/lib/services/currentDaySchedule';
import { expandRecurrence, toRecurrenceSeries } from '@/lib/services/scheduleRecurrence';

type RecurrenceTableRow = Database['public']['Tables']['food_truck_recurrences']['Row'];

export type PublicRecurrenceRow = Pick<
  RecurrenceTableRow,
  | 'id'
  | 'food_truck_id'
  | 'frequency'
  | 'monthly_mode'
  | 'start_date'
  | 'occurrences'
  | 'start_time'
  | 'end_time'
  | 'ends_next_day'
  | 'location_data'
>;

export interface PublicScheduleRecurrencesResponse {
  readonly recurrences: Record<string, CurrentDayScheduleRecurrence>;
  readonly overrides?: readonly CurrentDayScheduleOverride[];
}

// Shared request-body limit for POST /api/trucks/current-schedules: the route
// validates against it and the client batches at it. Direct PostgREST reads
// filter ids in the URL and use TRUCK_ID_QUERY_CHUNK_SIZE instead.
export const RECURRENCE_API_BATCH_LIMIT = 500;

// Current local dates can differ by two days across UTC-11 through UTC+14;
// including each truck's previous date requires four inclusive date keys.
const MAX_PUBLIC_SCHEDULE_RANGE_MS = 3 * 86_400_000;

const MAX_PUBLIC_OVERRIDE_RANGE_MS = 10 * 86_400_000;

export function currentDayRecurrenceKey(foodTruckId: string, serviceDate: string): string {
  return `${foodTruckId}:${serviceDate}`;
}

function isBoundedDateRange(fromDate: string, toDate: string, maxRangeMs: number): boolean {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Number.isFinite(from) && Number.isFinite(to) && to >= from && to - from <= maxRangeMs;
}

export function isBoundedPublicScheduleDateRange(fromDate: string, toDate: string): boolean {
  return isBoundedDateRange(fromDate, toDate, MAX_PUBLIC_SCHEDULE_RANGE_MS);
}

export function isBoundedPublicOverrideDateRange(
  fromDate: string,
  toDate: string,
  overridesToDate: string,
): boolean {
  return (
    overridesToDate >= toDate &&
    isBoundedDateRange(fromDate, overridesToDate, MAX_PUBLIC_OVERRIDE_RANGE_MS)
  );
}

export function expandPublicScheduleRecurrences(
  rows: readonly PublicRecurrenceRow[],
  fromDate: string,
  toDate: string,
): Record<string, CurrentDayScheduleRecurrence> {
  const occurrences: Record<string, CurrentDayScheduleRecurrence> = {};
  // Rows are ordered by start date, creation time, and ID. Overwrite semantics
  // therefore make the newest deterministic series win an overlapping date.
  for (const row of rows) {
    const series = toRecurrenceSeries(row);
    if (!series) continue;
    for (const occurrence of expandRecurrence(series, fromDate, toDate)) {
      occurrences[currentDayRecurrenceKey(row.food_truck_id, occurrence.serviceDate)] = {
        food_truck_id: row.food_truck_id,
        service_date: occurrence.serviceDate,
        start_time: occurrence.startTime,
        end_time: occurrence.endTime,
        ends_next_day: occurrence.endsNextDay,
        location_data: series.location ?? null,
      };
    }
  }
  return occurrences;
}
