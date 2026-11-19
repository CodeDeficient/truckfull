import { describe, expect, it } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import {
  orderTimeAlternatives,
  processFacebookPost,
  type PostProcessorDependencies,
} from '@/lib/services/postProcessor';
import {
  extractAmbiguousTimeAlternatives,
  extractTextBasedData,
  hasAmbiguousMeridiemRange,
} from '@/lib/services/textExtractor';

const TRUCK_ID = 'truck-ambiguous-meridiem';
const CREATED_TIME = '2026-08-20T14:00:00.000Z';
const EXACT_LOCATION = '1000 Alder Way, Evans, GA 30809';

function seedPost(messageId: string): ReturnType<typeof createFakeSupabaseClient> {
  const fake = createFakeSupabaseClient();
  fake.seedTable('food_trucks', [
    {
      id: TRUCK_ID,
      timezone: 'America/New_York',
      facebook_auto_updates_enabled: true,
      operating_hours: {},
    },
  ]);
  fake.seedTable('facebook_posts', [
    {
      id: `row-${messageId}`,
      truck_id: TRUCK_ID,
      facebook_post_id: messageId,
      status: 'pending',
      created_time: CREATED_TIME,
    },
  ]);
  fake.seedTable('food_truck_schedule_overrides', []);
  return fake;
}

function dependencies(
  fake: ReturnType<typeof createFakeSupabaseClient>,
): PostProcessorDependencies {
  return {
    supabase: fake.client as unknown as PostProcessorDependencies['supabase'],
    queueForConfirmation: async (truckId, facebookPostId, updateType, proposedData, reason) => {
      const { data: post } = await fake.client
        .from('facebook_posts')
        .select('id')
        .eq('facebook_post_id', facebookPostId)
        .eq('truck_id', truckId)
        .single();
      if (!post) return { success: false, error: 'Post not found' };
      const { error } = await fake.client.from('facebook_post_confirmations').insert({
        truck_id: truckId,
        facebook_post_id: (post as { id: string }).id,
        update_type: updateType,
        proposed_data: proposedData,
        low_confidence_reason: reason,
        status: 'pending',
      });
      return error ? { success: false, error: error.message } : { success: true };
    },
  };
}

async function processRange(range: string, messageId: string) {
  const fake = seedPost(messageId);
  const message =
    range === '5-8'
      ? `We're here today ${range} at ${EXACT_LOCATION}`
      : `We're here today from ${range} at ${EXACT_LOCATION}`;
  const result = await processFacebookPost(
    TRUCK_ID,
    messageId,
    { post_id: messageId, message, created_time: CREATED_TIME },
    dependencies(fake),
  );
  const { data: overrides } = await fake.client
    .from('food_truck_schedule_overrides')
    .select('start_time, end_time, ends_next_day')
    .eq('food_truck_id', TRUCK_ID);
  const { data: confirmations } = await fake.client
    .from('facebook_post_confirmations')
    .select('update_type, proposed_data, low_confidence_reason')
    .eq('truck_id', TRUCK_ID);
  return { result, overrides: overrides ?? [], confirmations: confirmations ?? [] };
}

describe('ambiguous meridiem ranges', () => {
  it('uses a 12-hour AI interpretation only to order the deterministic choices', () => {
    const alternatives = extractAmbiguousTimeAlternatives('Tomorrow from 5-8');
    expect(orderTimeAlternatives(alternatives, { start: '5pm', end: '8pm' })?.[0]).toEqual({
      start: '17:00',
      end: '20:00',
      label: '5 PM–8 PM',
    });
  });

  it('builds correct midnight/noon alternatives for a range starting at 12', () => {
    expect(extractAmbiguousTimeAlternatives('Tomorrow from 12-2')).toEqual([
      { start: '00:00', end: '02:00', label: '12 AM–2 AM' },
      { start: '12:00', end: '14:00', label: '12 PM–2 PM' },
    ]);
  });

  it('retains both-uncertain chrono provenance for the P18 source text', () => {
    const text =
      'Today is our last Popup Market Cafe at 620 S Tryon inside Bank of America Tower. ' +
      "Come see us today from 11-2 and we'll keep you updated at which BofA location we'll be next month.";

    expect(extractTextBasedData(text).times).toMatchObject({
      start: '11:00',
      end: '02:00',
      startMeridiemCertain: false,
      endMeridiemCertain: false,
    });
  });

  it.each([
    [
      '11-2',
      [
        { start: '11:00', end: '14:00', label: '11 AM–2 PM' },
        { start: '23:00', end: '02:00', label: '11 PM–2 AM' },
      ],
    ],
    [
      '5-8',
      [
        { start: '05:00', end: '08:00', label: '5 AM–8 AM' },
        { start: '17:00', end: '20:00', label: '5 PM–8 PM' },
      ],
    ],
  ])('queues an actionable time-only review for the bare range %s', async (range, options) => {
    const { result, overrides, confirmations } = await processRange(range, `bare-${range}`);

    expect(result).toMatchObject({
      success: true,
      status: 'pending_review',
      reason: 'AMBIGUOUS_MERIDIEM_RANGE',
    });
    expect(overrides).toHaveLength(0);
    expect(confirmations).toEqual([
      expect.objectContaining({
        update_type: 'schedule',
        low_confidence_reason: 'AMBIGUOUS_MERIDIEM_RANGE',
        proposed_data: expect.objectContaining({
          reviewAction: 'ambiguous_time',
          serviceScope: 'one_off_date',
          serviceDate: '2026-08-20',
          location: expect.objectContaining({ address: EXACT_LOCATION, fuzzy: false }),
          timeAlternatives: expect.arrayContaining(options),
        }),
      }),
    ]);
  });

  it.each([
    ['11am-2pm', '11:00', '14:00'],
    ['5pm-8pm', '17:00', '20:00'],
    ['4-7 PM', '16:00', '19:00'],
    ['11-2pm', '11:00', '14:00'],
    ['2-5pm', '14:00', '17:00'],
    ['8-11am', '08:00', '11:00'],
    ['11am-2', '11:00', '14:00'],
  ])('keeps the explicit range %s eligible for normal processing', async (range, start, end) => {
    const { result, overrides } = await processRange(range, `explicit-${start}-${end}`);

    expect(result).toMatchObject({ success: true, status: 'processed' });
    expect(overrides).toEqual([
      expect.objectContaining({
        start_time: start,
        end_time: end,
        ends_next_day: false,
      }),
    ]);
  });

  it('keeps an explicit overnight range eligible', async () => {
    const { result, overrides } = await processRange('11pm-2am', 'explicit-overnight');

    expect(result).toMatchObject({ success: true, status: 'processed' });
    expect(overrides).toEqual([
      expect.objectContaining({
        start_time: '23:00',
        end_time: '02:00',
        ends_next_day: true,
      }),
    ]);
  });

  it.each(['August 5-8', '5-8 August'])(
    'does not treat the calendar range %s as an ambiguous time range',
    (range) => {
      const text = `We will be at the county fair ${range}.`;
      expect(hasAmbiguousMeridiemRange(text, extractTextBasedData(text).times)).toBe(false);
    },
  );
});
