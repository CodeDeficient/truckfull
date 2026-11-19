import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const SAMPLE_ALGOLIA_RESPONSE = JSON.stringify({
  hits: [
    {
      objectID: 'abc123',
      title: 'International Cherry Blossom Festival',
      uri: 'https://www.maconga.org/event/cherry-blossom-festival/',
      locationName: 'Downtown Macon',
      address: '500 Cherry St, Macon, GA 31201',
      startDate: '2026-03-20T00:00:00.000Z',
      endDate: '2026-04-05T00:00:00.000Z',
      eventCategories: ['Festival', 'Food'],
      content: 'Celebrate spring with over 300,000 Yoshino cherry trees in bloom.',
      primaryImageUrl: 'https://cdn.example.com/cherry.jpg',
      sectionName: 'Events',
      isPrimaryEvent: true,
      _geoloc: { lat: 32.8357, lng: -83.6324 },
    },
  ],
  nbHits: 1,
  nbPages: 1,
  hitsPerPage: 100,
  page: 0,
});

const SAMPLE_MULTI_HIT_RESPONSE = JSON.stringify({
  hits: [
    {
      objectID: 'evt1',
      title: 'Event One',
      uri: 'https://www.maconga.org/event/one/',
      locationName: 'Park A',
      address: '100 Main St',
      startDate: '2026-05-01T00:00:00.000Z',
      endDate: '2026-05-01T00:00:00.000Z',
      eventCategories: ['Music'],
      content: 'First event description',
      sectionName: 'Events',
      isPrimaryEvent: true,
    },
    {
      objectID: 'evt2',
      title: 'Event Two',
      uri: 'https://www.maconga.org/event/two/',
      locationName: 'Arena B',
      address: '200 Oak Ave',
      startDate: '2026-06-15T00:00:00.000Z',
      endDate: '2026-06-16T00:00:00.000Z',
      eventCategories: ['Arts', 'Culture'],
      content: 'Second event description',
      sectionName: 'Events',
      isPrimaryEvent: true,
    },
  ],
  nbHits: 2,
  nbPages: 1,
  hitsPerPage: 100,
  page: 0,
});

const SAMPLE_NO_ADDRESS_RESPONSE = JSON.stringify({
  hits: [
    {
      objectID: 'noaddr',
      title: 'Virtual Event',
      uri: 'https://www.maconga.org/event/virtual/',
      locationName: 'Online',
      startDate: '2026-07-04T00:00:00.000Z',
      endDate: '2026-07-04T00:00:00.000Z',
      eventCategories: ['Digital'],
      content: 'A virtual event with no physical address.',
      sectionName: 'Events',
      isPrimaryEvent: true,
    },
  ],
  nbHits: 1,
  nbPages: 1,
  hitsPerPage: 100,
  page: 0,
});

const SAMPLE_HTML_CONTENT_RESPONSE = JSON.stringify({
  hits: [
    {
      objectID: 'html1',
      title: 'HTML Event',
      uri: 'https://www.maconga.org/event/html/',
      locationName: 'Venue',
      address: '1 Test St',
      startDate: '2026-08-10T00:00:00.000Z',
      endDate: '2026-08-10T00:00:00.000Z',
      eventCategories: ['Test'],
      content: '<p>Join us for <strong>great fun</strong> &amp; food!</p>',
      sectionName: 'Events',
      isPrimaryEvent: true,
    },
  ],
  nbHits: 1,
  nbPages: 1,
  hitsPerPage: 100,
  page: 0,
});

const SAMPLE_EMPTY_HITS_RESPONSE = JSON.stringify({
  hits: [],
  nbHits: 0,
  nbPages: 0,
  hitsPerPage: 100,
  page: 0,
});

const SAMPLE_PAGE1_RESPONSE = JSON.stringify({
  hits: [
    {
      objectID: 'p1evt1',
      title: 'Page 1 Event',
      uri: 'https://www.maconga.org/event/p1e1/',
      locationName: 'Loc1',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-01T00:00:00.000Z',
      eventCategories: ['Cat1'],
      content: 'Page 1 content',
      sectionName: 'Events',
      isPrimaryEvent: true,
    },
  ],
  nbHits: 2,
  nbPages: 2,
  hitsPerPage: 1,
  page: 0,
});

const SAMPLE_PAGE2_RESPONSE = JSON.stringify({
  hits: [
    {
      objectID: 'p2evt1',
      title: 'Page 2 Event',
      uri: 'https://www.maconga.org/event/p2e1/',
      locationName: 'Loc2',
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-02-01T00:00:00.000Z',
      eventCategories: ['Cat2'],
      content: 'Page 2 content',
      sectionName: 'Events',
      isPrimaryEvent: true,
    },
  ],
  nbHits: 2,
  nbPages: 2,
  hitsPerPage: 1,
  page: 1,
});

const TEST_CONFIG = {
  appId: 'TEST_APP_ID',
  apiKey: 'TEST_API_KEY',
  indexName: 'macon_events',
  filters: 'sectionName:"Events" AND (NOT isPrimaryEvent:false)',
};

describe('parseAlgoliaResponse', () => {
  it('parses hits array into EprovalCalendarEntry format', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_MULTI_HIT_RESPONSE);

    expect(entries).toHaveLength(2);
    expect(entries[0].PartitionKey).toBeDefined();
    expect(entries[0].RowKey).toBeDefined();
    expect(entries[0].Timestamp).toBeDefined();
    expect(entries[0].CalendarData).toBeDefined();
    expect(entries[0].Group).toBeDefined();
  });

  it('extracts objectID as RowKey', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_ALGOLIA_RESPONSE);

    expect(entries[0].RowKey._).toBe('abc123');
  });

  it('sets PartitionKey to RSS_Approved_{objectID}', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_ALGOLIA_RESPONSE);

    expect(entries[0].PartitionKey._).toBe('RSS_Approved_abc123');
  });

  it('converts ISO dates to MM-DD-YYYY format', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_ALGOLIA_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarStartDate).toBe('03-20-2026');
    expect(data.calendarEndDate).toBe('04-05-2026');
  });

  it('maps title to calendarTitle', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_ALGOLIA_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarTitle).toBe('International Cherry Blossom Festival');
  });

  it('maps content to calendarDescription', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_ALGOLIA_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarDescription).toBe(
      'Celebrate spring with over 300,000 Yoshino cherry trees in bloom.',
    );
  });

  it('combines locationName and address into calendarLocation', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_ALGOLIA_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarLocation).toBe('Downtown Macon, 500 Cherry St, Macon, GA 31201');
  });

  it('handles missing address (uses locationName only)', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_NO_ADDRESS_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarLocation).toBe('Online');
  });

  it('maps uri to calendarWebsite', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_ALGOLIA_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarWebsite).toBe('https://www.maconga.org/event/cherry-blossom-festival/');
  });

  it('maps first eventCategory to calendarCategory', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_ALGOLIA_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarCategory).toBe('Festival');
  });

  it('sets Group to ALG_{objectID}', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_ALGOLIA_RESPONSE);

    expect(entries[0].Group._).toBe('ALG_abc123');
  });

  it('handles empty hits array', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_EMPTY_HITS_RESPONSE);

    expect(entries).toHaveLength(0);
  });

  it('strips HTML from content', async () => {
    const { parseAlgoliaResponse } = await import('@/lib/events/algoliaApi');
    const entries = parseAlgoliaResponse(SAMPLE_HTML_CONTENT_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarDescription).toBe('Join us for great fun & food!');
  });
});

describe('fetchAlgoliaEvents', () => {
  let originalFetch: typeof global.fetch;
  let fetchCalls: Array<{ url: string; options: RequestInit }>;
  let callTimes: number[];

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchCalls = [];
    callTimes = [];
    global.fetch = jest.fn().mockImplementation(async (url: string, options: RequestInit) => {
      fetchCalls.push({ url: String(url), options });
      callTimes.push(Date.now());

      const bodyStr = options?.body ? String(options.body) : '';
      const parsed = JSON.parse(bodyStr);

      if (parsed.page === 1) {
        return {
          ok: true,
          text: () => Promise.resolve(SAMPLE_PAGE2_RESPONSE),
        };
      }

      return {
        ok: true,
        text: () => Promise.resolve(SAMPLE_PAGE1_RESPONSE),
      };
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches from Algolia API with correct headers and body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_ALGOLIA_RESPONSE),
    });

    const { fetchAlgoliaEvents } = await import('@/lib/events/algoliaApi');
    const entries = await fetchAlgoliaEvents(TEST_CONFIG);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('TEST_APP_ID-dsn.algolia.net/1/indexes/macon_events/query');
    expect((options as RequestInit).method).toBe('POST');
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers['X-Algolia-Application-Id']).toBe('TEST_APP_ID');
    expect(headers['X-Algolia-API-Key']).toBe('TEST_API_KEY');
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.filters).toContain('sectionName:"Events"');
    expect(body.hitsPerPage).toBe(100);
    expect(entries).toHaveLength(1);
  });

  it('handles pagination (multiple pages)', async () => {
    const { fetchAlgoliaEvents } = await import('@/lib/events/algoliaApi');
    const entries = await fetchAlgoliaEvents(TEST_CONFIG);

    expect(entries).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body as string);
    expect(secondBody.page).toBe(1);
  });

  it('handles HTTP error responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers(),
    });

    const { fetchAlgoliaEvents } = await import('@/lib/events/algoliaApi');
    await expect(fetchAlgoliaEvents(TEST_CONFIG)).rejects.toThrow('403');
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
        text: () => Promise.resolve(SAMPLE_ALGOLIA_RESPONSE),
      };
    });

    const { fetchAlgoliaEvents } = await import('@/lib/events/algoliaApi');
    const entries = await fetchAlgoliaEvents(TEST_CONFIG);

    expect(entries).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 5xx server errors and succeeds', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        return {
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers(),
        };
      }
      return {
        ok: true,
        text: () => Promise.resolve(SAMPLE_ALGOLIA_RESPONSE),
      };
    });

    const { fetchAlgoliaEvents } = await import('@/lib/events/algoliaApi');
    const entries = await fetchAlgoliaEvents(TEST_CONFIG);

    expect(entries).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('handles empty results gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_EMPTY_HITS_RESPONSE),
    });

    const { fetchAlgoliaEvents } = await import('@/lib/events/algoliaApi');
    const entries = await fetchAlgoliaEvents(TEST_CONFIG);

    expect(entries).toHaveLength(0);
  });

  it('rate limits between page fetches', async () => {
    const { fetchAlgoliaEvents } = await import('@/lib/events/algoliaApi');
    await fetchAlgoliaEvents(TEST_CONFIG);

    expect(callTimes).toHaveLength(2);
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(150);
  });
});
