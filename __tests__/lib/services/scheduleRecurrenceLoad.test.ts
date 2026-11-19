import { describe, expect, it } from '@jest/globals';
import type { Database } from '@/lib/database.remote.types';
import { loadRecurrences, type RecurrenceQueryClient } from '@/lib/services/scheduleRecurrenceLoad';

type RecurrenceRow = Database['public']['Tables']['food_truck_recurrences']['Row'];

interface FakeStatefulClient {
  rows: RecurrenceRow[];
  error: { message: string; code?: string } | null;
}

function makeFakeClient(state: {
  rows?: RecurrenceRow[];
  error?: { message: string; code?: string } | null;
}): RecurrenceQueryClient {
  const rows = state.rows ?? [];
  const error = state.error ?? null;
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (eqColumn: string, eqValue: string) => ({
          lte: (lteColumn: string, lteValue: string) => ({
            order: (orderColumn: string, options: { ascending?: boolean }) => {
              // Guard the real wire contract the unit fake previously ignored:
              // .order('start_date', { ascending: true }) — a mis-shaped call
              // (e.g. order({})) would produce a PostgREST 400 in production.
              expect(table).toBe('food_truck_recurrences');
              expect(eqColumn).toBe('food_truck_id');
              expect(eqValue).toBe('truck-1');
              expect(lteColumn).toBe('start_date');
              expect(lteValue).toBe('2026-09-30');
              expect(orderColumn).toBe('start_date');
              expect(options).toEqual({ ascending: true });
              return error
                ? Promise.resolve({ data: null, error })
                : Promise.resolve({ data: rows, error: null });
            },
          }),
        }),
      }),
    }),
  };
}

function recurrencesRow(overrides: Partial<RecurrenceRow> = {}): RecurrenceRow {
  return {
    id: 'r1',
    food_truck_id: 'truck-1',
    frequency: 'daily',
    monthly_mode: null,
    start_date: '2026-09-02',
    occurrences: 2,
    start_time: '09:00',
    end_time: '17:00',
    ends_next_day: false,
    timezone: 'America/New_York',
    location_data: null,
    created_by: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

describe('loadRecurrences additive-source contract', () => {
  it('returns recurrence data when the table exists', async () => {
    const client = makeFakeClient({ rows: [recurrencesRow()] });
    const result = await loadRecurrences(client, 'truck-1', '2026-09-30');
    expect(result.unavailable).toBe(false);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.frequency).toBe('daily');
  });

  it('degrades to unavailable only for the missing-relation error, preserving legacy data', async () => {
    const client = makeFakeClient({
      error: { message: 'relation "public.food_truck_recurrences" does not exist', code: '42P01' },
    });
    const result = await loadRecurrences(client, 'truck-1', '2026-09-30');
    expect(result.unavailable).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('detects the unqualified relation name variant when SQLSTATE is present', async () => {
    const client = makeFakeClient({
      error: { message: 'relation "food_truck_recurrences" does not exist', code: '42P01' },
    });
    const result = await loadRecurrences(client, 'truck-1', '2026-09-30');
    expect(result.unavailable).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('degrades for PostgREST missing-table schema-cache errors', async () => {
    const client = makeFakeClient({
      error: {
        message: "Could not find the table 'public.food_truck_recurrences' in the schema cache",
        code: 'PGRST205',
      },
    });
    const result = await loadRecurrences(client, 'truck-1', '2026-09-30');
    expect(result.unavailable).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('surfaces PGRST205 errors for other tables', async () => {
    const client = makeFakeClient({
      error: {
        message:
          "Could not find the table 'public.food_truck_schedule_overrides' in the schema cache",
        code: 'PGRST205',
      },
    });
    const result = await loadRecurrences(client, 'truck-1', '2026-09-30');
    expect(result.unavailable).toBe(false);
    expect(result.error?.message).toContain('food_truck_schedule_overrides');
  });

  it('surfaces unrelated recurrence query errors as real failures', async () => {
    const client = makeFakeClient({
      error: { message: 'connection terminated unexpectedly', code: '08003' },
    });
    const result = await loadRecurrences(client, 'truck-1', '2026-09-30');
    expect(result.unavailable).toBe(false);
    expect(result.error?.message).toBe('connection terminated unexpectedly');
  });

  it('surfaces column-level "does not exist" errors instead of degrading', async () => {
    const client = makeFakeClient({
      error: { message: 'column recurrences.start_dte does not exist', code: '42703' },
    });
    const result = await loadRecurrences(client, 'truck-1', '2026-09-30');
    expect(result.unavailable).toBe(false);
    expect(result.error?.message).toContain('start_dte');
  });
});
