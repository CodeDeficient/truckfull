import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';

const ORIGINAL_OLLAMA_KEY = process.env.OLLAMA_CLOUD_API_KEY;
const ORIGINAL_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

let processFacebookPost: typeof import('@/lib/services/postProcessor').processFacebookPost;
type PostProcessorDependencies = import('@/lib/services/postProcessor').PostProcessorDependencies;

beforeAll(async () => {
  delete process.env.OLLAMA_CLOUD_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  ({ processFacebookPost } = await import('@/lib/services/postProcessor'));
});

afterAll(() => {
  if (ORIGINAL_OLLAMA_KEY !== undefined) {
    process.env.OLLAMA_CLOUD_API_KEY = ORIGINAL_OLLAMA_KEY;
  } else {
    delete process.env.OLLAMA_CLOUD_API_KEY;
  }
  if (ORIGINAL_OPENROUTER_KEY !== undefined) {
    process.env.OPENROUTER_API_KEY = ORIGINAL_OPENROUTER_KEY;
  } else {
    delete process.env.OPENROUTER_API_KEY;
  }
});

const TRUCK_ID = 'truck-auto-recurring';
const POST_ID = 'auto-recurring-post';
const CREATED = '2026-08-26T18:00:00.000Z';

function seedTruck(fake: ReturnType<typeof createFakeSupabaseClient>): void {
  fake.seedTable('food_trucks', [
    {
      id: TRUCK_ID,
      facebook_page_id: 'page-auto-recurring',
      timezone: 'America/New_York',
      slug: 'auto-recurring-truck',
      facebook_auto_updates_enabled: true,
      // Recent manual PERMANENT-location marker: must not veto recurring
      // service-location updates (they no longer touch permanent location).
      location_updated_by: 'manual',
      location_updated_at: new Date().toISOString(),
      street_address: '500 Permanent Ave',
      city: 'Augusta',
      state: 'GA',
      operating_hours: {
        friday: { open: '09:00', close: '17:00', location: 'Old Friday spot' },
      },
    } as never,
  ]);
}

function seedPost(fake: ReturnType<typeof createFakeSupabaseClient>): void {
  fake.seedTable('facebook_posts', [
    {
      id: 'post-row-1',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status: 'pending',
      created_time: CREATED,
    } as never,
  ]);
}

describe('automatic recurring path — scoped source gates', () => {
  it('applies high-confidence recurring hours + service location despite a recent manual permanent-location marker', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    seedPost(fake);

    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      {
        post_id: POST_ID,
        message:
          'We are back at 1201 Knox Ave, North Augusta, SC 29841 every Monday from 11 AM to 2 PM!',
        created_time: CREATED,
      },
      { supabase: fake.client as unknown as PostProcessorDependencies['supabase'] },
    );

    expect(result.status).toBe('processed');
    expect(result.updatedFields).toContain('schedule');

    const { data: truck } = await fake.client
      .from('food_trucks')
      .select('operating_hours, street_address, city, location_updated_by')
      .eq('id', TRUCK_ID)
      .single();
    const hours = (
      truck as unknown as {
        operating_hours: Record<string, { open: string; close: string; location?: string }>;
        street_address: string;
        city: string;
        location_updated_by: string;
      }
    ).operating_hours;
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      location: '1201 Knox Ave, North Augusta, SC 29841',
    });
    // Unaffected weekday byte-identical
    expect(hours.friday).toEqual({ open: '09:00', close: '17:00', location: 'Old Friday spot' });
    // Permanent address untouched, no facebook permanent-location write
    expect(truck).toMatchObject({
      street_address: '500 Permanent Ave',
      city: 'Augusta',
      location_updated_by: 'manual',
    });
  });

  it('rejects the automatic recurring update when the post predates a newer manual day action (canonical arbitration, no 7-day window)', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    seedPost(fake);
    // Owner edited Monday hours AFTER the Facebook post was created: the
    // canonical created_time loses to the newer manual day action regardless
    // of processing time (there is no 7-day wall-clock window anymore).
    const manualAt = '2026-08-27T00:00:00.000Z';
    await fake.client
      .from('food_trucks')
      .update({
        operating_hours: {
          friday: { open: '09:00', close: '17:00', location: 'Old Friday spot' },
          monday: {
            open: '13:00',
            close: '16:00',
            location: 'Owner spot',
            _meta: {
              schedule: { source: 'manual', last_action_at: manualAt },
              location: { source: 'manual', last_action_at: manualAt },
            },
          },
        },
      })
      .eq('id', TRUCK_ID);

    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      {
        post_id: POST_ID,
        message:
          'We are back at 1201 Knox Ave, North Augusta, SC 29841 every Monday from 11 AM to 2 PM!',
        created_time: CREATED,
      },
      { supabase: fake.client as unknown as PostProcessorDependencies['supabase'] },
    );

    expect(result.status).toBe('rejected');
    expect(result.reason).toMatch(/RECURRING_SCHEDULE_STALE_OWNER_ACTION/);
    // Recurring hours untouched by the vetoed update
    const { data: truck } = await fake.client
      .from('food_trucks')
      .select('operating_hours')
      .eq('id', TRUCK_ID)
      .single();
    const hours = (
      truck as unknown as {
        operating_hours: Record<string, { open: string; close: string; location?: string }>;
      }
    ).operating_hours;
    expect(hours.monday).toMatchObject({ open: '13:00', close: '16:00', location: 'Owner spot' });
    expect(hours.friday).toEqual({ open: '09:00', close: '17:00', location: 'Old Friday spot' });
  });
});
