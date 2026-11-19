/**
 * @jest-environment node
 */

import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { revalidatePath, revalidateTag } from 'next/cache';

describe('event page invalidation', () => {
  let invalidateEventPage: typeof import('@/lib/events/eventPageInvalidation').invalidateEventPage;
  let invalidateEventCacheTargets: typeof import('@/lib/events/eventPageInvalidation').invalidateEventCacheTargets;
  let chunkEventCacheTargets: typeof import('@/lib/events/eventPageInvalidation').chunkEventCacheTargets;
  let isEventCacheTarget: typeof import('@/lib/events/eventPageInvalidation').isEventCacheTarget;

  beforeAll(async () => {
    ({
      invalidateEventPage,
      invalidateEventCacheTargets,
      chunkEventCacheTargets,
      isEventCacheTarget,
    } = await import('@/lib/events/eventPageInvalidation'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('expires the detail, city, and nearby tags and the exact canonical, city, and index paths', () => {
    invalidateEventPage({
      citySlug: 'augusta-ga',
      eventSlug: 'food-fest-2026-05-01',
      city: 'Augusta',
      state: 'GA',
      eventId: 'event-1',
    });

    expect(revalidateTag).toHaveBeenNthCalledWith(
      1,
      'event-detail:augusta-ga:food-fest-2026-05-01',
      { expire: 0 },
    );
    expect(revalidateTag).toHaveBeenNthCalledWith(2, 'event-city:augusta:ga', { expire: 0 });
    expect(revalidateTag).toHaveBeenNthCalledWith(3, 'event-nearby-cities', { expire: 0 });
    expect(revalidateTag).toHaveBeenNthCalledWith(4, 'event-nearby:event-1', { expire: 0 });
    expect(revalidatePath).toHaveBeenNthCalledWith(1, '/events/augusta-ga/food-fest-2026-05-01');
    expect(revalidatePath).toHaveBeenNthCalledWith(2, '/events/augusta-ga');
    expect(revalidatePath).toHaveBeenNthCalledWith(3, '/city/augusta-ga');
    expect(revalidatePath).toHaveBeenNthCalledWith(4, '/events');
  });

  it('expires only the detail cache for detail-scoped targets', () => {
    invalidateEventPage({
      citySlug: 'augusta-ga',
      eventSlug: 'food-fest-2026-05-01',
      city: 'Augusta',
      state: 'GA',
      eventId: 'event-1',
      cacheScope: 'detail',
    });

    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith('event-detail:augusta-ga:food-fest-2026-05-01', {
      expire: 0,
    });
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/events/augusta-ga/food-fest-2026-05-01');
  });

  it('expires the exact static route used by cached 200, 404, and 308 outcomes', () => {
    invalidateEventPage({
      citySlug: 'augusta-ga',
      eventSlug: 'food-fest-2026-05-01',
      city: 'Augusta',
      state: 'GA',
      eventId: 'event-1',
      cacheScope: 'detail',
    });

    expect(revalidatePath).toHaveBeenCalledWith('/events/augusta-ga/food-fest-2026-05-01');
    expect(revalidateTag).toHaveBeenCalledWith('event-detail:augusta-ga:food-fest-2026-05-01', {
      expire: 0,
    });
  });

  it('expires every event-detail route when canonical eligibility changes', () => {
    invalidateEventPage({
      citySlug: 'augusta-ga',
      eventSlug: 'food-fest-2026-05-01',
      city: 'Augusta',
      state: 'GA',
      eventId: 'event-1',
      canonicalizationChanged: true,
    });

    expect(revalidatePath).toHaveBeenCalledWith('/events/[city-slug]/[event-slug]', 'page');
  });

  it('expires both old and new static event routes after an identity change', () => {
    invalidateEventCacheTargets([
      {
        citySlug: 'augusta-ga',
        eventSlug: 'old-fest-2026-05-01',
        city: 'Augusta',
        state: 'GA',
        eventId: 'event-1',
      },
      {
        citySlug: 'augusta-ga',
        eventSlug: 'new-fest-2026-05-01',
        city: 'Augusta',
        state: 'GA',
        eventId: 'event-1',
      },
    ]);

    expect(revalidatePath).toHaveBeenCalledWith('/events/augusta-ga/old-fest-2026-05-01');
    expect(revalidatePath).toHaveBeenCalledWith('/events/augusta-ga/new-fest-2026-05-01');
  });

  it('expires detail and city caches without the index or nearby caches for city-scoped targets', () => {
    invalidateEventPage({
      citySlug: 'augusta-ga',
      eventSlug: 'food-fest-2026-05-01',
      city: 'Augusta',
      state: 'GA',
      eventId: 'event-1',
      cacheScope: 'city',
    });

    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenNthCalledWith(
      1,
      'event-detail:augusta-ga:food-fest-2026-05-01',
      { expire: 0 },
    );
    expect(revalidateTag).toHaveBeenNthCalledWith(2, 'event-city:augusta:ga', { expire: 0 });
    expect(revalidatePath).toHaveBeenCalledTimes(3);
    expect(revalidatePath).toHaveBeenNthCalledWith(1, '/events/augusta-ga/food-fest-2026-05-01');
    expect(revalidatePath).toHaveBeenNthCalledWith(2, '/events/augusta-ga');
    expect(revalidatePath).toHaveBeenNthCalledWith(3, '/city/augusta-ga');
  });

  it('revalidates both the old and new city listing paths when an event moves cities', () => {
    invalidateEventPage({
      citySlug: 'aiken-ga',
      eventSlug: 'food-fest-2026-05-01',
      city: 'Aiken',
      state: 'GA',
      eventId: 'event-1',
    });
    invalidateEventPage({
      citySlug: 'augusta-ga',
      eventSlug: 'food-fest-2026-05-01',
      city: 'Augusta',
      state: 'GA',
      eventId: 'event-1',
    });

    expect(revalidatePath).toHaveBeenCalledWith('/events/aiken-ga');
    expect(revalidatePath).toHaveBeenCalledWith('/events/augusta-ga');
    expect(revalidatePath).toHaveBeenCalledWith('/city/aiken-ga');
    expect(revalidatePath).toHaveBeenCalledWith('/city/augusta-ga');
  });

  it('chunks invalidation targets at the endpoint limit', () => {
    const targets = Array.from({ length: 201 }, (_, index) => ({
      citySlug: `city-${index}`,
      eventSlug: `event-${index}`,
      city: `City ${index}`,
      state: 'GA',
      eventId: `event-${index}`,
    }));

    const chunks = chunkEventCacheTargets(targets, 100);

    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 100, 1]);
  });

  const validTarget = {
    citySlug: 'augusta-ga',
    eventSlug: 'food-fest-2026-05-01',
    city: 'Augusta',
    state: 'GA',
    eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  };

  it('accepts a well-formed platform target', () => {
    expect(isEventCacheTarget(validTarget)).toBe(true);
  });

  it('accepts a supported scoped target', () => {
    expect(isEventCacheTarget({ ...validTarget, cacheScope: 'detail' })).toBe(true);
    expect(isEventCacheTarget({ ...validTarget, cacheScope: 'city' })).toBe(true);
  });

  it('rejects an unsupported cache scope', () => {
    expect(isEventCacheTarget({ ...validTarget, cacheScope: 'index' })).toBe(false);
  });

  it('rejects a non-UUID event id', () => {
    expect(isEventCacheTarget({ ...validTarget, eventId: 'event-1' })).toBe(false);
  });

  it('rejects a non-v4 UUID event id', () => {
    expect(
      isEventCacheTarget({
        ...validTarget,
        eventId: 'a0eebc99-9c0b-2ef8-bb6d-6bb9bd380a11',
      }),
    ).toBe(false);
  });

  it('rejects an event slug that is not title-YYYY-MM-DD shaped', () => {
    expect(isEventCacheTarget({ ...validTarget, eventSlug: 'food-fest-2026-05-01-extra' })).toBe(
      false,
    );
  });

  it('rejects an event slug with an invalid date', () => {
    expect(isEventCacheTarget({ ...validTarget, eventSlug: 'food-fest-2026-13-01' })).toBe(false);
  });

  it('rejects an event slug with an impossible calendar date', () => {
    expect(isEventCacheTarget({ ...validTarget, eventSlug: 'food-fest-2026-02-31' })).toBe(false);
  });

  it('accepts a valid leap-day event slug', () => {
    expect(isEventCacheTarget({ ...validTarget, eventSlug: 'food-fest-2028-02-29' })).toBe(true);
  });

  it('rejects a city slug not ending in a platform state', () => {
    expect(isEventCacheTarget({ ...validTarget, citySlug: 'augusta-tx' })).toBe(false);
  });

  it('rejects a state outside the platform footprint', () => {
    expect(isEventCacheTarget({ ...validTarget, state: 'TX' })).toBe(false);
  });

  it('rejects an unbounded city name', () => {
    expect(isEventCacheTarget({ ...validTarget, city: 'A'.repeat(101) })).toBe(false);
  });

  it('rejects control characters in the city name', () => {
    expect(isEventCacheTarget({ ...validTarget, city: 'Augusta\u0000' })).toBe(false);
  });

  it('rejects a citySlug that does not match the slugified city', () => {
    expect(isEventCacheTarget({ ...validTarget, citySlug: 'atlanta-ga' })).toBe(false);
  });

  it('rejects tag-structure injection through the city name', () => {
    expect(isEventCacheTarget({ ...validTarget, city: 'Augusta:evil' })).toBe(false);
  });

  it('PLATFORM_STATES covers every state configured in CITIES', async () => {
    const [{ PLATFORM_STATES }, { CITIES }] = await Promise.all([
      import('@/lib/events/eventPageInvalidation'),
      import('@/lib/events/cities'),
    ]);
    const configuredStates = new Set(Object.values(CITIES).map((config) => config.state));
    for (const state of configuredStates) {
      expect(PLATFORM_STATES.has(state)).toBe(true);
    }
  });
});
