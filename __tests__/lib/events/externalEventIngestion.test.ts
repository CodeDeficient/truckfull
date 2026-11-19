import { describe, expect, it } from '@jest/globals';
import type { EprovalCalendarEntry } from '@/lib/events/types';
import {
  collectIngestionInvalidationTargets,
  isSystemicValidationFailure,
  processEntries,
  type ProcessEntriesDeps,
} from '@/lib/events/externalEventIngestion';
import type { ExistingEventRow } from '@/lib/events/externalEventIngestion';
import type { ExternalEventInsert } from '@/lib/events/buildRecord';

function makeEntry(
  rowKey: string,
  payload: Record<string, unknown>,
): EprovalCalendarEntry {
  return {
    PartitionKey: { $: 'Edm.String', _: 'Public_Approved_savannah' },
    RowKey: { $: 'Edm.String', _: rowKey },
    Timestamp: { $: 'Edm.DateTime', _: '2026-08-10T12:00:00Z' },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(payload) },
    Group: { $: 'Edm.String', _: 'group-1' },
  };
}

const config = {
  city: 'Savannah',
  state: 'GA',
  source: 'savannah_eproval',
  sourceType: 'eproval' as const,
};

const deps: ProcessEntriesDeps = {
  geocodeAddress: async () => ({ lat: 32, lng: -81, pending: false }),
  isEventBlocked: () => false,
  cleanAddress: (address: string) => address,
};

function validPayload(title = 'Savannah Food Truck Festival'): Record<string, string> {
  return {
    calendarTitle: title,
    calendarStartDate: '08-15-2026',
    calendarLocation: 'Forsyth Park, Savannah, GA',
  };
}

describe('processEntries validation boundary', () => {
  it('skips an invalid record while ingesting valid neighboring records', async () => {
    const result = await processEntries(
      [
        makeEntry('bad-row', { calendarDescription: 'private source content' }),
        makeEntry('good-row', validPayload()),
      ],
      config,
      new Map(),
      new Map(),
      deps,
    );

    expect(result.records).toHaveLength(1);
    expect(result.records[0].external_id).toBe('good-row');
    expect(result.skipped).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.validationFailures).toEqual([
      {
        source: 'savannah_eproval',
        recordId: 'bad-row',
        partition: 'Public_Approved_savannah',
        timestamp: '2026-08-10T12:00:00Z',
        issues: [
          { path: ['calendarTitle'], code: 'invalid_type' },
          { path: ['calendarStartDate'], code: 'invalid_type' },
        ],
      },
    ]);
  });

  it('classifies the current five-record failure as isolated', () => {
    expect(isSystemicValidationFailure(2371, 2366, 5)).toBe(false);
  });

  it('classifies an all-invalid or abnormally high-failure feed as systemic', () => {
    expect(isSystemicValidationFailure(10, 0, 10)).toBe(true);
    expect(isSystemicValidationFailure(100, 90, 10)).toBe(true);
  });
});

const NEW_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const OLD_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function makeInsert(overrides: Partial<ExternalEventInsert> = {}): ExternalEventInsert {
  return {
    source: 'savannah_eproval',
    source_type: 'eproval',
    external_id: 'ext-1',
    title: 'Food Fest',
    city: 'Augusta',
    state: 'GA',
    event_start_date: '2026-05-01',
    ...overrides,
  } as ExternalEventInsert;
}

function makeExisting(overrides: Partial<ExistingEventRow> = {}): ExistingEventRow {
  return {
    contentHash: null,
    sourceUpdatedAt: null,
    id: OLD_ID,
    title: 'Old Fest',
    city: 'Augusta',
    state: 'GA',
    event_start_date: '2026-05-01',
    ...overrides,
  };
}

describe('collectIngestionInvalidationTargets', () => {
  it('invalidates a previously cached-missing target on create', () => {
    const targets = collectIngestionInvalidationTargets(
      [{ id: NEW_ID, external_id: 'ext-1' }],
      [makeInsert()],
      new Map(),
    );

    expect(targets).toEqual([
      {
        eventId: NEW_ID,
        city: 'Augusta',
        state: 'GA',
        citySlug: 'augusta-ga',
        eventSlug: 'food-fest-2026-05-01',
      },
    ]);
  });

  it('marks a newly eligible canonical event for global route invalidation', () => {
    const targets = collectIngestionInvalidationTargets(
      [{ id: NEW_ID, external_id: 'ext-1' }],
      [
        makeInsert({
          is_canonical: true,
          is_food_truck_relevant: true,
          is_hidden: false,
          vetting_score: 40,
        }),
      ],
      new Map(),
    );

    expect(targets).toEqual([
      {
        eventId: NEW_ID,
        city: 'Augusta',
        state: 'GA',
        citySlug: 'augusta-ga',
        eventSlug: 'food-fest-2026-05-01',
        canonicalizationChanged: true,
      },
    ]);
  });

  it('emits distinct OLD and NEW targets when the title changes', () => {
    const existingIds = new Map<string, ExistingEventRow>([['ext-1', makeExisting()]]);
    const targets = collectIngestionInvalidationTargets(
      [{ id: NEW_ID, external_id: 'ext-1' }],
      [makeInsert({ title: 'New Fest' })],
      existingIds,
    );

    expect(targets).toHaveLength(2);
    expect(targets).toContainEqual({
      eventId: OLD_ID,
      city: 'Augusta',
      state: 'GA',
      citySlug: 'augusta-ga',
      eventSlug: 'old-fest-2026-05-01',
      canonicalizationChanged: true,
    });
    expect(targets).toContainEqual({
      eventId: NEW_ID,
      city: 'Augusta',
      state: 'GA',
      citySlug: 'augusta-ga',
      eventSlug: 'new-fest-2026-05-01',
      canonicalizationChanged: true,
    });
  });

  it('upgrades an unchanged-identity target when canonical fields change', () => {
    const existingIds = new Map<string, ExistingEventRow>([
      [
        'ext-1',
        makeExisting({
          id: NEW_ID,
          title: 'Food Fest',
          is_canonical: true,
          is_food_truck_relevant: true,
          is_hidden: false,
          vetting_score: 20,
        }),
      ],
    ]);
    const targets = collectIngestionInvalidationTargets(
      [{ id: NEW_ID, external_id: 'ext-1' }],
      [
        makeInsert({
          is_canonical: true,
          is_food_truck_relevant: true,
          is_hidden: false,
          vetting_score: 40,
        }),
      ],
      existingIds,
    );

    expect(targets).toEqual([
      {
        eventId: NEW_ID,
        city: 'Augusta',
        state: 'GA',
        citySlug: 'augusta-ga',
        eventSlug: 'food-fest-2026-05-01',
        canonicalizationChanged: true,
      },
    ]);
  });

  it('does not globally invalidate sparse existing-row updates', () => {
    const existingIds = new Map<string, ExistingEventRow>([
      [
        'ext-1',
        makeExisting({
          id: NEW_ID,
          title: 'Food Fest',
          is_canonical: true,
          is_food_truck_relevant: true,
          is_hidden: false,
          vetting_score: 40,
        }),
      ],
    ]);
    const targets = collectIngestionInvalidationTargets(
      [{ id: NEW_ID, external_id: 'ext-1' }],
      [makeInsert()],
      existingIds,
    );

    expect(targets).toEqual([
      {
        eventId: NEW_ID,
        city: 'Augusta',
        state: 'GA',
        citySlug: 'augusta-ga',
        eventSlug: 'food-fest-2026-05-01',
      },
    ]);
  });

  it('emits distinct OLD and NEW targets when the city changes', () => {
    const existingIds = new Map<string, ExistingEventRow>([['ext-1', makeExisting()]]);
    const targets = collectIngestionInvalidationTargets(
      [{ id: NEW_ID, external_id: 'ext-1' }],
      [makeInsert({ city: 'Aiken' })],
      existingIds,
    );

    expect(targets).toHaveLength(2);
    expect(targets).toContainEqual({
      eventId: OLD_ID,
      city: 'Augusta',
      state: 'GA',
      citySlug: 'augusta-ga',
      eventSlug: 'old-fest-2026-05-01',
      canonicalizationChanged: true,
    });
    expect(targets).toContainEqual({
      eventId: NEW_ID,
      city: 'Aiken',
      state: 'GA',
      citySlug: 'aiken-ga',
      eventSlug: 'food-fest-2026-05-01',
      canonicalizationChanged: true,
    });
  });

  it('emits distinct OLD and NEW targets when the date changes', () => {
    const existingIds = new Map<string, ExistingEventRow>([['ext-1', makeExisting()]]);
    const targets = collectIngestionInvalidationTargets(
      [{ id: NEW_ID, external_id: 'ext-1' }],
      [makeInsert({ event_start_date: '2026-05-02' })],
      existingIds,
    );

    expect(targets).toHaveLength(2);
    expect(targets).toContainEqual({
      eventId: OLD_ID,
      city: 'Augusta',
      state: 'GA',
      citySlug: 'augusta-ga',
      eventSlug: 'old-fest-2026-05-01',
      canonicalizationChanged: true,
    });
    expect(targets).toContainEqual({
      eventId: NEW_ID,
      city: 'Augusta',
      state: 'GA',
      citySlug: 'augusta-ga',
      eventSlug: 'food-fest-2026-05-02',
      canonicalizationChanged: true,
    });
  });

  it('deduplicates when OLD and NEW resolve to the same target', () => {
    const existingIds = new Map<string, ExistingEventRow>([
      ['ext-1', makeExisting({ id: NEW_ID, title: 'Food Fest' })],
    ]);
    const targets = collectIngestionInvalidationTargets(
      [{ id: NEW_ID, external_id: 'ext-1' }],
      [makeInsert()],
      existingIds,
    );

    expect(targets).toEqual([
      {
        eventId: NEW_ID,
        city: 'Augusta',
        state: 'GA',
        citySlug: 'augusta-ga',
        eventSlug: 'food-fest-2026-05-01',
      },
    ]);
  });

  it('drops rows that cannot form a valid target', () => {
    const targets = collectIngestionInvalidationTargets(
      [{ id: NEW_ID, external_id: 'ext-1' }],
      [makeInsert({ state: 'TX' })],
      new Map(),
    );

    expect(targets).toEqual([]);
  });
});
