import {
  chunkTruckIds,
  type CurrentDayScheduleOverride,
  type CurrentDayScheduleRecurrence,
} from '@/lib/services/currentDaySchedule';
import {
  RECURRENCE_API_BATCH_LIMIT,
  expandPublicScheduleRecurrences,
  type PublicRecurrenceRow,
  type PublicScheduleRecurrencesResponse,
} from '@/lib/services/publicScheduleRecurrence';
import { isRecurrenceTableUnavailable } from '@/lib/services/scheduleRecurrenceLoad';

/**
 * PostgREST echoes the request URL in the `content-location` response header, so
 * a `.in('food_truck_id', ...)` filter over 449 active UUIDs produced a
 * ~17.8k-character URL and an equally large response header. Node's undici client
 * refuses to parse response headers beyond 16 KiB, which failed the entire
 * lookup. 100 ids keeps both the URL and the echoed header near 4k characters.
 */
export const TRUCK_ID_QUERY_CHUNK_SIZE = 100;

const OVERRIDE_SELECT_FIELDS =
  'food_truck_id, service_date, is_closed, is_all_day, start_time, end_time, ends_next_day, timezone, location_data';

const RECURRENCE_SELECT_FIELDS =
  'id, food_truck_id, frequency, monthly_mode, start_date, occurrences, start_time, end_time, ends_next_day, location_data';

export interface ScheduleQueryError {
  message: string;
  code?: string;
}

export interface ScheduleQueryResult {
  data: unknown[] | null;
  error: ScheduleQueryError | null;
}

/**
 * Minimal structural view of the PostgREST builder chains used by the public
 * schedule reads: from().select().in()... awaiting the builder resolves the
 * query. The generated Supabase builder types cannot structurally satisfy this
 * (instantiation-depth limits), so each call site casts once — the same pattern
 * the owner schedule route already uses for RecurrenceQueryClient.
 */
export interface ScheduleQueryBuilder extends PromiseLike<ScheduleQueryResult> {
  select(fields?: string): ScheduleQueryBuilder;
  in(column: string, values: readonly string[]): ScheduleQueryBuilder;
  gte(column: string, value: string): ScheduleQueryBuilder;
  lte(column: string, value: string): ScheduleQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): ScheduleQueryBuilder;
}

export interface ScheduleQueryClient {
  from(table: string): ScheduleQueryBuilder;
}

export type TruckIdChunkQuery<Row> = (chunk: readonly string[]) => Promise<Row[]>;

/**
 * Run one query per id chunk and merge the rows in chunk order.
 *
 * Each truck id lands in exactly one chunk, so every row for a given truck keeps
 * its single-query relative ordering and per-truck overwrite semantics.
 * Promise.all makes the batch all-or-nothing: one failing chunk rejects the
 * whole lookup rather than silently returning the chunks that succeeded.
 */
export async function fetchInTruckIdChunks<Row>(
  truckIds: readonly string[],
  queryChunk: TruckIdChunkQuery<Row>,
  chunkSize: number = TRUCK_ID_QUERY_CHUNK_SIZE,
): Promise<Row[]> {
  const chunks = chunkTruckIds(truckIds, chunkSize);
  if (chunks.length === 0) return [];
  const results = await Promise.all(chunks.map((chunk) => queryChunk(chunk)));
  return results.flat();
}

/**
 * PostgREST surfaces failures as plain objects, but callers log them and the
 * missing-table check reads `message`/`code`. Wrap them in an Error so a thrown
 * failure carries a stack while keeping both fields intact.
 */
function toQueryError(error: ScheduleQueryError): Error {
  return Object.assign(new Error(error.message), { code: error.code });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toCurrentDayOverride(row: unknown): CurrentDayScheduleOverride[] {
  if (!isRecord(row)) return [];
  if (
    typeof row.food_truck_id !== 'string' ||
    typeof row.service_date !== 'string' ||
    typeof row.is_closed !== 'boolean' ||
    typeof row.is_all_day !== 'boolean' ||
    typeof row.ends_next_day !== 'boolean' ||
    typeof row.timezone !== 'string'
  ) {
    return [];
  }
  return [
    {
      food_truck_id: row.food_truck_id,
      service_date: row.service_date,
      is_closed: row.is_closed,
      is_all_day: row.is_all_day,
      start_time: typeof row.start_time === 'string' ? row.start_time : null,
      end_time: typeof row.end_time === 'string' ? row.end_time : null,
      ends_next_day: row.ends_next_day,
      timezone: row.timezone,
      location_data: isRecord(row.location_data)
        ? {
            address:
              typeof row.location_data.address === 'string' ? row.location_data.address : undefined,
            city: typeof row.location_data.city === 'string' ? row.location_data.city : undefined,
            state:
              typeof row.location_data.state === 'string' ? row.location_data.state : undefined,
            fuzzy: row.location_data.fuzzy === true,
            lat: typeof row.location_data.lat === 'number' ? row.location_data.lat : undefined,
            lng: typeof row.location_data.lng === 'number' ? row.location_data.lng : undefined,
          }
        : null,
    },
  ];
}

export async function fetchOverridesInRange(
  client: ScheduleQueryClient,
  truckIds: readonly string[],
  fromDate: string,
  toDate: string,
): Promise<CurrentDayScheduleOverride[]> {
  const rows = await fetchInTruckIdChunks(truckIds, async (chunk) => {
    const { data, error } = await client
      .from('food_truck_schedule_overrides')
      .select(OVERRIDE_SELECT_FIELDS)
      .in('food_truck_id', chunk)
      .gte('service_date', fromDate)
      .lte('service_date', toDate);
    if (error) throw toQueryError(error);
    return data ?? [];
  });
  return rows.flatMap((row) => toCurrentDayOverride(row));
}

export interface RecurrenceApiRequest {
  truckIds: readonly string[];
  fromDate: string;
  toDate: string;
  overridesToDate?: string;
}

export interface PublicSchedules {
  recurrences: Record<string, CurrentDayScheduleRecurrence>;
  overrides: CurrentDayScheduleOverride[];
}

export type RecurrenceApiFetch = (
  request: RecurrenceApiRequest,
) => Promise<PublicScheduleRecurrencesResponse>;

/**
 * Read recurrences and dated overrides through the service-role API route. The
 * route validates `truckIds` at 500 and fans the ids out into 100-id PostgREST
 * queries itself, so the client batches at the same 500 to keep one request per
 * full truck list. Promise.all keeps the batch all-or-nothing.
 */
export async function fetchSchedulesViaApi(
  fetchPage: RecurrenceApiFetch,
  truckIds: readonly string[],
  fromDate: string,
  toDate: string,
  overridesToDate?: string,
): Promise<PublicSchedules> {
  const responses = await fetchInTruckIdChunks(
    truckIds,
    async (chunk) => [await fetchPage({ truckIds: chunk, fromDate, toDate, overridesToDate })],
    RECURRENCE_API_BATCH_LIMIT,
  );
  return {
    recurrences: Object.assign({}, ...responses.map((body) => body.recurrences ?? {})),
    overrides: responses.flatMap((body) => [...(body.overrides ?? [])]),
  };
}

export async function fetchRecurrenceOccurrences(
  client: ScheduleQueryClient,
  truckIds: readonly string[],
  fromDate: string,
  toDate: string,
): Promise<Record<string, CurrentDayScheduleRecurrence>> {
  try {
    const rows = await fetchInTruckIdChunks(truckIds, async (chunk) => {
      const { data, error } = await client
        .from('food_truck_recurrences')
        .select(RECURRENCE_SELECT_FIELDS)
        .in('food_truck_id', chunk)
        .lte('start_date', toDate)
        .order('start_date', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw toQueryError(error);
      return (data ?? []) as PublicRecurrenceRow[];
    });
    return expandPublicScheduleRecurrences(rows, fromDate, toDate);
  } catch (error) {
    // Recurrences are an additive source: a database that has not received the
    // migration yet degrades to legacy schedules instead of failing the read.
    if (isRecurrenceTableUnavailable(error as ScheduleQueryError | null)) return {};
    throw error;
  }
}
