import { describe, expect, it } from '@jest/globals';
import type { EprovalCalendarEntry } from '@/lib/events/types';

function makeMalformedEntry(): EprovalCalendarEntry {
  return {
    PartitionKey: { $: 'Edm.String', _: 'Public_Approved_partition' },
    RowKey: { $: 'Edm.String', _: 'malformed-row' },
    Timestamp: { $: 'Edm.DateTime', _: '2026-08-10T12:00:00Z' },
    CalendarData: { $: 'Edm.String', _: 'not-json{{{' },
    Group: { $: 'Edm.String', _: 'group-1' },
  };
}

describe('Savannah eProval feed boundary', () => {
  it('preserves malformed entries for central validation accounting', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      ({
        ok: true,
        json: async () => ({ result: [makeMalformedEntry()] }),
      }) as Response;

    try {
      const { fetchCalendarEntries } = await import('@/lib/events/savannahEproval');
      const entries = await fetchCalendarEntries('https://example.test/', ['partition-1']);

      expect(entries).toHaveLength(1);
      expect(entries[0].RowKey._).toBe('malformed-row');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('fails instead of treating a feed fetch failure as an empty feed', async () => {
    const { fetchAllSavannahEvents } = await import('@/lib/events/savannahEproval');
    const { SAVANNAH_CONFIG } = await import('@/lib/events/cities');

    await expect(
      fetchAllSavannahEvents({ ...SAVANNAH_CONFIG, calendarKey: '', clientUri: '' }),
    ).rejects.toThrow('calendarKey and clientUri are required');
  });
});
