import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { EventComparison } from '@/lib/events/eventComparison';

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

const FUTURE_DATE = futureDate(30);
const FUTURE_DATE_MMDDYYYY = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}-${d.getUTCFullYear()}`;
})();

const SAMPLE_EVENT = {
  id: '1234567890',
  name: 'Myrtle Beach Food Festival',
  start_date: FUTURE_DATE,
  start_time: '18:00',
  end_date: FUTURE_DATE,
  end_time: '21:00',
  primary_venue_id: '54321',
  url: 'https://www.eventbrite.com/e/myrtle-beach-food-festival-1234567890',
  summary: 'Annual food festival with food trucks and live music',
  status: 'live',
  category: { name: 'Food & Drink' },
  organizer: { name: 'Myrtle Beach Events' },
};

const SAMPLE_EVENTBRITE_RESPONSE = JSON.stringify({
  events: {
    results: [SAMPLE_EVENT],
    pagination: { object_count: 1, page_size: 50, continuation: null },
  },
});

const SAMPLE_EMPTY_RESPONSE = JSON.stringify({
  events: { results: [], pagination: { object_count: 0, page_size: 50, continuation: null } },
});

const SAMPLE_MULTI_STATUS_RESPONSE = JSON.stringify({
  events: {
    results: [
      { ...SAMPLE_EVENT, id: 'live1', name: 'Live Event', status: 'live' },
      { ...SAMPLE_EVENT, id: 'draft1', name: 'Draft Event', status: 'draft' },
      { ...SAMPLE_EVENT, id: 'ended1', name: 'Ended Event', status: 'ended' },
      { ...SAMPLE_EVENT, id: 'canceled1', name: 'Canceled Event', status: 'canceled' },
    ],
    pagination: { object_count: 4, page_size: 50, continuation: null },
  },
});

const SAMPLE_NO_END_TIME_RESPONSE = JSON.stringify({
  events: {
    results: [
      {
        ...SAMPLE_EVENT,
        id: 'noend',
        name: 'No End Time Event',
        end_date: FUTURE_DATE,
        end_time: '',
      },
    ],
    pagination: { object_count: 1, page_size: 50, continuation: null },
  },
});

const SAMPLE_NO_START_TIME_RESPONSE = JSON.stringify({
  events: {
    results: [
      {
        ...SAMPLE_EVENT,
        id: 'nostart',
        name: 'No Start Time Event',
        start_time: '',
        end_time: '',
      },
    ],
    pagination: { object_count: 1, page_size: 50, continuation: null },
  },
});

const SAMPLE_VENUE_RESPONSE = JSON.stringify({
  id: '54321',
  name: 'Myrtle Beach Boardwalk',
  address: {
    address_1: '1100 N Ocean Blvd',
    city: 'Myrtle Beach',
    region: 'SC',
    postal_code: '29577',
    latitude: '33.693552',
    longitude: '-78.88059969999999',
  },
});

const SAMPLE_VENUE = JSON.parse(SAMPLE_VENUE_RESPONSE);

const SAMPLE_TAGGED_EVENT = {
  ...SAMPLE_EVENT,
  tags: [
    { prefix: 'EventbriteCategory', tag: 'EventbriteCategory/110', display_name: 'Food & Drink' },
    { prefix: 'EventbriteSubCategory', tag: 'EventbriteSubCategory/10001', display_name: 'Food' },
    { prefix: 'EventbriteFormat', tag: 'EventbriteFormat/5', display_name: 'Festival or Fair' },
    { prefix: 'OrganizerTag', tag: 'OrganizerTag/foodtrucks', display_name: 'foodtrucks' },
    { prefix: 'OrganizerTag', tag: 'OrganizerTag/family', display_name: ' family ' },
    { prefix: 'OrganizerTag', tag: 'OrganizerTag/blank', display_name: '  ' },
  ],
  primary_venue: SAMPLE_VENUE,
  primary_organizer: { name: 'Grand Strand Events' },
};

const SAMPLE_TAGGED_RESPONSE = JSON.stringify({
  events: {
    results: [SAMPLE_TAGGED_EVENT],
    pagination: { object_count: 1, page_size: 50, continuation: null },
  },
});

const SAMPLE_MINIMAL_VENUE_RESPONSE = JSON.stringify({
  id: '111',
  name: 'Some Venue',
});

const SAMPLE_INVALID_VENUE_RESPONSE = JSON.stringify({ error: 'not found' });

const SAMPLE_PAGE1_RESPONSE = JSON.stringify({
  events: {
    results: [
      { ...SAMPLE_EVENT, id: '100', name: 'Event Page 1A', primary_venue_id: '200' },
      { ...SAMPLE_EVENT, id: '101', name: 'Event Page 1B', primary_venue_id: '201' },
    ],
    pagination: { object_count: 3, page_size: 50, continuation: 'next_page_token' },
  },
});

const SAMPLE_PAGE2_RESPONSE = JSON.stringify({
  events: {
    results: [{ ...SAMPLE_EVENT, id: '200', name: 'Event Page 2A', primary_venue_id: '202' }],
    pagination: { object_count: 3, page_size: 50, continuation: null },
  },
});

describe('parseEventbriteResponse', () => {
  it('parses events from destination search response (events.results[])', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);

    expect(entries).toHaveLength(1);
    const data = JSON.parse(entries[0].CalendarData._);
    expect(data.calendarTitle).toBe('Myrtle Beach Food Festival');
    expect(data.calendarStartDate).toBe(FUTURE_DATE_MMDDYYYY);
    expect(data.calendarEndDate).toBe(FUTURE_DATE_MMDDYYYY);
    expect(data.calendarWebsite).toBe(
      'https://www.eventbrite.com/e/myrtle-beach-food-festival-1234567890',
    );
  });

  it('extracts event ID as RowKey', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);

    expect(entries[0].RowKey._).toBe('1234567890');
  });

  it('sets PartitionKey to RSS_Approved_{id}', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);

    expect(entries[0].PartitionKey._).toBe('RSS_Approved_1234567890');
  });

  it('converts start_date YYYY-MM-DD to MM-DD-YYYY format', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarStartDate).toBe(FUTURE_DATE_MMDDYYYY);
    expect(data.calendarPermitStartDate).toBe(FUTURE_DATE_MMDDYYYY);
  });

  it('converts start_time 24h to hh:mm am/pm format', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarStartTime).toBe('06:00 pm');
  });

  it('handles end_date and end_time', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarEndDate).toBe(FUTURE_DATE_MMDDYYYY);
    expect(data.calendarEndTime).toBe('09:00 pm');
    expect(data.calendarPermitEndDate).toBe(FUTURE_DATE_MMDDYYYY);
  });

  it('returns all events regardless of status', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_MULTI_STATUS_RESPONSE);

    expect(entries).toHaveLength(4);
    expect(entries[0].RowKey._).toBe('live1');
    expect(entries[1].RowKey._).toBe('draft1');
  });

  it('maps summary to calendarDescription', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarDescription).toBe('Annual food festival with food trucks and live music');
  });

  it('maps name to calendarTitle', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarTitle).toBe('Myrtle Beach Food Festival');
  });

  it('returns empty array for empty results', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EMPTY_RESPONSE);

    expect(entries).toHaveLength(0);
  });

  it('handles missing end time gracefully', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_NO_END_TIME_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarEndTime).toBeUndefined();
    expect(data.calendarEndDate).toBe(FUTURE_DATE_MMDDYYYY);
  });

  it('handles missing start time gracefully', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_NO_START_TIME_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarStartTime).toBeUndefined();
    expect(data.calendarEndTime).toBeUndefined();
  });

  it('sets Group to EB_{id}', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);

    expect(entries[0].Group._).toBe('EB_1234567890');
  });

  it('sets Timestamp to event changed date or current time fallback', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);

    expect(entries[0].Timestamp._).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('sets calendarLocation to undefined in parse (venue resolved at fetch time)', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const entries = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarLocation).toBeUndefined();
  });
});

describe('parseVenueResponse', () => {
  it('parses venue response with full address', async () => {
    const { parseVenueResponse } = await import('@/lib/events/eventbriteApi');
    const result = parseVenueResponse(SAMPLE_VENUE_RESPONSE);

    expect(result).toEqual({
      name: 'Myrtle Beach Boardwalk',
      address: 'Myrtle Beach Boardwalk, 1100 N Ocean Blvd, Myrtle Beach, SC 29577',
      lat: 33.693552,
      lng: -78.88059969999999,
    });
  });

  it('formats location as "name, address_1, city, region postal_code"', async () => {
    const { parseVenueResponse } = await import('@/lib/events/eventbriteApi');
    const result = parseVenueResponse(SAMPLE_VENUE_RESPONSE);

    expect(result?.address).toBe(
      'Myrtle Beach Boardwalk, 1100 N Ocean Blvd, Myrtle Beach, SC 29577',
    );
    expect(result?.lat).toBe(33.693552);
    expect(result?.lng).toBeCloseTo(-78.8806, 4);
  });

  it('handles venue with minimal data (name only)', async () => {
    const { parseVenueResponse } = await import('@/lib/events/eventbriteApi');
    const result = parseVenueResponse(SAMPLE_MINIMAL_VENUE_RESPONSE);

    expect(result).toEqual({ name: 'Some Venue', address: 'Some Venue', lat: null, lng: null });
  });

  it('returns null for invalid venue response', async () => {
    const { parseVenueResponse } = await import('@/lib/events/eventbriteApi');
    const result = parseVenueResponse(SAMPLE_INVALID_VENUE_RESPONSE);

    expect(result).toBeNull();
  });
});

describe('Eventbrite metadata', () => {
  it('captures category, subcategory, format, organizer tags, organizer and venue city', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const [entry] = parseEventbriteResponse(SAMPLE_TAGGED_RESPONSE);

    expect(entry.eventbrite).toEqual({
      category: 'Food & Drink',
      subcategory: 'Food',
      format: 'Festival or Fair',
      organizerTags: ['foodtrucks', 'family'],
      organizerName: 'Grand Strand Events',
      venueCity: 'Myrtle Beach',
      venueRegion: 'SC',
    });
  });

  it('leaves metadata empty when the search result has no tags or venue', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const [entry] = parseEventbriteResponse(
      JSON.stringify({
        events: {
          results: [{ ...SAMPLE_EVENT, organizer: undefined }],
          pagination: { object_count: 1, page_size: 50, continuation: null },
        },
      }),
    );

    expect(entry.eventbrite).toEqual({
      category: null,
      subcategory: null,
      format: null,
      organizerTags: [],
      organizerName: null,
      venueCity: null,
      venueRegion: null,
    });
  });

  it('does not change the content hash, so existing events are not treated as changed', async () => {
    const { parseEventbriteResponse } = await import('@/lib/events/eventbriteApi');
    const [plain] = parseEventbriteResponse(SAMPLE_EVENTBRITE_RESPONSE);
    const [tagged] = parseEventbriteResponse(SAMPLE_TAGGED_RESPONSE);

    expect(tagged.contentHash).toBe(plain.contentHash);
    expect(tagged.CalendarData._).toBe(plain.CalendarData._);
  });
});

describe('fetchEventbriteEvents', () => {
  let originalFetch: typeof global.fetch;
  let fetchCalls: Array<{ url: string; options: RequestInit }>;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchCalls = [];
    global.fetch = jest.fn().mockImplementation(async (url: string, options: RequestInit) => {
      fetchCalls.push({ url: String(url), options });

      const urlStr = String(url);

      if (urlStr.includes('/venues/')) {
        const venueId = urlStr.split('/venues/')[1]?.replace('/', '');
        return {
          ok: true,
          headers: new Headers(),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: venueId,
                name: `Venue ${venueId}`,
                address: {
                  address_1: '123 Main St',
                  city: 'City',
                  region: 'ST',
                  postal_code: '12345',
                  latitude: '34.5',
                  longitude: '-82.3',
                },
              }),
            ),
        };
      }

    const bodyStr = options?.body ? String(options.body) : '';
    const parsed = JSON.parse(bodyStr);
    if (parsed?.event_search?.page === 2) {
      return {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(SAMPLE_PAGE2_RESPONSE),
      };
    }

      return {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(SAMPLE_PAGE1_RESPONSE),
      };
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches events from POST endpoint with correct body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve(SAMPLE_EVENTBRITE_RESPONSE),
    });

    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    const entries = await fetchEventbriteEvents(33.6891, -78.8867, 25, 'test-api-key', {
      skipKeywordSearch: true,
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://www.eventbriteapi.com/v3/destination/search/');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.event_search.bbox.left).toBeDefined();
    expect(body.event_search.bbox.right).toBeDefined();
    expect(body.event_search.bbox.top).toBeDefined();
    expect(body.event_search.bbox.bottom).toBeDefined();
    expect(Number(body.event_search.bbox.left)).toBeLessThan(Number(body.event_search.bbox.right));
    expect(Number(body.event_search.bbox.bottom)).toBeLessThan(Number(body.event_search.bbox.top));
    expect(body.event_search.page_size).toBe(50);
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-api-key',
    );
    expect(entries).toHaveLength(1);
  });

  it('handles page-based pagination', async () => {
    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    const entries = await fetchEventbriteEvents(33.6891, -78.8867, 25, 'test-key', {
      skipKeywordSearch: true,
    });

    expect(entries).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('fetches venue details for events with primary_venue_id', async () => {
    global.fetch = jest.fn().mockImplementation(async (url: string, options: RequestInit) => {
      const urlStr = String(url);

      if (urlStr.includes('/venues/')) {
        return {
          ok: true,
          headers: new Headers(),
          text: () => Promise.resolve(SAMPLE_VENUE_RESPONSE),
        };
      }

      return {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(SAMPLE_EVENTBRITE_RESPONSE),
      };
    });

    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    const entries = await fetchEventbriteEvents(33.6891, -78.8867, 25, 'test-key', {
      skipKeywordSearch: true,
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const data = JSON.parse(entries[0].CalendarData._);
    expect(data.calendarLocation).toBe(
      'Myrtle Beach Boardwalk, 1100 N Ocean Blvd, Myrtle Beach, SC 29577',
    );
  });

  it('takes the venue from expanded search results without a venue lookup', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve(SAMPLE_TAGGED_RESPONSE),
    });

    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    const entries = await fetchEventbriteEvents(33.6891, -78.8867, 25, 'test-key', {
      skipKeywordSearch: true,
    });

    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls.some(([url]) => String(url).includes('/venues/'))).toBe(false);
    const data = JSON.parse(entries[0].CalendarData._);
    expect(data.calendarLocation).toBe(
      'Myrtle Beach Boardwalk, 1100 N Ocean Blvd, Myrtle Beach, SC 29577',
    );
    expect(data.calendarLat).toBeCloseTo(33.693552);
  });

  it('asks both the area search and keyword searches to expand venue and organizer', async () => {
    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    await fetchEventbriteEvents(33.6891, -78.8867, 25, 'test-key');

    const searchBodies = fetchCalls
      .filter((call) => call.url.includes('/destination/search/'))
      .map((call) => JSON.parse(String(call.options.body)));
    expect(searchBodies.some((body) => body.event_search.q)).toBe(true);
    expect(searchBodies.some((body) => !body.event_search.q)).toBe(true);
    for (const body of searchBodies) {
      expect(body['expand.destination_event']).toEqual(['primary_venue', 'primary_organizer']);
    }
  });

  it('handles HTTP error responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
    });

    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    await expect(
      fetchEventbriteEvents(33.6891, -78.8867, 25, 'bad-key', { skipKeywordSearch: true }),
    ).rejects.toThrow('401');
  });

  it('reports venue lookup failures while preserving the locationless event', async () => {
    const enrichmentFailures: Array<{ venueId: string; code: string }> = [];
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes('/venues/')) {
        return {
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          headers: new Headers(),
        };
      }
      return {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(SAMPLE_EVENTBRITE_RESPONSE),
      };
    });

    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    const entries = await fetchEventbriteEvents(33.6891, -78.8867, 25, 'test-key', {
      skipKeywordSearch: true,
      onEnrichmentFailure: (failure) => enrichmentFailures.push(failure),
    });

    expect(entries).toHaveLength(1);
    expect(JSON.parse(entries[0].CalendarData._).calendarLocation).toBeUndefined();
    expect(enrichmentFailures).toEqual([{ venueId: '54321', code: 'http_502' }]);
  });

  it('handles 429 rate limit with retry', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '1' }),
        };
      }
      return {
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(SAMPLE_EVENTBRITE_RESPONSE),
      };
    });

    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    const entries = await fetchEventbriteEvents(33.6891, -78.8867, 25, 'test-key', {
      skipKeywordSearch: true,
    });

    expect(entries).toHaveLength(1);
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('handles empty results gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve(SAMPLE_EMPTY_RESPONSE),
    });

    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    const entries = await fetchEventbriteEvents(33.6891, -78.8867, 25, 'test-key', {
      skipKeywordSearch: true,
    });

    expect(entries).toHaveLength(0);
  });
});

describe('getEventbriteConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.EVENTBRITE_WINDOW_BUDGET;
    delete process.env.EVENTBRITE_SAFETY_BUFFER;
    delete process.env.EVENTBRITE_MAX_PAGES;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns default windowBudget of 2000 when env var not set', async () => {
    const { getEventbriteConfig } = await import('@/lib/events/eventbriteApi');
    expect(getEventbriteConfig().windowBudget).toBe(2000);
  });

  it('returns default safetyBuffer of 100 when env var not set', async () => {
    const { getEventbriteConfig } = await import('@/lib/events/eventbriteApi');
    expect(getEventbriteConfig().safetyBuffer).toBe(100);
  });

  it('returns default maxPages of 20 when env var not set', async () => {
    const { getEventbriteConfig } = await import('@/lib/events/eventbriteApi');
    expect(getEventbriteConfig().maxPages).toBe(20);
  });

  it('reads EVENTBRITE_WINDOW_BUDGET from env var', async () => {
    process.env.EVENTBRITE_WINDOW_BUDGET = '1200';
    const { getEventbriteConfig } = await import('@/lib/events/eventbriteApi');
    expect(getEventbriteConfig().windowBudget).toBe(1200);
  });

  it('reads EVENTBRITE_SAFETY_BUFFER from env var', async () => {
    process.env.EVENTBRITE_SAFETY_BUFFER = '100';
    const { getEventbriteConfig } = await import('@/lib/events/eventbriteApi');
    expect(getEventbriteConfig().safetyBuffer).toBe(100);
  });

  it('reads EVENTBRITE_MAX_PAGES from env var', async () => {
    process.env.EVENTBRITE_MAX_PAGES = '10';
    const { getEventbriteConfig } = await import('@/lib/events/eventbriteApi');
    expect(getEventbriteConfig().maxPages).toBe(10);
  });
});

describe('fetchEventbriteEvents with existingIds pre-filtering', () => {
  const futureDateStr = futureDate(30);
  const futureDateMMDDYYYY = (() => {
    const parts = futureDateStr.split('-');
    return `${parts[1]}-${parts[2]}-${parts[0]}`;
  })();

  function makeEventResult(id: string, name: string, venueId: string) {
    return {
      id,
      name,
      start_date: futureDateStr,
      start_time: '18:00',
      end_date: futureDateStr,
      end_time: '21:00',
      primary_venue_id: venueId,
      url: `https://www.eventbrite.com/e/${id}`,
      summary: 'Test event',
      status: 'live',
      changed: '2026-05-12T20:00:00Z',
      category: { name: 'Food & Drink' },
      organizer: { name: 'Test Org' },
    };
  }

  function makePageResponse(
    results: Array<{ id: string; name: string; venueId: string }>,
    continuation: string | null = null,
  ) {
    const evts = results.map((r) => {
      const e = makeEventResult(r.id, r.name, r.venueId);
      return e;
    });
    return JSON.stringify({
      events: {
        results: evts,
        pagination: { object_count: evts.length, page_size: 50, continuation },
      },
    });
  }

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('skips events already in existingIds with matching contentHash', async () => {
    const { hashCalendarData } = await import('@/lib/events/types');
    const existingIds = new Map<string, EventComparison>();
    const knownHash = hashCalendarData({
      calendarTitle: 'Already Known',
      calendarStartDate: futureDateMMDDYYYY,
      calendarEndDate: futureDateMMDDYYYY,
      calendarDescription: 'Test event',
      calendarCategory: 'Food & Drink',
      calendarOrganization: 'Test Org',
      calendarWebsite: 'https://www.eventbrite.com/e/event-100',
      calendarStartTime: '06:00 pm',
      calendarEndTime: '09:00 pm',
      calendarPermitStartDate: futureDateMMDDYYYY,
      calendarPermitEndDate: futureDateMMDDYYYY,
    });
    existingIds.set('event-100', { contentHash: knownHash, sourceUpdatedAt: null });

    const pageResponse = makePageResponse([
      { id: 'event-100', name: 'Already Known', venueId: 'v-100' },
      { id: 'event-200', name: 'New Event', venueId: 'v-200' },
    ]);

    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/venues/')) {
        const vid = urlStr.split('/venues/')[1]?.replace('/', '');
        return {
          ok: true,
          headers: new Headers(),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: vid,
                name: `Venue ${vid}`,
                address: { address_1: '123 St', city: 'City', region: 'ST', postal_code: '12345', latitude: '34.0', longitude: '-82.0' },
              }),
            ),
        };
      }
      return { ok: true, headers: new Headers(), text: () => Promise.resolve(pageResponse) };
    });

    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    const entries = await fetchEventbriteEvents(33.0, -82.0, 25, 'test-key', {
      skipKeywordSearch: true,
      existingIds,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].RowKey._).toBe('event-200');

    const venueCalls = (global.fetch as jest.Mock).mock.calls.filter(
      (call: unknown[]) => String(call[0]).includes('/venues/'),
    );
    expect(venueCalls).toHaveLength(1);
  });

  it('does not skip events in existingIds with different timestamp', async () => {
    const existingIds = new Map<string, EventComparison>();
    existingIds.set('event-100', {
      contentHash: null,
      sourceUpdatedAt: '2026-01-01T00:00:00Z',
    });

    const pageResponse = makePageResponse([
      { id: 'event-100', name: 'Updated Event', venueId: 'v-100' },
    ]);

    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/venues/')) {
        return {
          ok: true,
          headers: new Headers(),
          text: () =>
            Promise.resolve(
              JSON.stringify({ id: 'v-100', name: 'Venue', address: { address_1: '123 St', city: 'City', region: 'ST', postal_code: '12345', latitude: '34.0', longitude: '-82.0' } }),
            ),
        };
      }
      return { ok: true, headers: new Headers(), text: () => Promise.resolve(pageResponse) };
    });

    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    const entries = await fetchEventbriteEvents(33.0, -82.0, 25, 'test-key', {
      skipKeywordSearch: true,
      existingIds,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].RowKey._).toBe('event-100');
  });

  it('skips event when contentHash matches existing', async () => {
    const { hashCalendarData } = await import('@/lib/events/types');
    const existingIds = new Map<string, EventComparison>();
    const hashedHash = hashCalendarData({
      calendarTitle: 'Hashed Event',
      calendarStartDate: futureDateMMDDYYYY,
      calendarEndDate: futureDateMMDDYYYY,
      calendarDescription: 'Test event',
      calendarCategory: 'Food & Drink',
      calendarOrganization: 'Test Org',
      calendarWebsite: 'https://www.eventbrite.com/e/event-300',
      calendarStartTime: '06:00 pm',
      calendarEndTime: '09:00 pm',
      calendarPermitStartDate: futureDateMMDDYYYY,
      calendarPermitEndDate: futureDateMMDDYYYY,
    });
    existingIds.set('event-300', { contentHash: hashedHash, sourceUpdatedAt: null });

    const pageResponse = makePageResponse([
      { id: 'event-300', name: 'Hashed Event', venueId: 'v-300' },
    ]);

    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('/venues/')) {
        return {
          ok: true,
          headers: new Headers(),
          text: () => Promise.resolve(JSON.stringify({ id: 'v-300', name: 'Venue', address: { address_1: '123 St', city: 'City', region: 'ST', postal_code: '12345', latitude: '34.0', longitude: '-82.0' } })),
        };
      }
      return { ok: true, headers: new Headers(), text: () => Promise.resolve(pageResponse) };
    });

    const { fetchEventbriteEvents } = await import('@/lib/events/eventbriteApi');
    const entries = await fetchEventbriteEvents(33.0, -82.0, 25, 'test-key', {
      skipKeywordSearch: true,
      existingIds,
    });

    expect(entries).toHaveLength(0);
    const venueCalls = (global.fetch as jest.Mock).mock.calls.filter(
      (call: unknown[]) => String(call[0]).includes('/venues/'),
    );
    expect(venueCalls).toHaveLength(0);
  });
});

describe('EventbriteRateLimiter reset', () => {
  it('perCityCallCount tracks calls across the hourly budget', async () => {
    const { EventbriteRateLimiter } = await import('@/lib/events/eventbriteApi');
    const limiter = new EventbriteRateLimiter();
    limiter.recordCall();
    limiter.recordCall();
    expect(limiter.perCityCallCount).toBe(2);
    expect(limiter.remaining).toBeGreaterThan(0);
  });

  it('resetPerCityCount resets the per-city counter', async () => {
    const { EventbriteRateLimiter } = await import('@/lib/events/eventbriteApi');
    const limiter = new EventbriteRateLimiter();
    for (let i = 0; i < 5; i++) {
      limiter.recordCall();
    }
    limiter.resetPerCityCount();
    expect(limiter.perCityCallCount).toBe(0);
    await expect(limiter.acquireOrThrow()).resolves.toBeUndefined();
  });

  it('timeUntilReset returns remaining ms in window', async () => {
    const { EventbriteRateLimiter } = await import('@/lib/events/eventbriteApi');
    const limiter = new EventbriteRateLimiter();
    const remaining = limiter.timeUntilReset();
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(1_223_000);
  });

  it('resetWindow clears call count and resets window', async () => {
    const { EventbriteRateLimiter } = await import('@/lib/events/eventbriteApi');
    const limiter = new EventbriteRateLimiter();
    for (let i = 0; i < 10; i++) {
      limiter.recordCall();
    }
    const before = limiter.remaining;
    limiter.resetWindow();
    expect(limiter.remaining).toBeGreaterThan(before);
  });
});

describe('EventbriteRateLimiter', () => {
  it('tracks remaining budget correctly', async () => {
    const { EventbriteRateLimiter } = await import('@/lib/events/eventbriteApi');
    const limiter = new EventbriteRateLimiter();
    const initial = limiter.remaining;
    expect(initial).toBeGreaterThan(0);
    for (let i = 0; i < 5; i++) {
      limiter.recordCall();
    }
    expect(limiter.remaining).toBe(initial - 5);
  });

  it('throws EventbriteRateLimitExhausted when budget exceeded', async () => {
    const { EventbriteRateLimiter, EventbriteRateLimitExhausted } = await import(
      '@/lib/events/eventbriteApi'
    );
    const limiter = new EventbriteRateLimiter();
    for (let i = 0; i < 1901; i++) {
      limiter.recordCall();
    }
    await expect(limiter.acquireOrThrow()).rejects.toThrow(EventbriteRateLimitExhausted);
  });

  it('throws after MAX_429_RETRIES consecutive 429s', async () => {
    const { EventbriteRateLimiter, EventbriteRateLimitExhausted } = await import(
      '@/lib/events/eventbriteApi'
    );
    const limiter = new EventbriteRateLimiter();
    for (let i = 0; i < 4; i++) {
      limiter.record429();
    }
    expect(() => limiter.record429()).toThrow(EventbriteRateLimitExhausted);
  });

  it('pauses when server reports low remaining', async () => {
    const { EventbriteRateLimiter } = await import('@/lib/events/eventbriteApi');
    const limiter = new EventbriteRateLimiter();
    const headers = new Headers({
      'x-rate-limit': `token:TEST 1998/2000 reset=1s, key:TEST 1998/2000 reset=1s`,
    });
    limiter.updateFromHeaders(headers);
    const start = Date.now();
    await limiter.acquireOrThrow();
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  });

  it('parses x-rate-limit header with spaces in token ID', async () => {
    const { EventbriteRateLimiter } = await import('@/lib/events/eventbriteApi');
    const limiter = new EventbriteRateLimiter();
    const headers = new Headers({
      'x-rate-limit': `token:my token 1995/2000 reset=30s, key:TEST 1995/2000 reset=30s`,
    });
    expect(() => limiter.updateFromHeaders(headers)).not.toThrow();
  });

  it('resets window after window period', async () => {
    const { EventbriteRateLimiter } = await import('@/lib/events/eventbriteApi');
    const limiter = new EventbriteRateLimiter();
    for (let i = 0; i < 501; i++) {
      limiter.recordCall();
    }
    const usedBefore = limiter.remaining;
    expect(usedBefore).toBeLessThanOrEqual(1399);
    const limiterAny = limiter as unknown as Record<string, number>;
    limiterAny.windowStart = Date.now() - 1_300_000;
    limiter.recordCall();
    expect(limiter.remaining).toBeGreaterThan(usedBefore);
  });
});

describe('Eventbrite lookups by id', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('asks for many events in one call with venue and organizer expanded', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: () => Promise.resolve({ events: [SAMPLE_TAGGED_EVENT] }),
    });
    const { fetchEventbriteEventsByIds, EventbriteRateLimiter } =
      await import('@/lib/events/eventbriteApi');
    const events = await fetchEventbriteEventsByIds(['1', '2'], 'key', new EventbriteRateLimiter());

    const url = new URL(String((global.fetch as jest.Mock).mock.calls[0][0]));
    expect(url.pathname).toBe('/v3/destination/events/');
    expect(url.searchParams.get('event_ids')).toBe('1,2');
    expect(url.searchParams.get('expand')).toBe('primary_venue,primary_organizer');
    expect(events.map((event) => event.id)).toEqual([SAMPLE_TAGGED_EVENT.id]);
  });

  it('returns the full description, or null when Eventbrite has removed the event', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({ description: '<p>Food trucks</p>' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });
    const { fetchEventbriteFullDescription, EventbriteRateLimiter } =
      await import('@/lib/events/eventbriteApi');
    const limiter = new EventbriteRateLimiter();

    expect(await fetchEventbriteFullDescription('1', 'key', limiter)).toBe('<p>Food trucks</p>');
    expect(await fetchEventbriteFullDescription('2', 'key', limiter)).toBeNull();
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toBe(
      'https://www.eventbriteapi.com/v3/events/1/description/',
    );
  });
});
