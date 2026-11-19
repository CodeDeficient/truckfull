import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	>
	<channel>
		<title>Events Calendar</title>
		<link>https://www.experiencecolumbiasc.com/event/rss/</link>
		<item>
			<title>21+ Board Games Night</title>
			<link>https://www.experiencecolumbiasc.com/event/21%2b-board-games-night/73556/</link>
			<category><![CDATA[ Free Admission ]]></category>
			<category><![CDATA[ Nightlife ]]></category>
			<guid ispermalink="false">https://www.experiencecolumbiasc.com/event/21%2b-board-games-night/73556/</guid>
			<pubDate>Mon, 30 Mar 2026 23:59:59 -0400</pubDate>
			<description><![CDATA[
				<img src='https://assets.simpleviewinc.com/sv-columbiasc/image/fetch/c_fill,h_100,q_75,w_150/https://example.com/image.jpg'/>
				
				
					03/23/2026 to
				
					
					
					05/25/2026
				
				-
				<p>21+ Games Night at Savage Craft<br><br>Every Monday &amp; Tuesday from open at 4:30 PM until close.</p>
			]]></description>
		</item>
		<item>
			<title>Spring House Music Fest</title>
			<link>https://www.experiencecolumbiasc.com/event/spring-house-music-fest/73560/</link>
			<category><![CDATA[ Concerts + Live Entertainment ]]></category>
			<guid ispermalink="false">https://www.experiencecolumbiasc.com/event/spring-house-music-fest/73560/</guid>
			<pubDate>Mon, 30 Mar 2026 23:59:59 -0400</pubDate>
			<description><![CDATA[
				<img src='https://assets.simpleviewinc.com/sv-columbiasc/image/fetch/c_fill,h_100,q_75,w_150/https://example.com/image2.jpg'/>
				
				
					03/25/2026 to
				
					
					
					04/19/2026
				
				-
				<p>Our outdoor Underground House Music Festival of the Year!</p>
			]]></description>
		</item>
		<item>
			<title>First Thursday on Main</title>
			<link>https://www.experiencecolumbiasc.com/event/first-thursday-on-main/48167/</link>
			<category><![CDATA[ Free Admission ]]></category>
			<category><![CDATA[ Nightlife ]]></category>
			<guid ispermalink="false">https://www.experiencecolumbiasc.com/event/first-thursday-on-main/48167/</guid>
			<pubDate>Thu, 02 Apr 2026 23:59:59 -0400</pubDate>
			<description><![CDATA[
				
				
					Starting 04/05/2018
				
				-
				<div>On the first Thursday of each month, businesses in downtown Columbia participate.</div>
			]]></description>
		</item>
		<item>
			<title>Tasting Notes Wine and Food Celebration</title>
			<link>https://www.experiencecolumbiasc.com/event/tasting-notes-wine-and-food-celebration/73339/</link>
			<category><![CDATA[ Culinary ]]></category>
			<guid ispermalink="false">https://www.experiencecolumbiasc.com/event/tasting-notes-wine-and-food-celebration/73339/</guid>
			<pubDate>Mon, 30 Mar 2026 23:59:59 -0400</pubDate>
			<description><![CDATA[
				<img src='https://example.com/wine.jpg'/>
				
				
					03/30/2026 to
					
					
					03/30/2026
				
				-
				<p>Join us for a thrilling night that takes your tastebuds on an adventure.</p>
			]]></description>
		</item>
		<item>
			<title>Wicked the Musical</title>
			<link>https://www.experiencecolumbiasc.com/event/wicked-the-musical/72600/</link>
			<category><![CDATA[ Performing Arts + Culture ]]></category>
			<category><![CDATA[ Family Friendly ]]></category>
			<guid ispermalink="false">https://www.experiencecolumbiasc.com/event/wicked-the-musical/72600/</guid>
			<pubDate>Mon, 30 Mar 2026 23:59:59 -0400</pubDate>
			<description><![CDATA[
				<img src='https://example.com/wicked.jpg'/>
				
				
					03/25/2026 to
					
					
					04/05/2026
				
				-
				<p>See it LIVE. Remember it forever.</p> <p>Long before Dorothy arrives, there is another young</p>
			]]></description>
		</item>
	</channel>
</rss>`;

describe('parseSimpleviewRss', () => {
  it('parses items into EprovalCalendarEntry format', async () => {
    const { parseSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);

    expect(entries).toHaveLength(5);
    const d0 = JSON.parse(entries[0].CalendarData._);
    const d1 = JSON.parse(entries[1].CalendarData._);
    expect(d0.calendarTitle).toBe('21+ Board Games Night');
    expect(d1.calendarTitle).toBe('Spring House Music Fest');
  });

  it('extracts numeric ID from URL as external_id', async () => {
    const { parseSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);

    expect(entries[0].RowKey._).toBe('73556');
    expect(entries[1].RowKey._).toBe('73560');
    expect(entries[2].RowKey._).toBe('48167');
    expect(entries[3].RowKey._).toBe('73339');
  });

  it('parses date ranges (MM/DD/YYYY to MM/DD/YYYY)', async () => {
    const { parseSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);
    const d0 = JSON.parse(entries[0].CalendarData._);
    const d1 = JSON.parse(entries[1].CalendarData._);

    expect(d0.calendarStartDate).toBe('03-23-2026');
    expect(d0.calendarEndDate).toBe('05-25-2026');
    expect(d1.calendarStartDate).toBe('03-25-2026');
    expect(d1.calendarEndDate).toBe('04-19-2026');
  });

  it('parses single dates (Starting MM/DD/YYYY)', async () => {
    const { parseSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);
    const d2 = JSON.parse(entries[2].CalendarData._);

    expect(d2.calendarStartDate).toBe('04-05-2018');
    expect(d2.calendarEndDate).toBe('04-05-2018');
  });

  it('maps categories to calendarCategory (comma-joined if multiple)', async () => {
    const { parseSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);
    const d0 = JSON.parse(entries[0].CalendarData._);
    const d1 = JSON.parse(entries[1].CalendarData._);

    expect(d0.calendarCategory).toBe('Free Admission, Nightlife');
    expect(d1.calendarCategory).toBe('Concerts + Live Entertainment');
  });

  it('extracts description text from CDATA p tags (strips img tags)', async () => {
    const { parseSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);
    const d0 = JSON.parse(entries[0].CalendarData._);
    const d1 = JSON.parse(entries[1].CalendarData._);

    expect(d0.calendarDescription).toContain('Savage Craft');
    expect(d0.calendarDescription).not.toContain('<img');
    expect(d0.calendarDescription).not.toContain('src=');
    expect(d1.calendarDescription).toContain('Underground House Music');
  });

  it('stores source_url in calendarWebsite', async () => {
    const { parseSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);
    const d0 = JSON.parse(entries[0].CalendarData._);

    expect(d0.calendarWebsite).toBe(
      'https://www.experiencecolumbiasc.com/event/21%2b-board-games-night/73556/',
    );
  });

  it('returns empty array for empty RSS', async () => {
    const { parseSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss('<?xml version="1.0"?><rss><channel></channel></rss>');

    expect(entries).toHaveLength(0);
  });

  it('handles single-day events (same start and end date)', async () => {
    const { parseSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);
    const d3 = JSON.parse(entries[3].CalendarData._);

    expect(d3.calendarStartDate).toBe('03-30-2026');
    expect(d3.calendarEndDate).toBe('03-30-2026');
  });

  it('handles multiple p tags in description (concatenates with space)', async () => {
    const { parseSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);
    const d4 = JSON.parse(entries[4].CalendarData._);

    expect(d4.calendarDescription).toContain('See it LIVE');
    expect(d4.calendarDescription).toContain('Long before Dorothy');
  });
});

describe('fetchSimpleviewRss', () => {
  const TEST_URL = 'https://www.experiencecolumbiasc.com/event/rss/';
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches RSS and returns parsed entries', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_RSS),
    });

    const { fetchSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    const entries = await fetchSimpleviewRss(TEST_URL);

    expect(global.fetch).toHaveBeenCalledWith(
      TEST_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': 'TruckFull/1.0' }),
      }),
    );
    expect(entries).toHaveLength(5);
    expect(entries[0].RowKey._).toBe('73556');
  });

  it('throws on HTTP error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    const { fetchSimpleviewRss } = await import('@/lib/events/simpleviewRss');
    await expect(fetchSimpleviewRss(TEST_URL)).rejects.toThrow('403');
  });
});

const SAMPLE_DETAIL_HTML_WITH_JSONLD = `<!DOCTYPE html>
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Cirque Italia: Water Circus",
  "location": {
    "@type": "Place",
    "name": "Augusta Mall",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Augusta",
      "addressRegion": "GA",
      "postalCode": "30909",
      "streetAddress": "3450 Wrightsboro Road"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 33.46638,
      "longitude": -82.0805565
    }
  }
}
</script>
</head><body>Event page</body></html>`;

const SAMPLE_DETAIL_HTML_NO_JSONLD = `<!DOCTYPE html>
<html><head><title>Some Event</title></head><body>No structured data here</body></html>`;

const SAMPLE_DETAIL_HTML_JSONLD_NO_LOCATION = `<!DOCTYPE html>
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Online Event",
  "startDate": "2026-04-01"
}
</script>
</head><body>Virtual event</body></html>`;

describe('extractJsonLdLocation', () => {
  it('extracts location from JSON-LD structured data', async () => {
    const { extractJsonLdLocation } = await import('@/lib/events/simpleviewRss');
    const result = extractJsonLdLocation(SAMPLE_DETAIL_HTML_WITH_JSONLD);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Augusta Mall');
    expect(result!.streetAddress).toBe('3450 Wrightsboro Road');
    expect(result!.city).toBe('Augusta');
    expect(result!.state).toBe('GA');
    expect(result!.zip).toBe('30909');
    expect(result!.lat).toBe(33.46638);
    expect(result!.lng).toBe(-82.0805565);
  });

  it('returns null when no JSON-LD is present', async () => {
    const { extractJsonLdLocation } = await import('@/lib/events/simpleviewRss');
    const result = extractJsonLdLocation(SAMPLE_DETAIL_HTML_NO_JSONLD);

    expect(result).toBeNull();
  });

  it('returns null when JSON-LD has no location field', async () => {
    const { extractJsonLdLocation } = await import('@/lib/events/simpleviewRss');
    const result = extractJsonLdLocation(SAMPLE_DETAIL_HTML_JSONLD_NO_LOCATION);

    expect(result).toBeNull();
  });

  it('returns null when JSON-LD is malformed', async () => {
    const { extractJsonLdLocation } = await import('@/lib/events/simpleviewRss');
    const result = extractJsonLdLocation(
      '<script type="application/ld+json">{invalid json}</script>',
    );

    expect(result).toBeNull();
  });

  it('handles missing geo coordinates gracefully', async () => {
    const html = `<!DOCTYPE html><head>
<script type="application/ld+json">
{
  "@type": "Event",
  "location": {
    "@type": "Place",
    "name": "Some Venue",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Main St",
      "addressLocality": "Columbia",
      "addressRegion": "SC"
    }
  }
}
</script>
</head><body></body></html>`;

    const { extractJsonLdLocation } = await import('@/lib/events/simpleviewRss');
    const result = extractJsonLdLocation(html);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Some Venue');
    expect(result!.streetAddress).toBe('123 Main St');
    expect(result!.lat).toBeNull();
    expect(result!.lng).toBeNull();
  });

  it('handles missing address gracefully', async () => {
    const html = `<!DOCTYPE html><head>
<script type="application/ld+json">
{
  "@type": "Event",
  "location": {
    "@type": "Place",
    "name": "Virtual Venue"
  }
}
</script>
</head><body></body></html>`;

    const { extractJsonLdLocation } = await import('@/lib/events/simpleviewRss');
    const result = extractJsonLdLocation(html);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Virtual Venue');
    expect(result!.streetAddress).toBeNull();
    expect(result!.lat).toBeNull();
    expect(result!.lng).toBeNull();
  });

  it('picks the first JSON-LD block with location when multiple exist', async () => {
    const html = `<!DOCTYPE html><head>
<script type="application/ld+json">
{
  "@type": "WebSite",
  "name": "Augusta CVB"
}
</script>
<script type="application/ld+json">
{
  "@type": "Event",
  "location": {
    "@type": "Place",
    "name": "Target Venue",
    "address": { "@type": "PostalAddress", "streetAddress": "100 Event St" },
    "geo": { "@type": "GeoCoordinates", "latitude": 33.5, "longitude": -82.1 }
  }
}
</script>
</head><body></body></html>`;

    const { extractJsonLdLocation } = await import('@/lib/events/simpleviewRss');
    const result = extractJsonLdLocation(html);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Target Venue');
  });
});

describe('formatLocationFromJsonLd', () => {
  it('combines venue name and street address into a single location string', async () => {
    const { formatLocationFromJsonLd } = await import('@/lib/events/simpleviewRss');
    const result = formatLocationFromJsonLd({
      name: 'Augusta Mall',
      streetAddress: '3450 Wrightsboro Road',
      city: 'Augusta',
      state: 'GA',
      zip: '30909',
      lat: 33.46638,
      lng: -82.0805565,
    });

    expect(result).toBe('Augusta Mall, 3450 Wrightsboro Road, Augusta, GA 30909');
  });

  it('uses only name when no street address', async () => {
    const { formatLocationFromJsonLd } = await import('@/lib/events/simpleviewRss');
    const result = formatLocationFromJsonLd({
      name: 'Some Venue',
      streetAddress: null,
      city: 'Augusta',
      state: 'GA',
      zip: null,
      lat: null,
      lng: null,
    });

    expect(result).toBe('Some Venue, Augusta, GA');
  });

  it('uses only street address when no name', async () => {
    const { formatLocationFromJsonLd } = await import('@/lib/events/simpleviewRss');
    const result = formatLocationFromJsonLd({
      name: null,
      streetAddress: '123 Main St',
      city: 'Columbia',
      state: 'SC',
      zip: '29201',
      lat: null,
      lng: null,
    });

    expect(result).toBe('123 Main St, Columbia, SC 29201');
  });
});

describe('enrichSimpleviewEntries', () => {
  it('patches entries with location from detail pages', async () => {
    const { parseSimpleviewRss, enrichSimpleviewEntries } =
      await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);

    const fetcher = jest.fn().mockResolvedValue(SAMPLE_DETAIL_HTML_WITH_JSONLD);
    const enriched = await enrichSimpleviewEntries(entries, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(entries.length);
    const d0 = JSON.parse(enriched[0].CalendarData._);
    expect(d0.calendarLocation).toBe('Augusta Mall, 3450 Wrightsboro Road, Augusta, GA 30909');
  });

  it('leaves location empty when detail page has no JSON-LD', async () => {
    const { parseSimpleviewRss, enrichSimpleviewEntries } =
      await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);

    const fetcher = jest.fn().mockResolvedValue(SAMPLE_DETAIL_HTML_NO_JSONLD);
    const enriched = await enrichSimpleviewEntries(entries, fetcher);

    const d0 = JSON.parse(enriched[0].CalendarData._);
    expect(d0.calendarLocation).toBeUndefined();
  });

  it('skips entries without a website URL', async () => {
    const { parseSimpleviewRss, enrichSimpleviewEntries } =
      await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS);

    entries[0].CalendarData._ = entries[0].CalendarData._.replace(
      /"calendarWebsite":"[^"]*"/,
      '"calendarWebsite":undefined',
    );

    const fetcher = jest.fn().mockResolvedValue(SAMPLE_DETAIL_HTML_WITH_JSONLD);
    const enriched = await enrichSimpleviewEntries(entries, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(entries.length - 1);
  });

  it('handles fetch errors gracefully (keeps original entry)', async () => {
    const { parseSimpleviewRss, enrichSimpleviewEntries } =
      await import('@/lib/events/simpleviewRss');
    const entries = parseSimpleviewRss(SAMPLE_RSS).slice(0, 1);

    const fetcher = jest.fn().mockRejectedValue(new Error('Network error'));
    const enriched = await enrichSimpleviewEntries(entries, fetcher);

    expect(enriched).toHaveLength(1);
    const d0 = JSON.parse(enriched[0].CalendarData._);
    expect(d0.calendarLocation).toBeUndefined();
  });
});
