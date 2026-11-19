import { describe, expect, it } from '@jest/globals';

import {
  ensureEventContentHash,
  getEventComparison,
  isValidContentHash,
  isUnchangedEvent,
} from '@/lib/events/eventComparison';
import type { CalendarData, EprovalCalendarEntry } from '@/lib/events/types';

const calendarData: CalendarData = {
  calendarTitle: 'Food truck festival',
  calendarStartDate: '08-06-2026',
  calendarDescription: 'A neighborhood event',
};

const entry: EprovalCalendarEntry = {
  PartitionKey: { $: 'Edm.String', _: 'RSS_Approved_event-1' },
  RowKey: { $: 'Edm.String', _: 'event-1' },
  Timestamp: { $: 'Edm.DateTime', _: '2026-08-06T00:00:00.000Z' },
  CalendarData: { $: 'Edm.String', _: JSON.stringify(calendarData) },
  Group: { $: 'Edm.String', _: 'group-1' },
};

describe('event comparison', () => {
  it('prefers a durable content hash over the source timestamp', () => {
    expect(
      isUnchangedEvent(
        { contentHash: 'same-hash', sourceUpdatedAt: 'old-time' },
        { contentHash: 'same-hash', sourceUpdatedAt: 'new-time' },
      ),
    ).toBe(true);
  });

  it('does not treat a missing incoming hash as unchanged legacy data', () => {
    expect(
      isUnchangedEvent(
        { contentHash: 'stored-hash', sourceUpdatedAt: 'same-time' },
        { contentHash: null, sourceUpdatedAt: 'same-time' },
      ),
    ).toBe(false);
  });

  it('creates and persists a hash when an entry has none', () => {
    const hashedEntry = ensureEventContentHash(entry, calendarData);

    expect(hashedEntry.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(getEventComparison(hashedEntry)).toEqual({
      contentHash: hashedEntry.contentHash,
      sourceUpdatedAt: '2026-08-06T00:00:00.000Z',
    });
  });

  it('accepts only SHA-256 content hashes from the projected database value', () => {
    expect(isValidContentHash('a'.repeat(64))).toBe(true);
    expect(isValidContentHash('same-hash')).toBe(false);
    expect(isValidContentHash(123)).toBe(false);
  });
});
