import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type {
  CurrentDayScheduleOverride,
  CurrentDayScheduleRecurrence,
} from '@/lib/services/currentDaySchedule';
import {
  fetchOverridesInRange,
  fetchRecurrenceOccurrences,
  type ScheduleQueryClient,
} from '@/lib/services/truckScheduleQueries';

export async function fetchPublicScheduleRecurrences(
  truckIds: readonly string[],
  fromDate: string,
  toDate: string,
): Promise<Record<string, CurrentDayScheduleRecurrence>> {
  if (truckIds.length === 0) return {};
  // The generated Supabase builder type cannot structurally satisfy the minimal
  // ScheduleQueryClient shape (instantiation-depth limits), but this call chain
  // is exactly select().in().lte().order() at runtime.
  return fetchRecurrenceOccurrences(
    getSupabaseAdmin() as unknown as ScheduleQueryClient,
    truckIds,
    fromDate,
    toDate,
  );
}

export async function fetchPublicScheduleOverrides(
  truckIds: readonly string[],
  fromDate: string,
  toDate: string,
): Promise<CurrentDayScheduleOverride[]> {
  if (truckIds.length === 0) return [];
  return fetchOverridesInRange(
    getSupabaseAdmin() as unknown as ScheduleQueryClient,
    truckIds,
    fromDate,
    toDate,
  );
}
