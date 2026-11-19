import { describe, expect, it } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { getSupabaseAdmin } from '@/lib/supabase/admin';
import { updateSchedule } from '@/lib/services/truckUpdater';
import { withManualScheduleSource } from '@/lib/mappers/weeklyScheduleModel';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

const T0 = '2026-08-01T10:00:00.000Z';
const T1 = '2026-08-02T10:00:00.000Z';
const T2 = '2026-08-03T10:00:00.000Z';
const T3 = '2026-08-04T10:00:00.000Z';
const PROCESSING_NOW = '2026-09-01T00:00:00.000Z';

type HoursEntry = {
  open?: string;
  close?: string;
  closed?: boolean;
  location?: string;
  _meta?: {
    schedule?: { source: 'manual' | 'facebook'; last_action_at: string };
    location?: { source: 'manual' | 'facebook'; last_action_at: string };
  };
};

function seedTruck(
  fake: ReturnType<typeof createFakeSupabaseClient>,
  hours: Record<string, HoursEntry>,
  truckFields: Record<string, unknown> = {},
): void {
  fake.seedTable('food_trucks', [
    {
      id: 'truck-1',
      slug: 'taco-truck',
      facebook_auto_updates_enabled: true,
      operating_hours: hours,
      ...truckFields,
    },
  ]);
}

async function readHours(
  fake: ReturnType<typeof createFakeSupabaseClient>,
): Promise<Record<string, HoursEntry>> {
  const { data: truck } = await fake.client
    .from('food_trucks')
    .select('operating_hours, schedule_updated_by, schedule_updated_at, location_updated_by, location_updated_at')
    .eq('id', 'truck-1')
    .single();
  return (truck as unknown as { operating_hours: Record<string, HoursEntry> }).operating_hours;
}

async function readTruck(
  fake: ReturnType<typeof createFakeSupabaseClient>,
): Promise<Record<string, unknown>> {
  const { data: truck } = await fake.client
    .from('food_trucks')
    .select('operating_hours, schedule_updated_by, schedule_updated_at, location_updated_by, location_updated_at')
    .eq('id', 'truck-1')
    .single();
  return (truck ?? {}) as Record<string, unknown>;
}

describe('recurring Facebook schedule arbitration — per-weekday, per-unit', () => {
  it('manual Monday hours T1 vs FB Monday hours T0, processed immediately → FB loses', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'manual', last_action_at: T1 } },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: new Date().toISOString(),
      fbActionAt: T0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RECURRING_SCHEDULE_STALE_OWNER_ACTION');
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      _meta: { schedule: { source: 'manual', last_action_at: T1 } },
    });
  });

  it('manual Monday hours T1 vs FB Monday hours T0, processed 30 days later → FB still loses', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'manual', last_action_at: T1 } },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: PROCESSING_NOW,
      fbActionAt: T0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RECURRING_SCHEDULE_STALE_OWNER_ACTION');
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      _meta: { schedule: { source: 'manual', last_action_at: T1 } },
    });
  });

  it('manual Monday hours T1 vs FB Monday hours T2, processed immediately → FB wins', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'manual', last_action_at: T1 } },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: new Date().toISOString(),
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '10:00',
      close: '15:00',
      _meta: { schedule: { source: 'facebook', last_action_at: T2 } },
    });
  });

  it('manual Monday hours T1 vs FB Monday hours T2, processed much later → FB still wins and stamps T2', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'manual', last_action_at: T1 } },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: PROCESSING_NOW,
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    const truck = await readTruck(fake);
    const hours = truck.operating_hours as Record<string, HoursEntry>;
    expect(hours.monday).toMatchObject({
      open: '10:00',
      close: '15:00',
      _meta: { schedule: { source: 'facebook', last_action_at: T2 } },
    });
    // Canonical action time persisted, not processing time
    expect(truck.schedule_updated_at).toBe(T2);
  });

  it('manual Monday hours must not suppress an unrelated Tuesday FB hours action', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'manual', last_action_at: T1 } },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday', 'tuesday'],
      now: new Date().toISOString(),
      fbActionAt: T0,
    });

    expect(result.success).toBe(true);
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      _meta: { schedule: { source: 'manual', last_action_at: T1 } },
    });
    expect(hours.tuesday).toMatchObject({
      open: '10:00',
      close: '15:00',
      _meta: { schedule: { source: 'facebook', last_action_at: T0 } },
    });
  });

  it('manual Monday hours must not suppress a Monday FB location action when both units are orderable', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Old spot',
        _meta: {
          schedule: { source: 'manual', last_action_at: T1 },
          location: { source: 'manual', last_action_at: T0 },
        },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: ['monday'],
      now: new Date().toISOString(),
      location: 'New FB spot',
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      location: 'New FB spot',
      _meta: {
        location: { source: 'facebook', last_action_at: T2 },
      },
    });
    expect(hours.monday._meta?.schedule).toEqual({ source: 'facebook', last_action_at: T2 });
  });

  it('manual Monday location must not suppress a Monday FB hours action when both units are orderable', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Old spot',
        _meta: {
          schedule: { source: 'manual', last_action_at: T0 },
          location: { source: 'manual', last_action_at: T1 },
        },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: new Date().toISOString(),
      location: 'New FB spot',
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '10:00',
      close: '15:00',
      location: 'New FB spot',
      _meta: {
        schedule: { source: 'facebook', last_action_at: T2 },
        location: { source: 'facebook', last_action_at: T2 },
      },
    });
  });

  it('rejects an action when its identical schedule and changed location are both stale', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Old spot',
        _meta: {
          schedule: { source: 'manual', last_action_at: T0 },
          location: { source: 'manual', last_action_at: T1 },
        },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: ['monday'],
      now: new Date().toISOString(),
      location: 'New FB spot',
      fbActionAt: T0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RECURRING_SCHEDULE_STALE_OWNER_ACTION');
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      location: 'Old spot',
      _meta: {
        schedule: { source: 'manual', last_action_at: T0 },
        location: { source: 'manual', last_action_at: T1 },
      },
    });
  });

  it('manual Monday location T1 vs FB Monday location T2 → FB wins', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Old spot',
        _meta: {
          schedule: { source: 'manual', last_action_at: T0 },
          location: { source: 'manual', last_action_at: T1 },
        },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: ['monday'],
      now: new Date().toISOString(),
      location: 'New FB spot',
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      location: 'New FB spot',
      _meta: {
        location: { source: 'facebook', last_action_at: T2 },
      },
    });
    expect(hours.monday._meta?.schedule).toEqual({ source: 'facebook', last_action_at: T2 });
  });

  it('mixed post: newer FB hours apply while a newer manual location is preserved', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Owner spot',
        _meta: {
          schedule: { source: 'manual', last_action_at: T1 },
          location: { source: 'manual', last_action_at: T3 },
        },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: new Date().toISOString(),
      location: 'FB spot',
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '10:00',
      close: '15:00',
      location: 'Owner spot',
      _meta: {
        schedule: { source: 'facebook', last_action_at: T2 },
        location: { source: 'manual', last_action_at: T3 },
      },
    });
  });

  it('mixed post: newer FB location applies while a newer manual hours value is preserved', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Owner spot',
        _meta: {
          schedule: { source: 'manual', last_action_at: T3 },
          location: { source: 'manual', last_action_at: T1 },
        },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: new Date().toISOString(),
      location: 'FB spot',
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      location: 'FB spot',
      _meta: {
        schedule: { source: 'manual', last_action_at: T3 },
        location: { source: 'facebook', last_action_at: T2 },
      },
    });
  });

  it('a FB hours-only action never touches the location clock', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Owner spot',
        _meta: {
          schedule: { source: 'manual', last_action_at: T1 },
          location: { source: 'manual', last_action_at: T3 },
        },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: new Date().toISOString(),
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '10:00',
      close: '15:00',
      location: 'Owner spot',
      _meta: {
        schedule: { source: 'facebook', last_action_at: T2 },
        location: { source: 'manual', last_action_at: T3 },
      },
    });
  });

  it('applies a Facebook action to a legacy day/unit without _meta and stamps fresh provenance', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(
      fake,
      { monday: { open: '11:00', close: '14:00' } },
      {
        schedule_updated_by: 'manual',
        schedule_updated_at: T1,
        location_updated_by: 'manual',
        location_updated_at: T1,
      },
    );

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: new Date().toISOString(),
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({ open: '10:00', close: '15:00' });
    expect(hours.monday._meta?.schedule).toEqual({ source: 'facebook', last_action_at: T2 });
  });

  it('missing canonical FB timestamp fails closed with no write', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'manual', last_action_at: T1 } },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: new Date().toISOString(),
      fbActionAt: undefined,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RECURRING_FB_ACTION_TIME_MISSING');
    const hours = await readHours(fake);
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      _meta: { schedule: { source: 'manual', last_action_at: T1 } },
    });
  });

  it('advances provenance for a newer identical Facebook assertion without changing values', async () => {
    const fake = createFakeSupabaseClient();
    const existing = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Owner spot',
        _meta: {
          schedule: { source: 'manual' as const, last_action_at: T1 },
          location: { source: 'manual' as const, last_action_at: T3 },
        },
      },
    };
    seedTruck(fake, existing, {
      schedule_updated_by: 'manual',
      schedule_updated_at: T1,
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: ['monday'],
      now: PROCESSING_NOW,
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    const truck = await readTruck(fake);
    expect(truck.operating_hours).toEqual({
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Owner spot',
        _meta: {
          schedule: { source: 'facebook', last_action_at: T2 },
          location: { source: 'manual', last_action_at: T3 },
        },
      },
    });
    expect(truck.schedule_updated_by).toBe('facebook');
    expect(truck.schedule_updated_at).toBe(T2);
  });

  it('does not regress provenance for an older identical Facebook assertion', async () => {
    const fake = createFakeSupabaseClient();
    const existing = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Owner spot',
        _meta: {
          schedule: { source: 'facebook' as const, last_action_at: T3 },
          location: { source: 'manual' as const, last_action_at: T1 },
        },
      },
    };
    seedTruck(fake, existing);

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: ['monday'],
      now: PROCESSING_NOW,
      fbActionAt: T2,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RECURRING_SCHEDULE_STALE_OWNER_ACTION');
    expect((await readTruck(fake)).operating_hours).toEqual(existing);
  });

  it('does not let unrelated day units create false success when all contested units lose', async () => {
    const fake = createFakeSupabaseClient();
    const existing = {
      monday: {
        open: '09:00',
        close: '17:00',
        location: 'FB spot',
        _meta: {
          schedule: { source: 'manual' as const, last_action_at: T3 },
          location: { source: 'manual' as const, last_action_at: T3 },
        },
      },
      tuesday: {
        open: '11:00',
        close: '14:00',
        location: 'Owner spot',
        _meta: {
          schedule: { source: 'manual' as const, last_action_at: T3 },
          location: { source: 'manual' as const, last_action_at: T3 },
        },
      },
    };
    seedTruck(fake, existing);

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: ['monday', 'tuesday'],
      now: PROCESSING_NOW,
      location: 'FB spot',
      fbActionAt: T2,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RECURRING_SCHEDULE_STALE_OWNER_ACTION');
    expect((await readTruck(fake)).operating_hours).toEqual(existing);
  });

  it('re-reads and re-arbitrates when an owner save wins the first conditional-write race', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'facebook', last_action_at: T0 } },
      },
    });
    const ownerHours = {
      monday: {
        open: '12:00',
        close: '16:00',
        _meta: { schedule: { source: 'manual' as const, last_action_at: T3 } },
      },
    };
    fake.beforeNextUpdate('food_trucks', (rows) =>
      rows.map((row) =>
        row.id === 'truck-1' ? { ...row, operating_hours: ownerHours } : row,
      ),
    );

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: PROCESSING_NOW,
      fbActionAt: T2,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RECURRING_SCHEDULE_STALE_OWNER_ACTION');
    expect((await readTruck(fake)).operating_hours).toEqual(ownerHours);
  });

  it('completes an uncontended conditional recurring write', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'facebook', last_action_at: T0 } },
      },
    });

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: PROCESSING_NOW,
      fbActionAt: T2,
    });

    expect(result.success).toBe(true);
    expect((await readHours(fake)).monday).toMatchObject({
      open: '10:00',
      close: '15:00',
      _meta: { schedule: { source: 'facebook', last_action_at: T2 } },
    });
  });

  it('fails safely after bounded conditional-write conflicts', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake, {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'facebook', last_action_at: T0 } },
      },
    });

    for (const open of ['11:01', '11:02', '11:03']) {
      fake.beforeNextUpdate('food_trucks', (rows) =>
        rows.map((row) => ({
          ...row,
          operating_hours: {
            monday: {
              open,
              close: '14:00',
              _meta: { schedule: { source: 'facebook', last_action_at: T0 } },
            },
          },
        })),
      );
    }

    const result = await updateSchedule({
      supabase: fake.client as unknown as AdminClient,
      truckId: 'truck-1',
      start: '10:00',
      end: '15:00',
      days: ['monday'],
      now: PROCESSING_NOW,
      fbActionAt: T2,
    });

    expect(result).toEqual({
      success: false,
      error: 'RECURRING_SCHEDULE_WRITE_CONFLICT: Schedule changed during update; retry later',
    });
    expect((await readHours(fake)).monday.open).toBe('11:03');
  });
});

describe('dashboard weekly save persists manual source metadata', () => {
  it('stamps the metadata onto the actual PUT payload at request time', () => {
    const stamp = '2026-08-30T18:00:00.000Z';
    const payload = withManualScheduleSource(
      { operating_hours: { thursday: { open: '11:00', close: '16:00' } } },
      stamp,
    );

    expect(payload.schedule_updated_by).toBe('manual');
    expect(payload.schedule_updated_at).toBe(stamp);
  });
});
