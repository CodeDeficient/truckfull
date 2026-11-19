import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { TourismScraperConfig } from '@/lib/events/types';

const VALDOSTA_HTML = `
<div class="tribe-events-calendar-list">
  <div class="tribe-events-calendar-list__event-row">
    <div class="tribe-events-calendar-list__event-date">
      <span class="tribe-event-date-start">April 18, 2026</span>
      <span class="tribe-event-time">10:00 am - 6:00 pm</span>
    </div>
    <div class="tribe-events-calendar-list__event-details">
      <h3 class="tribe-events-calendar-list__event-title">
        <a href="https://www.visitvaldosta.org/event/bluesberry-festival/">
          Bluesberry Festival
        </a>
      </h3>
      <div class="tribe-events-calendar-list__event-venue">
        Downtown Valdosta
      </div>
      <div class="tribe-events-calendar-list__event-description">
        <p>Annual blues and blueberry festival with live music, food vendors, and family activities.</p>
      </div>
    </div>
  </div>
  <div class="tribe-events-calendar-list__event-row">
    <div class="tribe-events-calendar-list__event-date">
      <span class="tribe-event-date-start">May 2-3, 2026</span>
      <span class="tribe-event-time">12:00 pm - 10:00 pm</span>
    </div>
    <div class="tribe-events-calendar-list__event-details">
      <h3 class="tribe-events-calendar-list__event-title">
        <a href="https://www.visitvaldosta.org/event/comic-con/">
          Valdosta Comic Con
        </a>
      </h3>
      <div class="tribe-events-calendar-list__event-venue">
        James H. Rainwater Conference Center
      </div>
    </div>
  </div>
</div>
`;

const MACON_HTML = `
<div class="events-list">
  <article class="event-card" data-event-id="1234">
    <h2 class="event-card__title">International Cherry Blossom Festival</h2>
    <div class="event-card__meta">
      <span class="event-card__date">March 20 - April 5, 2026</span>
      <span class="event-card__location">Downtown Macon</span>
    </div>
    <p class="event-card__excerpt">Celebrate spring with over 300,000 Yoshino cherry trees in bloom.</p>
    <a class="event-card__link" href="https://www.maconga.org/event/cherry-blossom-festival/">
      Learn More
    </a>
  </article>
  <article class="event-card" data-event-id="1235">
    <h2 class="event-card__title">Bragg Jam Music Festival</h2>
    <div class="event-card__meta">
      <span class="event-card__date">July 25-26, 2026</span>
      <span class="event-card__location">Various Venues</span>
    </div>
    <p class="event-card__excerpt">Two-day music festival across multiple stages in downtown Macon.</p>
    <a class="event-card__link" href="https://www.maconga.org/event/bragg-jam/">
      Learn More
    </a>
  </article>
</div>
`;

const VALDOSTA_CONFIG: TourismScraperConfig = {
  url: 'https://www.visitvaldosta.org/upcoming-events/',
  eventContainerSelector: '.tribe-events-calendar-list__event-row',
  titleSelector: '.tribe-events-calendar-list__event-title',
  dateSelector: '.tribe-events-calendar-list__event-date',
  locationSelector: '.tribe-events-calendar-list__event-venue',
  descriptionSelector: '.tribe-events-calendar-list__event-description',
  linkSelector: '.tribe-events-calendar-list__event-title a',
  dateParsePattern: '(\\w+ \\d{1,2}(?: - \\w+ \\d{1,2})?, \\d{4})',
};

const MACON_CONFIG: TourismScraperConfig = {
  url: 'https://www.maconga.org/events/',
  eventContainerSelector: '.event-card',
  titleSelector: '.event-card__title',
  dateSelector: '.event-card__date',
  locationSelector: '.event-card__location',
  descriptionSelector: '.event-card__excerpt',
  linkSelector: '.event-card__link',
  dateParsePattern: '(\\w+ \\d{1,2}(?: - \\w+ \\d{1,2})?, \\d{4})',
};

const MINIMAL_CONFIG: TourismScraperConfig = {
  url: 'https://example.com/events/',
  eventContainerSelector: '.event-card',
  titleSelector: '.event-card__title',
  dateSelector: '.event-card__date',
  dateParsePattern: '(\\w+ \\d{1,2}, \\d{4})',
};

describe('parseTourismHtml', () => {
  it('parses Valdosta-style WordPress event listings', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    expect(entries).toHaveLength(2);
    const d0 = JSON.parse(entries[0].CalendarData._);
    const d1 = JSON.parse(entries[1].CalendarData._);
    expect(d0.calendarTitle).toBe('Bluesberry Festival');
    expect(d1.calendarTitle).toBe('Valdosta Comic Con');
  });

  it('parses Macon-style custom CMS event cards', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(MACON_HTML, MACON_CONFIG);

    expect(entries).toHaveLength(2);
    const d0 = JSON.parse(entries[0].CalendarData._);
    const d1 = JSON.parse(entries[1].CalendarData._);
    expect(d0.calendarTitle).toBe('International Cherry Blossom Festival');
    expect(d1.calendarTitle).toBe('Bragg Jam Music Festival');
  });

  it('extracts title from event container', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarTitle).toBe('Bluesberry Festival');
  });

  it('extracts and formats dates to MM-DD-YYYY', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarStartDate).toBe('04-18-2026');
    expect(d0.calendarEndDate).toBe('04-18-2026');
  });

  it('handles date ranges (start - end)', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(MACON_HTML, MACON_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarStartDate).toBe('03-20-2026');
    expect(d0.calendarEndDate).toBe('04-05-2026');
  });

  it('handles multi-day same-month date ranges', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    const d1 = JSON.parse(entries[1].CalendarData._);
    expect(d1.calendarStartDate).toBe('05-02-2026');
    expect(d1.calendarEndDate).toBe('05-03-2026');
  });

  it('extracts location when available', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarLocation).toBe('Downtown Valdosta');
  });

  it('handles missing location gracefully', async () => {
    const html = `
      <div class="event-card">
        <h2 class="event-card__title">Test Event</h2>
        <span class="event-card__date">April 18, 2026</span>
      </div>
    `;
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(html, MINIMAL_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarLocation).toBeUndefined();
  });

  it('returns undefined website when linkSelector is a but no matching link found', async () => {
    const html = `
      <div class="event-card">
        <h2 class="event-card__title">Orphan Event</h2>
        <span class="event-card__date">April 18, 2026</span>
      </div>
      <a href="https://example.com/unrelated">Some other link</a>
    `;
    const config: TourismScraperConfig = {
      ...MINIMAL_CONFIG,
      linkSelector: 'a',
    };
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(html, config);

    expect(entries).toHaveLength(1);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarWebsite).toBeUndefined();
  });

  it('extracts link URL when available', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarWebsite).toBe('https://www.visitvaldosta.org/event/bluesberry-festival/');
  });

  it('extracts description text (strips HTML)', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarDescription).toBe(
      'Annual blues and blueberry festival with live music, food vendors, and family activities.',
    );
  });

  it('handles missing description gracefully', async () => {
    const html = `
      <div class="event-card">
        <h2 class="event-card__title">Test Event</h2>
        <span class="event-card__date">April 18, 2026</span>
      </div>
    `;
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(html, MINIMAL_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarDescription).toBe('');
  });

  it('generates consistent external_id from title and date', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries1 = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);
    const entries2 = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    expect(entries1[0].RowKey._).toBe(entries2[0].RowKey._);
  });

  it('sets PartitionKey to RSS_Approved_{id}', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    for (const entry of entries) {
      expect(entry.PartitionKey._).toContain('Approved');
      expect(entry.PartitionKey.$).toBe('Edm.String');
    }
  });

  it('returns empty array for empty HTML', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml('', VALDOSTA_CONFIG);

    expect(entries).toHaveLength(0);
  });

  it('returns empty array when container selector matches nothing', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, {
      ...VALDOSTA_CONFIG,
      eventContainerSelector: '.nonexistent-class',
    });

    expect(entries).toHaveLength(0);
  });

  it('handles malformed HTML gracefully', async () => {
    const malformed = `
      <div class="event-card">
        <h2 class="event-card__title>Unclosed tag event
        <span class="event-card__date">April 18, 2026</span>
    `;
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(malformed, MINIMAL_CONFIG);

    expect(entries).toHaveLength(1);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarTitle).toBeTruthy();
  });

  it('extracts time when present in date block', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarStartTime).toBe('10:00 am');
    expect(d0.calendarEndTime).toBe('6:00 pm');
  });

  it('handles missing time gracefully', async () => {
    const html = `
      <div class="event-card">
        <h2 class="event-card__title">All Day Event</h2>
        <span class="event-card__date">April 18, 2026</span>
      </div>
    `;
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(html, MINIMAL_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarStartTime).toBeUndefined();
    expect(d0.calendarEndTime).toBeUndefined();
  });

  it('uses link URL as external_id when available', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    expect(entries[0].RowKey._).toBe('bluesberry-festival');
    expect(entries[1].RowKey._).toBe('comic-con');
  });

  it('sets Group to TOUR_{id}', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(VALDOSTA_HTML, VALDOSTA_CONFIG);

    for (const entry of entries) {
      expect(entry.Group._).toContain('TOUR_');
    }
  });

  it('handles article containers with class attributes', async () => {
    const html = `
      <article class="event-card other-class">
        <h2 class="event-card__title">Article Event</h2>
        <span class="event-card__date">June 15, 2026</span>
      </article>
    `;
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(html, MINIMAL_CONFIG);

    expect(entries).toHaveLength(1);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarTitle).toBe('Article Event');
    expect(d0.calendarStartDate).toBe('06-15-2026');
  });
});

describe('fetchTourismEvents', () => {
  let mockFetch: jest.SpiedFunction<typeof globalThis.fetch>;

  beforeEach(() => {
    mockFetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(VALDOSTA_HTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  it('fetches page and returns parsed entries', async () => {
    const { fetchTourismEvents } = await import('@/lib/events/tourismScraper');
    const entries = await fetchTourismEvents(VALDOSTA_CONFIG);

    expect(entries).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledWith(VALDOSTA_CONFIG.url, expect.any(Object));
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValue(new Response('Not Found', { status: 404 }));

    const { fetchTourismEvents } = await import('@/lib/events/tourismScraper');
    await expect(fetchTourismEvents(VALDOSTA_CONFIG)).rejects.toThrow(
      'Failed to fetch tourism page',
    );
  });

  it('sends User-Agent header', async () => {
    const { fetchTourismEvents } = await import('@/lib/events/tourismScraper');
    await fetchTourismEvents(VALDOSTA_CONFIG);

    expect(mockFetch).toHaveBeenCalledWith(
      VALDOSTA_CONFIG.url,
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': 'TruckFull/1.0' }),
      }),
    );
  });

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const { fetchTourismEvents } = await import('@/lib/events/tourismScraper');
    await expect(fetchTourismEvents(VALDOSTA_CONFIG)).rejects.toThrow('Failed to fetch');
  });
});

describe('parseTourismHtml with defaultLocation', () => {
  const HTML_NO_LOCATION = `
    <div class="event-card">
      <h2 class="event-card__title">No Venue Event</h2>
      <span class="event-card__date">April 18, 2026</span>
    </div>
  `;

  it('uses defaultLocation when no locationSelector is configured', async () => {
    const config: TourismScraperConfig = {
      ...MINIMAL_CONFIG,
      defaultLocation: 'Valdosta, GA',
    };

    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(HTML_NO_LOCATION, config);

    expect(entries).toHaveLength(1);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarLocation).toBe('Valdosta, GA');
  });

  it('does not override locationSelector when both are set', async () => {
    const html = `
      <div class="event-card">
        <h2 class="event-card__title">Venue Event</h2>
        <span class="event-card__date">April 18, 2026</span>
        <span class="event-card__location">Specific Park</span>
      </div>
    `;
    const config: TourismScraperConfig = {
      ...MINIMAL_CONFIG,
      locationSelector: '.event-card__location',
      defaultLocation: 'Valdosta, GA',
    };

    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(html, config);

    expect(entries).toHaveLength(1);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarLocation).toBe('Specific Park');
  });
});

describe('parseTourismHtml with split month/day selectors', () => {
  const SPLIT_DATE_HTML = `
<section class="events">
  <div class="container-sm">
    <div class="events_feed">
      <a href="https://example.com/event/first-friday" target="_blank">
        <article class="event">
          <div class="group">
            <div class="date"><span>3</span></div>
            <div class="txt"><span>April</span><header><h3>First Friday, Celebrate Downtown!</h3></header></div>
          </div>
          <p>Live music, drinks and food specials. 5:00 pm - 10:00 pm</p>
        </article>
      </a>
      <a href="https://example.com/event/bluesberry" target="_blank">
        <article class="event">
          <div class="group">
            <div class="date"><span>10</span></div>
            <div class="txt"><span>May</span><header><h3>Bluesberry Festival</h3></header></div>
          </div>
          <p>Annual blues and blueberry festival with food vendors.</p>
        </article>
      </a>
    </div>
  </div>
</section>
`;

  const SPLIT_DATE_CONFIG: TourismScraperConfig = {
    url: 'https://visitvaldosta.org/events/',
    eventContainerSelector: '.event',
    titleSelector: '.txt h3',
    dateSelector: '.txt > span',
    daySelector: '.date span',
    descriptionSelector: '.event > p',
    linkSelector: 'a',
    dateParsePattern: '(\\w+ \\d{1,2}(?: - \\w+ \\d{1,2})?, \\d{4})',
  };

  it('combines month and day selectors into a valid date', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(SPLIT_DATE_HTML, SPLIT_DATE_CONFIG);

    expect(entries).toHaveLength(2);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarStartDate).toBe('04-03-2026');
    expect(d0.calendarEndDate).toBe('04-03-2026');
  });

  it('extracts title from real Valdosta structure', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(SPLIT_DATE_HTML, SPLIT_DATE_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarTitle).toBe('First Friday, Celebrate Downtown!');
  });

  it('extracts description and time from real Valdosta structure', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(SPLIT_DATE_HTML, SPLIT_DATE_CONFIG);

    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarDescription).toContain('Live music');
    expect(d0.calendarStartTime).toBe('5:00 pm');
    expect(d0.calendarEndTime).toBe('10:00 pm');
  });

  it('uses link URL as external_id for split-date events', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(SPLIT_DATE_HTML, SPLIT_DATE_CONFIG);

    expect(entries[0].RowKey._).toBe('first-friday');
    expect(entries[1].RowKey._).toBe('bluesberry');
  });

  it('handles event without time gracefully', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(SPLIT_DATE_HTML, SPLIT_DATE_CONFIG);

    const d1 = JSON.parse(entries[1].CalendarData._);
    expect(d1.calendarStartTime).toBeUndefined();
    expect(d1.calendarEndDate).toBe('05-10-2026');
  });
});

describe('parseTourismHtml with nested same-name tags', () => {
  const NESTED_IN_SELECTOR_HTML = `
    <div class="event-card">
      <h2 class="event-card__title">Nested In Event</h2>
      <div class="event-card__date">
        <div class="wrapper">
          <span>May 20, 2026</span>
        </div>
      </div>
    </div>
  `;

  const NESTED_IN_CONFIG: TourismScraperConfig = {
    url: 'https://example.com/',
    eventContainerSelector: '.event-card',
    titleSelector: '.event-card__title',
    dateSelector: '.event-card__date div',
    dateParsePattern: '(\\w+ \\d{1,2}, \\d{4})',
  };

  it('handles nested div in date selector exercising depth tracking', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(NESTED_IN_SELECTOR_HTML, NESTED_IN_CONFIG);

    expect(entries).toHaveLength(1);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarTitle).toBe('Nested In Event');
    expect(d0.calendarStartDate).toBe('05-20-2026');
  });

  const MULTI_DEPTH_HTML = `
    <div class="event-card">
      <h2 class="event-card__title">Multi Depth Event</h2>
      <div class="event-card__date">
        <div class="outer">
          <div class="middle">
            <span>July 4, 2026</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const MULTI_DEPTH_CONFIG: TourismScraperConfig = {
    url: 'https://example.com/',
    eventContainerSelector: '.event-card',
    titleSelector: '.event-card__title',
    dateSelector: '.event-card__date div div',
    dateParsePattern: '(\\w+ \\d{1,2}, \\d{4})',
  };

  it('handles multi-level div selector with 3 depth levels', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(MULTI_DEPTH_HTML, MULTI_DEPTH_CONFIG);

    expect(entries).toHaveLength(1);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarTitle).toBe('Multi Depth Event');
    expect(d0.calendarStartDate).toBe('07-04-2026');
  });
});

describe('parseTourismHtml with unclosed tags (malformed HTML)', () => {
  const UNCLOSSED_TAG_HTML = `
    <div class="event-card">
      <h2 class="event-card__title">Unclosed Event</h2>
      <div class="event-card__date">June 15, 2026
    </div>
  `;

  it('handles unclosed div tag gracefully', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(UNCLOSSED_TAG_HTML, MINIMAL_CONFIG);

    expect(entries).toHaveLength(1);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarTitle).toBe('Unclosed Event');
    expect(d0.calendarStartDate).toBe('06-15-2026');
  });

  const SEVERELY_TRUNCATED_HTML = `
    <div class="event-card">
      <h2 class="event-card__title">Truncated Event</h2>
      <div class="event-card__date">
  `;

  it('handles severely truncated HTML without crashing', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(SEVERELY_TRUNCATED_HTML, MINIMAL_CONFIG);

    expect(entries).toHaveLength(0);
  });

  const UNCLOSED_MULTI_PART_SELECTOR_HTML = `
    <div class="event-card">
      <h2 class="event-card__title">Unclosed Multi Part</h2>
      <div class="event-card__date">
        <div class="wrapper">
          <span>August 12, 2026</span>
        </div>
      </div>
    </div>
  `;

  const UNCLOSED_MULTI_PART_CONFIG: TourismScraperConfig = {
    url: 'https://example.com/',
    eventContainerSelector: '.event-card',
    titleSelector: '.event-card__title',
    dateSelector: '.event-card__date div',
    dateParsePattern: '(\\w+ \\d{1,2}, \\d{4})',
  };

  it('handles multi-part selector with nested div', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(UNCLOSED_MULTI_PART_SELECTOR_HTML, UNCLOSED_MULTI_PART_CONFIG);

    expect(entries).toHaveLength(1);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarTitle).toBe('Unclosed Multi Part');
    expect(d0.calendarStartDate).toBe('08-12-2026');
  });

  const TRULY_UNCLOSED_DIV_HTML = `
    <div class="event-card">
      <h2 class="event-card__title">Truly Unclosed</h2>
      <div class="event-card__date">
        <div class="wrapper">
          <span>September 5, 2026</span>
  `;

  it('handles truly unclosed div tag returning null from extractTagByDepth', async () => {
    const { parseTourismHtml } = await import('@/lib/events/tourismScraper');
    const entries = parseTourismHtml(TRULY_UNCLOSED_DIV_HTML, UNCLOSED_MULTI_PART_CONFIG);

    expect(entries).toHaveLength(0);
  });
});
