/**
 * @jest-environment node
 */

import { describe, expect, it } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { FakeSupabaseFactory } from '@/__tests__/fakes/fakeSupabase';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { saveVettingResult } from '@/lib/events/eventVetting';
import type { EventCacheTarget } from '@/lib/events/eventPageInvalidation';
import type { EventVettingResult } from '@/lib/events/eventVetting';

const EVENT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const RESULT: EventVettingResult = {
  score: 50,
  factors: {
    trafficScore: 0.4,
    researchConfidence: 0.4,
    historyScore: 0.3,
    areaEventCount: 2,
    recurringCount: 1,
    venuePopularity: 0.2,
  },
  recommendation: 'recommended',
  reasoning: 'The event has a current public listing.',
  sources: ['https://example.com/event'],
  locationType: 'precise',
};

function seedEligibleEvent(fake: FakeSupabaseFactory): void {
  fake.seedTable('external_events', [
    {
      id: EVENT_ID,
      title: 'Food Fest',
      city: 'Augusta',
      state: 'GA',
      event_start_date: '2026-05-01',
      vetting_score: 40,
      vetting_result: { factors: { researchConfidence: 0.4 } },
      vetted_at: '2026-04-01T00:00:00.000Z',
    },
  ]);
}

describe('saveVettingResult', () => {
  it('persists changed public metadata and emits a city-scoped target', async () => {
    const fake = createFakeSupabaseClient();
    seedEligibleEvent(fake);
    const invalidated: EventCacheTarget[][] = [];

    await saveVettingResult(
      EVENT_ID,
      'external',
      RESULT,
      (targets) => invalidated.push([...targets]),
      fake.client as unknown as ReturnType<typeof getSupabaseAdmin>,
    );

    const saved = await fake.client.from('external_events').select('*').eq('id', EVENT_ID).single();

    expect(saved.data).toMatchObject({
      vetting_score: 50,
      vetting_result: RESULT,
      vetting_location_type: 'precise',
    });
    expect(invalidated).toEqual([
      [
        {
          eventId: EVENT_ID,
          city: 'Augusta',
          state: 'GA',
          citySlug: 'augusta-ga',
          eventSlug: 'food-fest-2026-05-01',
          cacheScope: 'city',
        },
      ],
    ]);
  });

  it('keeps a successful database write fail-open when invalidation fails', async () => {
    const fake = createFakeSupabaseClient();
    seedEligibleEvent(fake);

    await expect(
      saveVettingResult(
        EVENT_ID,
        'external',
        RESULT,
        async () => {
          throw new Error('cache unavailable');
        },
        fake.client as unknown as ReturnType<typeof getSupabaseAdmin>,
      ),
    ).resolves.toBeUndefined();

    const saved = await fake.client.from('external_events').select('*').eq('id', EVENT_ID).single();
    expect(saved.data).toMatchObject({ vetting_score: 50 });
  });
});
