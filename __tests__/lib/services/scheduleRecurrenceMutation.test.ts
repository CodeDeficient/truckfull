import { describe, expect, it } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import {
  createSupabaseRecurrenceStore,
  saveRecurrenceSeries,
  type RecurrenceMutationStore,
} from '@/lib/services/scheduleRecurrenceMutation';

const RECURRENCE = {
  truckId: 'truck-1',
  frequency: 'daily' as const,
  monthlyMode: null,
  startDate: '2026-09-02',
  occurrences: 3,
  startTime: '17:00:00',
  endTime: '20:00:00',
  timezone: 'America/New_York',
  locationData: { address: 'Broad Street' },
};

async function rows(fake: ReturnType<typeof createFakeSupabaseClient>, table: string) {
  const result = await fake.client.from(table).select();
  return result.data ?? [];
}

describe('saveRecurrenceSeries', () => {
  it('creates a finite recurrence and removes the converted one-off only after success', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_truck_schedule_overrides', [
      { id: 'override-1', food_truck_id: 'truck-1', service_date: '2026-09-02', source_type: 'manual' },
    ]);

    const result = await saveRecurrenceSeries(
      createSupabaseRecurrenceStore(fake.client),
      { ...RECURRENCE, convertedOverrideDate: '2026-09-02', canDeleteAdminOverride: false },
    );

    expect(result).toMatchObject({ success: true });
    expect(await rows(fake, 'food_truck_recurrences')).toHaveLength(1);
    expect(await rows(fake, 'food_truck_schedule_overrides')).toHaveLength(0);
  });

  it('updates an existing series without inserting a duplicate', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_truck_recurrences', [
      { id: 'series-1', food_truck_id: 'truck-1', frequency: 'daily', occurrences: 3 },
    ]);

    const result = await saveRecurrenceSeries(createSupabaseRecurrenceStore(fake.client), {
      ...RECURRENCE,
      seriesId: 'series-1',
      frequency: 'monthly',
      monthlyMode: 'same_date',
      occurrences: null,
    });

    expect(result).toEqual({ success: true, id: 'series-1' });
    expect(await rows(fake, 'food_truck_recurrences')).toEqual([
      expect.objectContaining({
        id: 'series-1',
        frequency: 'monthly',
        monthly_mode: 'same_date',
        occurrences: null,
        start_time: '17:00',
        end_time: '20:00',
      }),
    ]);
  });

  it('preserves the one-off when recurrence creation fails', async () => {
    const state = { overridePresent: true };
    const failingStore: RecurrenceMutationStore = {
      insertRecurrence: async () => ({ data: null, error: 'relation does not exist' }),
      updateRecurrence: async () => ({ data: null, error: null }),
      deleteOverride: async () => {
        state.overridePresent = false;
        return { deleted: true, error: null };
      },
      deleteRecurrence: async () => ({ error: null }),
    };

    const result = await saveRecurrenceSeries(failingStore, {
      ...RECURRENCE,
      convertedOverrideDate: '2026-09-02',
      canDeleteAdminOverride: false,
    });

    expect(result).toEqual({ success: false, error: 'Unable to save repeating schedule' });
    expect(state.overridePresent).toBe(true);
  });

  it('rolls back the new recurrence when converted-override removal fails', async () => {
    const state = { recurrencePresent: false };
    const failingStore: RecurrenceMutationStore = {
      insertRecurrence: async () => {
        state.recurrencePresent = true;
        return { data: { id: 'series-1' }, error: null };
      },
      updateRecurrence: async () => ({ data: null, error: null }),
      deleteOverride: async () => ({ deleted: false, error: 'delete failed' }),
      deleteRecurrence: async () => {
        state.recurrencePresent = false;
        return { error: null };
      },
    };

    const result = await saveRecurrenceSeries(failingStore, {
      ...RECURRENCE,
      convertedOverrideDate: '2026-09-02',
      canDeleteAdminOverride: false,
    });

    expect(result).toEqual({ success: false, error: 'Unable to convert date-specific schedule' });
    expect(state.recurrencePresent).toBe(false);
  });

  it('rejects a zero-duration recurrence before writing', async () => {
    const fake = createFakeSupabaseClient();
    const result = await saveRecurrenceSeries(createSupabaseRecurrenceStore(fake.client), {
      ...RECURRENCE,
      startTime: '09:00:00',
      endTime: '09:00',
    });

    expect(result).toEqual({ success: false, error: 'Start and end times must differ' });
    expect(await rows(fake, 'food_truck_recurrences')).toHaveLength(0);
  });
});
