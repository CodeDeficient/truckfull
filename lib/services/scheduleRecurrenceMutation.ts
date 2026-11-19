import type { Json } from '@/lib/database.remote.types';
import { isOvernightTimeRange, normalizeOverrideTime } from '@/lib/services/scheduleOverride';
import type { MonthlyMode, RecurrenceFrequency } from '@/lib/services/scheduleRecurrence';

interface MutationError { readonly message: string }
interface QueryResult { readonly data: unknown; readonly error: MutationError | null }
interface MutationQuery extends PromiseLike<QueryResult> {
  eq(column: string, value: unknown): MutationQuery;
  neq(column: string, value: unknown): MutationQuery;
  select(columns?: string): MutationQuery;
  single(): Promise<QueryResult>;
  maybeSingle(): Promise<QueryResult>;
}
export interface RecurrenceMutationClient {
  from(table: string): {
    insert(row: Record<string, unknown>): MutationQuery;
    update(row: Record<string, unknown>): MutationQuery;
    delete(): MutationQuery;
  };
}

interface StoreWrite<T> { readonly data: T | null; readonly error: string | null }
export interface RecurrenceMutationStore {
  insertRecurrence(row: Record<string, unknown>): Promise<StoreWrite<{ id: string }>>;
  updateRecurrence(id: string, truckId: string, row: Record<string, unknown>): Promise<StoreWrite<{ id: string }>>;
  deleteOverride(truckId: string, date: string, canDeleteAdmin: boolean): Promise<{ deleted: boolean; error: string | null }>;
  deleteRecurrence(id: string, truckId: string): Promise<{ error: string | null }>;
}

export interface SaveRecurrenceSeriesInput {
  readonly truckId: string;
  readonly seriesId?: string;
  readonly frequency: RecurrenceFrequency;
  readonly monthlyMode: MonthlyMode | null;
  readonly startDate: string;
  readonly occurrences: number | null;
  readonly startTime: string;
  readonly endTime: string;
  readonly timezone: string;
  readonly locationData: Json | null;
  readonly convertedOverrideDate?: string;
  readonly canDeleteAdminOverride?: boolean;
}

export type SaveRecurrenceSeriesResult =
  | { readonly success: true; readonly id: string }
  | { readonly success: false; readonly error: string };

function errorMessage(error: unknown): string | null {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : null;
}

export function createSupabaseRecurrenceStore(client: RecurrenceMutationClient): RecurrenceMutationStore {
  return {
    async insertRecurrence(row) {
      const result = await client.from('food_truck_recurrences').insert(row).select('id').single();
      const data = result.data as { id?: unknown } | null;
      return { data: typeof data?.id === 'string' ? { id: data.id } : null, error: errorMessage(result.error) };
    },
    async updateRecurrence(id, truckId, row) {
      const result = await client.from('food_truck_recurrences').update(row)
        .eq('id', id).eq('food_truck_id', truckId).select('id').maybeSingle();
      const data = result.data as { id?: unknown } | null;
      return { data: typeof data?.id === 'string' ? { id: data.id } : null, error: errorMessage(result.error) };
    },
    async deleteOverride(truckId, date, canDeleteAdmin) {
      let query = client.from('food_truck_schedule_overrides').delete()
        .eq('food_truck_id', truckId).eq('service_date', date);
      if (!canDeleteAdmin) query = query.neq('source_type', 'admin');
      const result = await query.select('id');
      const rows = Array.isArray(result.data) ? result.data : [];
      return { deleted: rows.length > 0, error: errorMessage(result.error) };
    },
    async deleteRecurrence(id, truckId) {
      const result = await client.from('food_truck_recurrences').delete()
        .eq('id', id).eq('food_truck_id', truckId);
      return { error: errorMessage(result.error) };
    },
  };
}

function recurrenceRow(input: SaveRecurrenceSeriesInput, start: string, end: string): Record<string, unknown> {
  return {
    food_truck_id: input.truckId,
    frequency: input.frequency,
    monthly_mode: input.frequency === 'monthly' ? (input.monthlyMode ?? 'same_date') : null,
    start_date: input.startDate,
    occurrences: input.occurrences,
    start_time: start,
    end_time: end,
    ends_next_day: isOvernightTimeRange(start, end),
    timezone: input.timezone,
    location_data: input.locationData,
  };
}

export async function saveRecurrenceSeries(
  store: RecurrenceMutationStore,
  input: SaveRecurrenceSeriesInput,
): Promise<SaveRecurrenceSeriesResult> {
  const start = normalizeOverrideTime(input.startTime);
  const end = normalizeOverrideTime(input.endTime);
  if (!start || !end) return { success: false, error: 'Schedule times must use HH:MM format' };
  if (start === end) return { success: false, error: 'Start and end times must differ' };
  const row = recurrenceRow(input, start, end);
  if (input.seriesId) {
    const update = await store.updateRecurrence(input.seriesId, input.truckId, row);
    if (update.error || !update.data) return { success: false, error: 'Unable to update repeating schedule' };
    return { success: true, id: update.data.id };
  }
  const insert = await store.insertRecurrence(row);
  if (insert.error || !insert.data) return { success: false, error: 'Unable to save repeating schedule' };
  if (!input.convertedOverrideDate) return { success: true, id: insert.data.id };
  const removal = await store.deleteOverride(
    input.truckId,
    input.convertedOverrideDate,
    input.canDeleteAdminOverride === true,
  );
  if (!removal.error && removal.deleted) return { success: true, id: insert.data.id };
  await store.deleteRecurrence(insert.data.id, input.truckId);
  return { success: false, error: 'Unable to convert date-specific schedule' };
}
