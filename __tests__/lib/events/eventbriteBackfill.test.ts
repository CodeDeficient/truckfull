import { describe, expect, it } from '@jest/globals';
import {
  backfillDescriptions,
  backfillMetadata,
  chunk,
  EVENTBRITE_ID_BATCH_SIZE,
  htmlToText,
  needsFullDescription,
  needsMetadata,
  type BackfillRow,
  type BackfillSource,
} from '@/lib/events/eventbriteBackfill';
import {
  EventbriteRateLimitExhausted,
  type EventbriteEventResult,
} from '@/lib/events/eventbriteApi';

function createStore(): {
  updates: Map<string, Record<string, unknown>>;
  store: { updateRawData: (id: string, rawData: Record<string, unknown>) => Promise<void> };
} {
  const updates = new Map<string, Record<string, unknown>>();
  return {
    updates,
    store: {
      async updateRawData(id, rawData) {
        updates.set(id, rawData);
      },
    },
  };
}

function createSource(
  events: EventbriteEventResult[],
  descriptions: Record<string, string | null | Error>,
  budget = 100,
): BackfillSource & { batches: string[][]; descriptionCalls: string[] } {
  let remaining = budget;
  const batches: string[][] = [];
  const descriptionCalls: string[] = [];
  return {
    batches,
    descriptionCalls,
    async fetchByIds(ids) {
      remaining--;
      batches.push([...ids]);
      return events.filter((event) => ids.includes(event.id));
    },
    async fetchDescription(id) {
      remaining--;
      descriptionCalls.push(id);
      const value = descriptions[id];
      if (value instanceof Error) throw value;
      return value ?? null;
    },
    remaining: () => remaining,
  };
}

const TAGGED: EventbriteEventResult = {
  id: 'eb1',
  tags: [
    { prefix: 'EventbriteCategory', display_name: 'Food & Drink' },
    { prefix: 'EventbriteFormat', display_name: 'Festival or Fair' },
  ],
  primary_venue: { name: 'Park', address: { city: 'Aiken', region: 'SC' } },
  primary_organizer: { name: 'Downtown Aiken' },
};

function row(
  id: string,
  externalId: string,
  rawData: unknown = { RowKey: { _: externalId } },
): BackfillRow {
  return { id, externalId, rawData };
}

describe('htmlToText', () => {
  it('turns Eventbrite description HTML into readable text', () => {
    const html =
      '<div><p>Food trucks &amp; vendors</p><p>Kids&#39; zone<br>Free&nbsp;entry</p><ul><li>BBQ</li><li>Tacos</li></ul></div>';
    expect(htmlToText(html)).toBe("Food trucks & vendors\nKids' zone\nFree entry\nBBQ\nTacos");
  });

  it('caps very long descriptions', () => {
    expect(htmlToText(`<p>${'a'.repeat(9000)}</p>`)).toHaveLength(8000);
  });
});

describe('chunk', () => {
  it('splits ids into Eventbrite-sized batches', () => {
    const ids = Array.from({ length: 45 }, (_, index) => String(index));
    expect(chunk(ids, EVENTBRITE_ID_BATCH_SIZE).map((batch) => batch.length)).toEqual([20, 20, 5]);
  });
});

describe('backfillMetadata', () => {
  it('writes the same metadata to every row of an event listed under several cities', async () => {
    const { updates, store } = createStore();
    const source = createSource([TAGGED], {});
    const result = await backfillMetadata([row('a', 'eb1'), row('b', 'eb1')], source, store);

    expect(source.batches).toEqual([['eb1']]);
    expect(result).toEqual({ updatedRows: 2, missingIds: [] });
    for (const id of ['a', 'b']) {
      expect(updates.get(id)).toEqual({
        RowKey: { _: 'eb1' },
        eventbrite: {
          category: 'Food & Drink',
          subcategory: null,
          format: 'Festival or Fair',
          organizerTags: [],
          organizerName: 'Downtown Aiken',
          venueCity: 'Aiken',
          venueRegion: 'SC',
        },
      });
    }
  });

  it('skips rows that already have metadata and reports events Eventbrite no longer returns', async () => {
    const { updates, store } = createStore();
    const source = createSource([TAGGED], {});
    const done = row('c', 'eb2', { eventbrite: { category: null } });
    const result = await backfillMetadata([row('a', 'eb1'), row('b', 'gone'), done], source, store);

    expect(source.batches).toEqual([['eb1', 'gone']]);
    expect(result).toEqual({ updatedRows: 1, missingIds: ['gone'] });
    expect(updates.has('c')).toBe(false);
  });

  it('keeps a description that was already fetched', async () => {
    const { updates, store } = createStore();
    const source = createSource([TAGGED], {});
    await backfillMetadata(
      [row('a', 'eb1', { eventbrite: { fullDescription: 'Trucks' } })],
      source,
      store,
    );

    expect(updates.get('a')?.eventbrite).toMatchObject({
      fullDescription: 'Trucks',
      venueCity: 'Aiken',
    });
  });
});

describe('backfillDescriptions', () => {
  it('fetches each event once, in row order, and stores an empty string when there is none', async () => {
    const { updates, store } = createStore();
    const source = createSource([], { eb2: '<p>Food trucks</p>', eb1: null });
    const result = await backfillDescriptions(
      [row('a', 'eb2'), row('b', 'eb1'), row('c', 'eb2')],
      source,
      store,
      0,
    );

    expect(source.descriptionCalls).toEqual(['eb2', 'eb1']);
    expect(result).toEqual({ updatedRows: 3, fetched: 2, failedIds: [], stoppedForBudget: false });
    expect(updates.get('c')?.eventbrite).toEqual({ fullDescription: 'Food trucks' });
    expect(updates.get('b')?.eventbrite).toEqual({ fullDescription: '' });
  });

  it('stops before the budget floor so the next run can resume', async () => {
    const { store } = createStore();
    const source = createSource([], { eb1: 'x', eb2: 'y', eb3: 'z' }, 12);
    const rows = [row('a', 'eb1'), row('b', 'eb2'), row('c', 'eb3')];
    const result = await backfillDescriptions(rows, source, store, 10);

    expect(result.stoppedForBudget).toBe(true);
    expect(source.descriptionCalls).toEqual(['eb1', 'eb2']);
  });

  it('stops when Eventbrite reports the budget is exhausted and records other failures', async () => {
    const { updates, store } = createStore();
    const source = createSource([], {
      eb1: new Error('Eventbrite API error: 500 Server Error'),
      eb2: new EventbriteRateLimitExhausted(1900, 1900, null),
      eb3: 'never',
    });
    const result = await backfillDescriptions(
      [row('a', 'eb1'), row('b', 'eb2'), row('c', 'eb3')],
      source,
      store,
      0,
    );

    expect(result).toEqual({
      updatedRows: 0,
      fetched: 0,
      failedIds: ['eb1'],
      stoppedForBudget: true,
    });
    expect(updates.size).toBe(0);
  });

  it('skips rows that already have a full description', () => {
    expect(needsFullDescription({ eventbrite: { fullDescription: '' } })).toBe(false);
    expect(needsFullDescription({ eventbrite: {} })).toBe(true);
    expect(needsMetadata({ eventbrite: { fullDescription: 'x' } })).toBe(true);
  });
});
