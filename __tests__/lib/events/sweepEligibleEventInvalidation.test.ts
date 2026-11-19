/**
 * @jest-environment node
 */

import { describe, expect, it, jest } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { FakeSupabaseFactory } from '@/__tests__/fakes/fakeSupabase';
import { sweepEligibleEventInvalidation } from '@/lib/events/eventVetting';
import type { EventCacheTarget } from '@/lib/events/eventPageInvalidation';

const ID_A = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ID_B = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('sweepEligibleEventInvalidation', () => {
  it('invalidates every eligible event target', async () => {
    const fake: FakeSupabaseFactory = createFakeSupabaseClient();
    fake.seedTable('external_events', [
      {
        id: ID_A,
        title: 'Food Fest',
        city: 'Augusta',
        state: 'GA',
        event_start_date: '2026-05-01',
        is_food_truck_relevant: true,
        is_hidden: false,
        vetting_score: 50,
      },
      {
        id: ID_B,
        title: 'Taco Tuesday',
        city: 'Aiken',
        state: 'SC',
        event_start_date: '2026-06-01',
        is_food_truck_relevant: true,
        is_hidden: false,
        vetting_score: 40,
      },
    ]);

    const invalidated: EventCacheTarget[][] = [];
    const invalidate = async (targets: readonly EventCacheTarget[]): Promise<void> => {
      invalidated.push([...targets]);
    };

    const count = await sweepEligibleEventInvalidation(fake.client, invalidate);

    expect(count).toBe(2);
    expect(invalidated).toHaveLength(1);
    expect(invalidated[0]).toContainEqual({
      eventId: ID_A,
      city: 'Augusta',
      state: 'GA',
      citySlug: 'augusta-ga',
      eventSlug: 'food-fest-2026-05-01',
    });
    expect(invalidated[0]).toContainEqual({
      eventId: ID_B,
      city: 'Aiken',
      state: 'SC',
      citySlug: 'aiken-sc',
      eventSlug: 'taco-tuesday-2026-06-01',
    });
  });

  it('excludes events below the eligibility threshold', async () => {
    const fake: FakeSupabaseFactory = createFakeSupabaseClient();
    fake.seedTable('external_events', [
      {
        id: ID_A,
        title: 'Food Fest',
        city: 'Augusta',
        state: 'GA',
        event_start_date: '2026-05-01',
        is_food_truck_relevant: true,
        is_hidden: false,
        vetting_score: 20,
      },
    ]);

    const invalidated: EventCacheTarget[][] = [];
    const invalidate = async (targets: readonly EventCacheTarget[]): Promise<void> => {
      invalidated.push([...targets]);
    };

    const count = await sweepEligibleEventInvalidation(fake.client, invalidate);

    expect(count).toBe(0);
    expect(invalidated).toHaveLength(0);
  });

  it('excludes events that are not food-truck-relevant or are hidden', async () => {
    const fake: FakeSupabaseFactory = createFakeSupabaseClient();
    fake.seedTable('external_events', [
      {
        id: ID_A,
        title: 'Food Fest',
        city: 'Augusta',
        state: 'GA',
        event_start_date: '2026-05-01',
        is_food_truck_relevant: false,
        is_hidden: false,
        vetting_score: 50,
      },
      {
        id: ID_B,
        title: 'Taco Tuesday',
        city: 'Aiken',
        state: 'SC',
        event_start_date: '2026-06-01',
        is_food_truck_relevant: true,
        is_hidden: true,
        vetting_score: 40,
      },
    ]);

    const invalidated: EventCacheTarget[][] = [];
    const invalidate = async (targets: readonly EventCacheTarget[]): Promise<void> => {
      invalidated.push([...targets]);
    };

    const count = await sweepEligibleEventInvalidation(fake.client, invalidate);

    expect(count).toBe(0);
    expect(invalidated).toHaveLength(0);
  });

  it('drops rows that cannot form a valid target', async () => {
    const fake: FakeSupabaseFactory = createFakeSupabaseClient();
    fake.seedTable('external_events', [
      {
        id: ID_A,
        title: 'Food Fest',
        city: 'Augusta',
        state: 'TX',
        event_start_date: '2026-05-01',
        is_food_truck_relevant: true,
        is_hidden: false,
        vetting_score: 50,
      },
    ]);

    const invalidated: EventCacheTarget[][] = [];
    const invalidate = async (targets: readonly EventCacheTarget[]): Promise<void> => {
      invalidated.push([...targets]);
    };

    const count = await sweepEligibleEventInvalidation(fake.client, invalidate);

    expect(count).toBe(0);
    expect(invalidated).toHaveLength(0);
  });

  it('returns zero and does not throw when the query fails', async () => {
    const fake: FakeSupabaseFactory = createFakeSupabaseClient();
    const invalidate = jest.fn(async (_targets: readonly EventCacheTarget[]): Promise<void> => {});

    const count = await sweepEligibleEventInvalidation(fake.client, invalidate);

    expect(count).toBe(0);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('sweeps across multiple pages and reports the full count', async () => {
    const fake: FakeSupabaseFactory = createFakeSupabaseClient();
    const rows = Array.from({ length: 102 }, (_, index) => {
      const tail = index.toString().padStart(3, '0');
      return {
        id: `11111111-1111-4111-8111-1${tail}11111111`,
        title: `Fest ${index}`,
        city: 'Augusta',
        state: 'GA',
        event_start_date: '2026-05-01',
        is_food_truck_relevant: true,
        is_hidden: false,
        vetting_score: 50,
      };
    });
    fake.seedTable('external_events', rows);

    const invalidated: EventCacheTarget[][] = [];
    const invalidate = async (targets: readonly EventCacheTarget[]): Promise<void> => {
      invalidated.push([...targets]);
    };

    const count = await sweepEligibleEventInvalidation(fake.client, invalidate);

    expect(count).toBe(102);
    expect(invalidated.flat()).toHaveLength(102);
  });
});
