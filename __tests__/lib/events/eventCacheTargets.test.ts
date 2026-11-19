import { describe, expect, it } from '@jest/globals';
import {
  buildDemotionTargets,
  buildEventCacheTarget,
  buildIdentityChangeTargets,
  buildRelevanceFlipTargets,
  buildVettingCacheTargets,
  buildVettingEligibilityTargets,
  VETTING_ELIGIBILITY_THRESHOLD,
  type EventIdentityRow,
  type VettingCacheMetadata,
} from '@/lib/events/eventCacheTargets';
import { toEventCacheTarget } from '@/lib/events/syncCacheTargets';
import type { EventCacheTarget } from '@/lib/events/eventPageInvalidation';

const VALID_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function makeRow(overrides: Partial<EventIdentityRow> = {}): EventIdentityRow {
  return {
    id: VALID_ID,
    city: 'Augusta',
    state: 'GA',
    title: 'Food Fest',
    event_start_date: '2026-05-01',
    ...overrides,
  };
}

const EXPECTED_TARGET: EventCacheTarget = {
  eventId: VALID_ID,
  city: 'Augusta',
  state: 'GA',
  citySlug: 'augusta-ga',
  eventSlug: 'food-fest-2026-05-01',
};

describe('buildEventCacheTarget', () => {
  it('builds a target the endpoint will accept for a conforming row', () => {
    expect(buildEventCacheTarget(makeRow())).toEqual(EXPECTED_TARGET);
  });

  it('reproduces the current toEventCacheTarget URL/slug behavior', () => {
    const row = makeRow();
    const fromRow = buildEventCacheTarget(row);
    const fromRecord = toEventCacheTarget({
      id: row.id,
      city: row.city,
      state: row.state,
      title: row.title,
      event_start_date: row.event_start_date,
    });
    expect(fromRow).toEqual(fromRecord);
  });

  it('returns null for a row whose state is outside the platform footprint', () => {
    expect(buildEventCacheTarget(makeRow({ state: 'TX' }))).toBeNull();
  });

  it('returns null for a row with a non-UUID event id', () => {
    expect(buildEventCacheTarget(makeRow({ id: 'event-1' }))).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    expect(buildEventCacheTarget(makeRow({ title: null }))).toBeNull();
    expect(buildEventCacheTarget(makeRow({ id: null }))).toBeNull();
    expect(buildEventCacheTarget(makeRow({ event_start_date: null }))).toBeNull();
  });
});

describe('buildIdentityChangeTargets', () => {
  it('emits distinct OLD and NEW targets when the title changes', () => {
    const before = makeRow({ title: 'Old Fest' });
    const after = makeRow({ title: 'New Fest' });
    const targets = buildIdentityChangeTargets(before, after);

    expect(targets).toHaveLength(2);
    expect(targets).toContainEqual({
      ...EXPECTED_TARGET,
      eventSlug: 'old-fest-2026-05-01',
      canonicalizationChanged: true,
    });
    expect(targets).toContainEqual({
      ...EXPECTED_TARGET,
      eventSlug: 'new-fest-2026-05-01',
      canonicalizationChanged: true,
    });
  });

  it('emits distinct OLD and NEW targets when the city changes', () => {
    const before = makeRow({ city: 'Augusta' });
    const after = makeRow({ city: 'Aiken' });
    const targets = buildIdentityChangeTargets(before, after);

    expect(targets).toHaveLength(2);
    expect(targets).toContainEqual({
      ...EXPECTED_TARGET,
      citySlug: 'augusta-ga',
      canonicalizationChanged: true,
    });
    expect(targets).toContainEqual({
      ...EXPECTED_TARGET,
      city: 'Aiken',
      citySlug: 'aiken-ga',
      canonicalizationChanged: true,
    });
  });

  it('emits distinct OLD and NEW targets when the date changes', () => {
    const before = makeRow({ event_start_date: '2026-05-01' });
    const after = makeRow({ event_start_date: '2026-05-02' });
    const targets = buildIdentityChangeTargets(before, after);

    expect(targets).toHaveLength(2);
    expect(targets).toContainEqual({
      ...EXPECTED_TARGET,
      eventSlug: 'food-fest-2026-05-01',
      canonicalizationChanged: true,
    });
    expect(targets).toContainEqual({
      ...EXPECTED_TARGET,
      eventSlug: 'food-fest-2026-05-02',
      canonicalizationChanged: true,
    });
  });

  it('deduplicates when OLD and NEW resolve to the same target', () => {
    const targets = buildIdentityChangeTargets(makeRow(), makeRow());
    expect(targets).toEqual([EXPECTED_TARGET]);
  });

  it('drops rows that cannot form a valid target', () => {
    const targets = buildIdentityChangeTargets(
      makeRow({ state: 'TX' }),
      makeRow({ title: 'New Fest' }),
    );
    expect(targets).toEqual([
      { ...EXPECTED_TARGET, eventSlug: 'new-fest-2026-05-01', canonicalizationChanged: true },
    ]);
  });
});

describe('buildDemotionTargets', () => {
  it('builds targets for every demoted row', () => {
    const rows = [
      makeRow({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', title: 'Fest A' }),
      makeRow({ id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', title: 'Fest B' }),
    ];
    const targets = buildDemotionTargets(rows);

    expect(targets).toHaveLength(2);
    expect(targets).toContainEqual({
      ...EXPECTED_TARGET,
      eventSlug: 'fest-a-2026-05-01',
      canonicalizationChanged: true,
    });
    expect(targets).toContainEqual({
      ...EXPECTED_TARGET,
      eventId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      eventSlug: 'fest-b-2026-05-01',
      canonicalizationChanged: true,
    });
  });

  it('deduplicates repeated rows', () => {
    const targets = buildDemotionTargets([makeRow(), makeRow()]);
    expect(targets).toEqual([{ ...EXPECTED_TARGET, canonicalizationChanged: true }]);
  });

  it('drops rows that cannot form a valid target', () => {
    const targets = buildDemotionTargets([makeRow({ state: 'TX' }), makeRow()]);
    expect(targets).toEqual([{ ...EXPECTED_TARGET, canonicalizationChanged: true }]);
  });
});

describe('buildRelevanceFlipTargets', () => {
  it('returns the event target when the relevance flag flips to true', () => {
    expect(buildRelevanceFlipTargets(makeRow({ vetting_score: 40 }), true)).toEqual([
      { ...EXPECTED_TARGET, canonicalizationChanged: true },
    ]);
  });

  it('does not trigger global canonical invalidation for an ineligible relevance flip', () => {
    expect(buildRelevanceFlipTargets(makeRow({ vetting_score: 20 }), true)).toEqual([
      EXPECTED_TARGET,
    ]);
  });

  it('returns no targets when the relevance flag is not set to true', () => {
    expect(buildRelevanceFlipTargets(makeRow(), false)).toEqual([]);
  });

  it('returns no targets when the row cannot form a valid target', () => {
    expect(buildRelevanceFlipTargets(makeRow({ state: 'TX' }), true)).toEqual([]);
  });
});

describe('buildVettingEligibilityTargets', () => {
  it('returns the event target when the score crosses the eligibility threshold upward', () => {
    expect(buildVettingEligibilityTargets(makeRow(), 20, 40)).toEqual([
      { ...EXPECTED_TARGET, canonicalizationChanged: true },
    ]);
  });

  it('returns the event target when the score crosses the eligibility threshold downward', () => {
    expect(buildVettingEligibilityTargets(makeRow(), 40, 20)).toEqual([
      { ...EXPECTED_TARGET, canonicalizationChanged: true },
    ]);
  });

  it('marks threshold crossings for canonical route invalidation', () => {
    expect(buildVettingEligibilityTargets(makeRow(), 20, 40)).toEqual([
      { ...EXPECTED_TARGET, canonicalizationChanged: true },
    ]);
  });

  it('returns no targets when the score stays on the same side of the threshold', () => {
    expect(buildVettingEligibilityTargets(makeRow(), 20, 25)).toEqual([]);
    expect(buildVettingEligibilityTargets(makeRow(), 40, 50)).toEqual([]);
  });

  it('treats a null before-score as ineligible', () => {
    expect(buildVettingEligibilityTargets(makeRow(), null, 40)).toEqual([
      { ...EXPECTED_TARGET, canonicalizationChanged: true },
    ]);
    expect(buildVettingEligibilityTargets(makeRow(), null, 20)).toEqual([]);
  });

  it('uses the shared eligibility threshold constant', () => {
    expect(VETTING_ELIGIBILITY_THRESHOLD).toBe(30);
  });

  it('detects canonical eligibility fields changing across a sync', async () => {
    const { hasCanonicalizationChanged } = await import('@/lib/events/eventCacheTargets');

    expect(
      hasCanonicalizationChanged(
        { is_canonical: true, is_food_truck_relevant: true, is_hidden: false, vetting_score: 40 },
        { is_canonical: true, is_food_truck_relevant: true, is_hidden: false, vetting_score: 20 },
      ),
    ).toBe(true);
    expect(
      hasCanonicalizationChanged(
        { title: 'Old Fest' },
        { title: 'New Fest' },
      ),
    ).toBe(true);
  });

  it('ignores canonical fields omitted by sparse ingestion records', async () => {
    const { hasCanonicalizationChanged } = await import('@/lib/events/eventCacheTargets');

    expect(
      hasCanonicalizationChanged(
        { is_canonical: true, is_food_truck_relevant: true, is_hidden: false, vetting_score: 40 },
        { is_food_truck_relevant: true },
      ),
    ).toBe(false);
  });
});

describe('buildVettingCacheTargets', () => {
  const before: VettingCacheMetadata = {
    score: 40,
    researchConfidence: 0.4,
    vettedAt: '2026-04-01T00:00:00.000Z',
  };

  it('uses detail and city caches when an eligible score changes', () => {
    expect(
      buildVettingCacheTargets(makeRow(), before, {
        score: 50,
        researchConfidence: 0.4,
        vettedAt: before.vettedAt,
      }),
    ).toEqual([{ ...EXPECTED_TARGET, cacheScope: 'city' }]);
  });

  it('uses detail caches when only detail metadata changes', () => {
    expect(
      buildVettingCacheTargets(makeRow(), before, {
        score: 40,
        researchConfidence: 0.4,
        vettedAt: '2026-04-02T00:00:00.000Z',
      }),
    ).toEqual([{ ...EXPECTED_TARGET, cacheScope: 'detail' }]);
  });

  it('uses detail and city caches when research confidence changes', () => {
    expect(
      buildVettingCacheTargets(makeRow(), before, {
        score: 40,
        researchConfidence: 0.8,
        vettedAt: before.vettedAt,
      }),
    ).toEqual([{ ...EXPECTED_TARGET, cacheScope: 'city' }]);
  });

  it('does not invalidate when no public vetting field changes', () => {
    expect(buildVettingCacheTargets(makeRow(), before, before)).toEqual([]);
  });

  it('does not invalidate an ineligible event when its vetting metadata changes', () => {
    expect(
      buildVettingCacheTargets(
        makeRow(),
        { score: 20, researchConfidence: 0.2, vettedAt: before.vettedAt },
        { score: 25, researchConfidence: 0.8, vettedAt: '2026-04-02T00:00:00.000Z' },
      ),
    ).toEqual([]);
  });

  it('keeps full fan-out when eligibility changes', () => {
    expect(
      buildVettingCacheTargets(makeRow(), before, {
        score: 20,
        researchConfidence: 0.2,
        vettedAt: '2026-04-02T00:00:00.000Z',
      }),
    ).toEqual([{ ...EXPECTED_TARGET, canonicalizationChanged: true }]);

    expect(
      buildVettingCacheTargets(
        makeRow(),
        { score: 20, researchConfidence: 0.2, vettedAt: before.vettedAt },
        { score: 40, researchConfidence: 0.4, vettedAt: '2026-04-02T00:00:00.000Z' },
      ),
    ).toEqual([{ ...EXPECTED_TARGET, canonicalizationChanged: true }]);
  });
});
