import { describe, it, expect } from '@jest/globals';
import type { CalendarData, EprovalCalendarEntry } from '@/lib/events/types';
import {
  buildRecord,
  formatDateForDb,
  parseEntry,
  parseEntryWithDiagnostics,
  type BuildRecordInput,
  type ExternalEventInsert,
} from '@/lib/events/buildRecord';

interface EprovalCityConfig {
  city: string;
  state: string;
  source: string;
  sourceType:
    | 'eproval'
    | 'civicplus_rss'
    | 'simpleview_rss'
    | 'ical'
    | 'aiken_playwright'
    | 'eventbrite'
    | 'tourism_html'
    | 'algolia_api'
    | 'timely_api'
    | 'arcgis_permits';
}

function makeEntry(overrides: Partial<EprovalCalendarEntry> = {}): EprovalCalendarEntry {
  return {
    PartitionKey: { $: 'Edm.String', _: 'Public_Approved_aa8ad079-f09e-481a-9ebd-387d9a5e037a' },
    RowKey: { $: 'Edm.String', _: 'row-key-001' },
    Timestamp: { $: 'Edm.DateTime', _: '2026-03-29T00:00:00Z' },
    CalendarData: {
      $: 'Edm.String',
      _: JSON.stringify({
        calendarTitle: 'Savannah Food Truck Festival',
        calendarDescription: 'Great food trucks at Forsyth Park.',
        calendarCategory: 'Special Event Permit',
        calendarStartDate: '04-15-2026',
        calendarEndDate: '04-15-2026',
        calendarStartTime: '11:00 am',
        calendarEndTime: '7:00 pm',
        calendarPermitStartDate: '04-14-2026',
        calendarPermitEndDate: '04-16-2026',
        calendarLocation: 'Forsyth Park, Savannah, GA',
        calendarWebsite: 'https://example.com',
        calendarOrganization: 'Savannah Events Co',
      }),
    },
    Group: { $: 'Edm.String', _: 'group-001' },
    ...overrides,
  };
}

function callBuild(overrides: Partial<BuildRecordInput> = {}): {
  entry: EprovalCalendarEntry;
  data: CalendarData;
  permitStatus: 'Approved';
  lat: number | null;
  lng: number | null;
  config: EprovalCityConfig;
  relevanceScore: number;
} {
  return {
    entry: overrides.entry ?? makeEntry(),
    data:
      overrides.data ??
      ({
        calendarTitle: 'Test Event',
        calendarStartDate: '04-15-2026',
        calendarEndDate: '04-15-2026',
        calendarStartTime: '11:00 am',
        calendarEndTime: '7:00 pm',
      } as CalendarData),
    permitStatus: 'Approved',
    lat: null,
    lng: null,
    config: {
      city: 'Savannah',
      state: 'GA',
      source: 'savannah_eproval',
      sourceType: 'eproval',
    },
    relevanceScore: 0,
  };
}

describe('buildRecord', () => {
  describe('basic record creation', () => {
    it('creates record with all fields from entry and data', () => {
      const result = buildRecord({
        ...callBuild(),
        lat: 32.0761,
        lng: -81.0959,
        data: { calendarTitle: 'Test Event', calendarStartDate: '04-15-2026' },
      });

      expect(result.source).toBe('savannah_eproval');
      expect(result.external_id).toBe('row-key-001');
      expect(result.title).toBe('Test Event');
      expect(result.location_lat).toBe(32.0761);
      expect(result.location_lng).toBe(-81.0959);
    });

    it('parses date format MM-DD-YYYY correctly', () => {
      const result = buildRecord({
        ...callBuild(),
        data: {
          calendarTitle: 'Event',
          calendarStartDate: '04-15-2026',
          calendarEndDate: '04-15-2026',
        },
      });

      expect(result.event_start_date).toBe('2026-04-15');
      expect(result.event_end_date).toBe('2026-04-15');
    });

    it('parses time format h:mm am/pm to 24h', () => {
      const result = buildRecord({
        ...callBuild(),
        data: {
          calendarTitle: 'Event',
          calendarStartDate: '04-15-2026',
          calendarStartTime: '11:00 am',
          calendarEndTime: '7:00 pm',
        },
      });

      expect(result.event_start_time).toBe('11:00');
      expect(result.event_end_time).toBe('19:00');
    });
  });

  describe('verification tier and badge', () => {
    it('sets tier 3 government_verified for eproval source', () => {
      const result = buildRecord(callBuild());

      expect(result.verification_tier).toBe(3);
      expect(result.verification_badge).toBe('government_verified');
    });

    it('sets tier 2 source_verified for civicplus_rss source', () => {
      const result = buildRecord({
        ...callBuild(),
        config: {
          city: 'Columbia',
          state: 'SC',
          source: 'columbia_civicplus',
          sourceType: 'civicplus_rss',
        },
      });

      expect(result.verification_tier).toBe(2);
      expect(result.verification_badge).toBe('source_verified');
    });

    it('sets tier 2 source_verified for eventbrite source', () => {
      const result = buildRecord({
        ...callBuild(),
        config: {
          city: 'Columbia',
          state: 'SC',
          source: 'columbia_eventbrite',
          sourceType: 'eventbrite',
        },
      });

      expect(result.verification_tier).toBe(2);
      expect(result.verification_badge).toBe('source_verified');
    });

    it('sets tier 2 source_verified for algolia_api source', () => {
      const result = buildRecord({
        ...callBuild(),
        config: {
          city: 'Greenville',
          state: 'SC',
          source: 'greenville_algolia',
          sourceType: 'algolia_api',
        },
      });

      expect(result.verification_tier).toBe(2);
      expect(result.verification_badge).toBe('source_verified');
    });

    it('sets tier 3 government_verified for arcgis_permits source', () => {
      const result = buildRecord({
        ...callBuild(),
        config: {
          city: 'Durham',
          state: 'NC',
          source: 'durham_permits',
          sourceType: 'arcgis_permits',
        },
      });

      expect(result.verification_tier).toBe(3);
      expect(result.verification_badge).toBe('government_verified');
    });

    it('sets tier 2 source_verified for timely_api source', () => {
      const result = buildRecord({
        ...callBuild(),
        config: {
          city: 'Augusta',
          state: 'GA',
          source: 'augusta_timely',
          sourceType: 'timely_api',
        },
      });

      expect(result.verification_tier).toBe(2);
      expect(result.verification_badge).toBe('source_verified');
    });
  });

  describe('null handling', () => {
    it('handles null lat/lng', () => {
      const result = buildRecord(callBuild());

      expect(result.location_lat).toBeNull();
      expect(result.location_lng).toBeNull();
    });

    it('handles missing optional fields in data', () => {
      const result = buildRecord({
        ...callBuild(),
        data: { calendarTitle: 'Minimal Event', calendarStartDate: '04-15-2026' },
      });

      expect(result.description).toBeNull();
      expect(result.category).toBeNull();
      expect(result.organization).toBeNull();
      expect(result.website).toBeNull();
      expect(result.location_address).toBeNull();
      expect(result.event_start_time).toBeNull();
      expect(result.event_end_time).toBeNull();
    });
  });

  describe('raw_data preservation', () => {
    it('stores raw entry in raw_data field', () => {
      const entry = makeEntry({
        RowKey: { $: 'Edm.String', _: 'custom-key-123' },
      });
      const result = buildRecord({
        ...callBuild({ entry }),
        data: { calendarTitle: 'Event', calendarStartDate: '04-15-2026' },
      });

      expect(result.raw_data).toEqual(entry);
    });
  });

  describe('relevance decision is left to the classifier', () => {
    it('does not set is_food_truck_relevant, so the classifier decision survives re-ingestion', () => {
      const result = buildRecord({ ...callBuild(), relevanceScore: 10 });
      expect(result).not.toHaveProperty('is_food_truck_relevant');
      expect(result.relevance_score).toBe(10);
    });

    it('clears relevance_classified_at so changed events are classified again', () => {
      expect(buildRecord({ ...callBuild(), relevanceScore: 0 }).relevance_classified_at).toBeNull();
    });
  });
});

describe('formatDateForDb', () => {
  it('returns null for null input', () => {
    expect(formatDateForDb(null)).toBeNull();
  });

  it('formats a valid date correctly (UTC)', () => {
    const date = new Date('2024-03-15T12:00:00Z');
    expect(formatDateForDb(date)).toBe('2024-03-15');
  });

  it('pads single digit month and day', () => {
    const date = new Date('2024-01-05T08:30:00Z');
    expect(formatDateForDb(date)).toBe('2024-01-05');
  });

  it('handles December', () => {
    const date = new Date('2024-12-25T00:00:00Z');
    expect(formatDateForDb(date)).toBe('2024-12-25');
  });

  it('handles end of year', () => {
    const date = new Date('2024-12-31T23:59:59Z');
    expect(formatDateForDb(date)).toBe('2024-12-31');
  });
});

describe('parseEntry', () => {
  function makeEprovalEntry(payload: object | null): EprovalCalendarEntry {
    return {
      PartitionKey: { $: 'Edm.String', _: 'p' },
      RowKey: { $: 'Edm.String', _: 'r' },
      Timestamp: { $: 'Edm.DateTime', _: '2026-03-29T00:00:00Z' },
      CalendarData:
        payload === null
          ? { $: 'Edm.String', _: '' }
          : { $: 'Edm.String', _: JSON.stringify(payload) },
    };
  }

  it('returns null when CalendarData is missing', () => {
    const entry = {} as unknown as EprovalCalendarEntry;
    expect(parseEntry(entry)).toBeNull();
  });

  it('returns null when CalendarData._ is empty', () => {
    expect(parseEntry(makeEprovalEntry(null))).toBeNull();
  });

  it('returns null when JSON is malformed', () => {
    const entry: EprovalCalendarEntry = {
      ...makeEprovalEntry({}),
      CalendarData: { $: 'Edm.String', _: 'not-json{{{' },
    };
    expect(parseEntry(entry)).toBeNull();
  });

  it('parses valid CalendarData', () => {
    const result = parseEntry(
      makeEprovalEntry({
        calendarTitle: 'Test Event',
        calendarStartDate: '04-15-2026',
      }),
    );
    expect(result).not.toBeNull();
    expect(result?.calendarTitle).toBe('Test Event');
  });

  it('returns null when Zod schema rejects missing required fields', () => {
    expect(parseEntry(makeEprovalEntry({ foo: 'bar' }))).toBeNull();
  });

  it('returns structured issue paths and codes without the raw payload', () => {
    const result = parseEntryWithDiagnostics(
      makeEprovalEntry({ calendarDescription: 'private source content' }),
    );

    expect(result.data).toBeNull();
    expect(result.issues).toEqual([
      { path: ['calendarTitle'], code: 'invalid_type' },
      { path: ['calendarStartDate'], code: 'invalid_type' },
    ]);
    expect(JSON.stringify(result)).not.toContain('private source content');
  });
});
