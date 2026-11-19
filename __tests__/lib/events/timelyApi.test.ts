import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const SAMPLE_TIMELY_RESPONSE = JSON.stringify({
  data: {
    items: [
      {
        id: 12345,
        title: 'Columbus Food Truck Festival',
        start_datetime: '2026-04-15T18:00:00-04:00',
        end_datetime: '2026-04-15T21:00:00-04:00',
        all_day: false,
        description: '<p>Annual food truck festival with 50+ trucks!</p>',
        url: 'https://www.visitcolumbusga.org/event/food-truck-festival/',
        location: 'Columbus Civic Center',
        location_address: '400 4th St, Columbus, GA 31901',
        categories: [{ name: 'Food & Drink', slug: 'food-drink' }],
        featured_image: 'https://cdn.example.com/food-truck.jpg',
        status: 'published',
      },
    ],
    total: 1,
    has_prior: false,
    has_next: false,
  },
});

const SAMPLE_NO_LOCATION_RESPONSE = JSON.stringify({
  data: {
    items: [
      {
        id: 999,
        title: 'Virtual Event',
        start_datetime: '2026-06-01T10:00:00-04:00',
        end_datetime: '2026-06-01T11:00:00-04:00',
        all_day: false,
        description: '<p>Online only</p>',
        url: 'https://example.com/virtual',
        categories: [{ name: 'Music' }],
        status: 'published',
      },
    ],
    total: 1,
    has_prior: false,
    has_next: false,
  },
});

const SAMPLE_ALL_DAY_RESPONSE = JSON.stringify({
  data: {
    items: [
      {
        id: 777,
        title: 'All Day Festival',
        start_datetime: '2026-05-20T00:00:00-04:00',
        end_datetime: '2026-05-20T23:59:00-04:00',
        all_day: true,
        description: '<p>Full day event</p>',
        url: 'https://example.com/all-day',
        location: 'Riverfront Park',
        categories: [{ name: 'Community' }],
        status: 'published',
      },
    ],
    total: 1,
    has_prior: false,
    has_next: false,
  },
});

const SAMPLE_EMPTY_RESPONSE = JSON.stringify({
  data: {
    items: [],
    total: 0,
    has_prior: false,
    has_next: false,
  },
});

const SAMPLE_MULTI_PAGE_PAGE1 = JSON.stringify({
  data: {
    items: [
      {
        id: 100,
        title: 'Event Page 1A',
        start_datetime: '2026-05-01T12:00:00-04:00',
        end_datetime: '2026-05-01T15:00:00-04:00',
        all_day: false,
        description: '<p>First event page 1</p>',
        url: 'https://example.com/100',
        location: 'Park A',
        categories: [{ name: 'Arts' }],
        status: 'published',
      },
      {
        id: 101,
        title: 'Event Page 1B',
        start_datetime: '2026-05-02T12:00:00-04:00',
        end_datetime: '2026-05-02T15:00:00-04:00',
        all_day: false,
        description: '<p>Second event page 1</p>',
        url: 'https://example.com/101',
        location: 'Park B',
        categories: [],
        status: 'published',
      },
    ],
    total: 3,
    has_prior: false,
    has_next: true,
  },
});

const SAMPLE_MULTI_PAGE_PAGE2 = JSON.stringify({
  data: {
    items: [
      {
        id: 200,
        title: 'Event Page 2A',
        start_datetime: '2026-05-03T12:00:00-04:00',
        end_datetime: '2026-05-03T15:00:00-04:00',
        all_day: false,
        description: '<p>Only event page 2</p>',
        url: 'https://example.com/200',
        location_address: '123 Main St',
        categories: [{ name: 'Sports' }],
        status: 'published',
      },
    ],
    total: 3,
    has_prior: true,
    has_next: false,
  },
});

describe('parseTimelyResponse', () => {
  it('parses data.items array into EprovalCalendarEntry format', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);

    expect(entries).toHaveLength(1);
    expect(entries[0].PartitionKey).toBeDefined();
    expect(entries[0].RowKey).toBeDefined();
    expect(entries[0].Timestamp).toBeDefined();
    expect(entries[0].CalendarData).toBeDefined();
    expect(entries[0].Group).toBeDefined();
  });

  it('extracts id as RowKey', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);

    expect(entries[0].RowKey._).toBe('12345');
  });

  it('sets PartitionKey to RSS_Approved_{id}', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);

    expect(entries[0].PartitionKey._).toBe('RSS_Approved_12345');
  });

  it('converts ISO dates to MM-DD-YYYY format', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    // With TZ=UTC, the EDT offset shifts dates:
    // start_datetime: 2026-04-15T18:00:00-04:00 (6pm EDT) = 22:00 UTC on April 15
    // end_datetime: 2026-04-15T21:00:00-04:00 (9pm EDT) = 01:00 UTC on April 16
    expect(data.calendarStartDate).toBe('04-15-2026');
    expect(data.calendarEndDate).toBe('04-16-2026');
  });

  it('converts ISO times to hh:mm am/pm format', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    // With TZ=UTC, the EDT offset shifts times:
    // 18:00 EDT = 22:00 UTC = 10:00 pm
    // 21:00 EDT = 01:00 UTC = 01:00 am
    expect(data.calendarStartTime).toBe('10:00 pm');
    expect(data.calendarEndTime).toBe('01:00 am');
  });

  it('maps title to calendarTitle', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarTitle).toBe('Columbus Food Truck Festival');
  });

  it('maps description to calendarDescription and strips HTML', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarDescription).toBe('Annual food truck festival with 50+ trucks!');
  });

  it('maps location_address to calendarLocation', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarLocation).toBe('Columbus Civic Center, 400 4th St, Columbus, GA 31901');
  });

  it('handles missing location gracefully', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_NO_LOCATION_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarLocation).toBeUndefined();
  });

  it('maps url to calendarWebsite', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarWebsite).toBe('https://www.visitcolumbusga.org/event/food-truck-festival/');
  });

  it('maps first category name to calendarCategory', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarCategory).toBe('Food & Drink');
  });

  it('sets Group to TIM_{id}', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_TIMELY_RESPONSE);

    expect(entries[0].Group._).toBe('TIM_12345');
  });

  it('handles empty items array', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_EMPTY_RESPONSE);

    expect(entries).toHaveLength(0);
  });

  it('handles all_day events with no start/end time', async () => {
    const { parseTimelyResponse } = await import('@/lib/events/timelyApi');
    const entries = parseTimelyResponse(SAMPLE_ALL_DAY_RESPONSE);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarStartTime).toBeUndefined();
    expect(data.calendarEndTime).toBeUndefined();
    expect(data.calendarStartDate).toBe('05-20-2026');
  });
});

describe('fetchTimelyEvents', () => {
  let originalFetch: typeof global.fetch;
  let fetchCalls: Array<{ url: string; options: RequestInit }>;
  let callTimes: number[];

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchCalls = [];
    callTimes = [];
    jest.useFakeTimers();
    global.fetch = jest.fn().mockImplementation(async (url: string, options: RequestInit) => {
      fetchCalls.push({ url: String(url), options });
      callTimes.push(Date.now());
      const urlStr = String(url);

      if (urlStr.includes('page=2')) {
        return {
          ok: true,
          text: () => Promise.resolve(SAMPLE_MULTI_PAGE_PAGE2),
        };
      }

      return {
        ok: true,
        text: () => Promise.resolve(SAMPLE_MULTI_PAGE_PAGE1),
      };
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('fetches from Timely API with correct headers and URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_TIMELY_RESPONSE),
    });

    const { fetchTimelyEvents } = await import('@/lib/events/timelyApi');
    const entries = await fetchTimelyEvents({ calendarId: 'cal-123', apiKey: 'secret-key' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('timelyapp.time.ly/api/calendars/cal-123/events');
    expect(url).toContain('per_page=100');
    expect(url).toContain('page=1');
    expect((options as RequestInit).headers?.['X-Api-Key']).toBe('secret-key');
    expect(entries).toHaveLength(1);
  });

  it('handles pagination (multiple pages)', async () => {
    const { fetchTimelyEvents } = await import('@/lib/events/timelyApi');
    const promise = fetchTimelyEvents({ calendarId: 'cal-123', apiKey: 'key' });

    await jest.advanceTimersByTimeAsync(300);

    const entries = await promise;

    expect(entries).toHaveLength(3);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(String((global.fetch as jest.Mock).mock.calls[1][0])).toContain('page=2');
  });

  it('handles HTTP error responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
    });

    const { fetchTimelyEvents } = await import('@/lib/events/timelyApi');
    let caughtError: Error | undefined;
    fetchTimelyEvents({ calendarId: 'cal-123', apiKey: 'bad-key' }).catch(
      (e: Error) => (caughtError = e),
    );

    await jest.advanceTimersByTimeAsync(30000);

    expect(caughtError).toBeDefined();
    expect(caughtError!.message).toContain('401');
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
        text: () => Promise.resolve(SAMPLE_TIMELY_RESPONSE),
      };
    });

    const { fetchTimelyEvents } = await import('@/lib/events/timelyApi');
    const promise = fetchTimelyEvents({ calendarId: 'cal-123', apiKey: 'key' });

    await jest.advanceTimersByTimeAsync(1500);

    const entries = await promise;

    expect(entries).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('handles empty results gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_EMPTY_RESPONSE),
    });

    const { fetchTimelyEvents } = await import('@/lib/events/timelyApi');
    const entries = await fetchTimelyEvents({ calendarId: 'cal-123', apiKey: 'key' });

    expect(entries).toHaveLength(0);
  });

  it('throws when all retries exhausted on 429 for a page', async () => {
    jest.useRealTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers(),
    });

    const { fetchTimelyEvents } = await import('@/lib/events/timelyApi');

    await expect(fetchTimelyEvents({ calendarId: 'cal-123', apiKey: 'key' }, 2)).rejects.toThrow(
      'failed to fetch page 1 after 2 retries',
    );
  });

  it('rate limits between page fetches', async () => {
    const { fetchTimelyEvents } = await import('@/lib/events/timelyApi');
    const promise = fetchTimelyEvents({ calendarId: 'cal-123', apiKey: 'key' });

    await jest.advanceTimersByTimeAsync(300);

    await promise;

    expect(callTimes).toHaveLength(2);
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(200);
  });
});
