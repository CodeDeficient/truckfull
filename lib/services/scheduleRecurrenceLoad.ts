import type { Database } from '@/lib/database.remote.types';

const MISSING_RECURRENCES_RELATION =
  /relation "?(public\.)?food_truck_recurrences"? does not exist/i;
const RECURRENCES_TABLE_NAME = /(?:public\.)?food_truck_recurrences/i;
const SCHEMA_CACHE_ERROR = /schema cache/i;

type RecurrenceRow = Database['public']['Tables']['food_truck_recurrences']['Row'];

export type RecurrenceQueryError = { message: string; code?: string } | null;

export type RecurrenceQueryResult = {
  data: RecurrenceRow[] | null;
  error: RecurrenceQueryError;
};

export interface RecurrenceQueryClient {
  from(table: string): {
    select(): {
      eq(
        column: string,
        value: string,
      ): {
        lte(
          column: string,
          value: string,
        ): {
          order(column: string, options: { ascending?: boolean }): Promise<RecurrenceQueryResult>;
        };
      };
    };
  };
}

export type RecurrenceLoad = {
  data?: RecurrenceRow[];
  error?: RecurrenceQueryError;
  /** True only when the recurrence table itself does not exist yet. */
  unavailable: boolean;
};

export function isRecurrenceTableUnavailable(error: RecurrenceQueryError): boolean {
  if (!error) return false;
  const code = typeof error.code === 'string' ? error.code : '';
  const missingPostgresRelation =
    code === '42P01' && MISSING_RECURRENCES_RELATION.test(error.message);
  const missingPostgrestRelation =
    code === 'PGRST205' &&
    RECURRENCES_TABLE_NAME.test(error.message) &&
    SCHEMA_CACHE_ERROR.test(error.message);
  return missingPostgresRelation || missingPostgrestRelation;
}

/**
 * Recurrences are an additive schedule source. Databases that have not received
 * the migration yet report either PostgreSQL SQLSTATE 42P01 (undefined_table)
 * or PostgREST PGRST205 (missing schema-cache relation). Only those exact
 * table-specific cases degrade so legacy schedules keep rendering.
 */
export async function loadRecurrences(
  client: RecurrenceQueryClient,
  truckId: string,
  toDate: string,
): Promise<RecurrenceLoad> {
  const result = await client
    .from('food_truck_recurrences')
    .select()
    .eq('food_truck_id', truckId)
    .lte('start_date', toDate)
    .order('start_date', { ascending: true });

  if (!result.error) return { data: result.data ?? [], error: null, unavailable: false };

  // Only the exact "table does not exist" case degrades to empty data; column-,
  // function-, or permission-shaped errors must still fail the request loudly.
  if (isRecurrenceTableUnavailable(result.error)) {
    return { data: [], error: result.error, unavailable: true };
  }
  return { error: result.error, unavailable: false };
}
