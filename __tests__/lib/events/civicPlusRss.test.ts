import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:calendarEvent="https://www.augustaga.gov/Calendar.aspx">
  <channel>
    <title>Augusta - Calendar</title>
    <link>https://www.augustaga.gov/Calendar.aspx</link>
    <lastBuildDate>Mon, 30 Mar 2026 15:03:05 -0500</lastBuildDate>
    <item>
      <title>Commission Meeting</title>
      <link>https://www.augustaga.gov/Calendar.aspx?EID=5880</link>
      <pubDate>Fri, 09 Jan 2026 09:13:51 -0500</pubDate>
      <description>&lt;strong&gt;Event date:&lt;/strong&gt; March 31, 2026 &lt;br&gt;&lt;strong&gt;Event Time: &lt;/strong&gt; 02:00 PM - 05:00 PM&lt;br&gt;&lt;strong&gt;Location:&lt;/strong&gt; &lt;br&gt;535 Telfair St&lt;br&gt;Lee N. Beard Commission Chamber&lt;br&gt;Augusta, GA 30901</description>
      <calendarEvent:EventDates> March 31, 2026 </calendarEvent:EventDates>
      <calendarEvent:EventTimes>02:00 PM - 05:00 PM</calendarEvent:EventTimes>
      <calendarEvent:Location>535 Telfair St&lt;br&gt;Lee N. Beard Commission ChamberAugusta, GA 30901</calendarEvent:Location>
      <guid isPermaLink="false">https://www.augustaga.gov/Calendar.aspx?EID=5880/639035468310000000</guid>
    </item>
    <item>
      <title>Easter Egg Hunt 2026</title>
      <link>https://www.augustaga.gov/Calendar.aspx?EID=6086</link>
      <pubDate>Tue, 10 Mar 2026 11:48:05 -0500</pubDate>
      <description>&lt;strong&gt;Event date:&lt;/strong&gt; April 1, 2026 &lt;br&gt;&lt;strong&gt;Event Time: &lt;/strong&gt; 05:30 PM - 07:30 PM&lt;br&gt;&lt;strong&gt;Location:&lt;/strong&gt; &lt;br&gt;2540 Wheeler Rd.&lt;br&gt;Augusta, GA 30904&lt;br&gt;&lt;strong&gt;Description:&lt;/strong&gt;&lt;br&gt;Sand Hills Community Center Easter Egg Hunt</description>
      <calendarEvent:EventDates> April 1, 2026 </calendarEvent:EventDates>
      <calendarEvent:EventTimes>05:30 PM - 07:30 PM</calendarEvent:EventTimes>
      <calendarEvent:Location>2540 Wheeler Rd.Augusta, GA 30904</calendarEvent:Location>
      <guid isPermaLink="false">https://www.augustaga.gov/Calendar.aspx?EID=6086/639087436850000000</guid>
    </item>
    <item>
      <title>Advance Voting Runoff</title>
      <link>https://www.augustaga.gov/Calendar.aspx?EID=6091</link>
      <pubDate>Mon, 16 Mar 2026 14:57:56 -0500</pubDate>
      <description>&lt;strong&gt;Event dates:&lt;/strong&gt; March 30, 2026 - April 2, 2026&lt;br&gt;&lt;strong&gt;Event Time: &lt;/strong&gt; 08:30 AM - 06:00 PM&lt;br&gt;&lt;strong&gt;Location:&lt;/strong&gt; &lt;br&gt;Augusta, GA 30901</description>
      <calendarEvent:EventDates>March 30, 2026 - April 2, 2026</calendarEvent:EventDates>
      <calendarEvent:EventTimes>08:30 AM - 06:00 PM</calendarEvent:EventTimes>
      <calendarEvent:Location>Augusta, GA 30901</calendarEvent:Location>
      <guid isPermaLink="false">https://www.augustaga.gov/Calendar.aspx?EID=6091/639092734760000000</guid>
    </item>
  </channel>
</rss>`;

describe('parseCivicPlusRss', () => {
  it('parses RSS items into EprovalCalendarEntry format', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(SAMPLE_RSS);

    expect(entries).toHaveLength(3);
    const d0 = JSON.parse(entries[0].CalendarData._);
    const d1 = JSON.parse(entries[1].CalendarData._);
    const d2 = JSON.parse(entries[2].CalendarData._);
    expect(d0.calendarTitle).toBe('Commission Meeting');
    expect(d1.calendarTitle).toBe('Easter Egg Hunt 2026');
    expect(d2.calendarTitle).toBe('Advance Voting Runoff');
  });

  it('extracts EID as external_id from link URL', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(SAMPLE_RSS);

    expect(entries[0].RowKey._).toBe('5880');
    expect(entries[1].RowKey._).toBe('6086');
    expect(entries[2].RowKey._).toBe('6091');
  });

  it('sets PartitionKey to RSS_Published so permit filter includes it', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(SAMPLE_RSS);

    for (const entry of entries) {
      expect(entry.PartitionKey._).toContain('Approved');
    }
  });

  it('maps pubDate to Timestamp as ISO string', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(SAMPLE_RSS);

    expect(entries[0].Timestamp._).toContain('2026-01-09');
    expect(entries[1].Timestamp._).toContain('2026-03-10');
  });

  it('maps CalendarData with correct date format (MM-DD-YYYY)', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(SAMPLE_RSS);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarStartDate).toBe('03-31-2026');
    expect(data.calendarEndDate).toBe('03-31-2026');
  });

  it('handles multi-day date ranges', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(SAMPLE_RSS);
    const data = JSON.parse(entries[2].CalendarData._);

    expect(data.calendarStartDate).toBe('03-30-2026');
    expect(data.calendarEndDate).toBe('04-02-2026');
  });

  it('maps time format to h:mm am/pm', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(SAMPLE_RSS);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarStartTime).toBe('02:00 pm');
    expect(data.calendarEndTime).toBe('05:00 pm');
  });

  it('maps location from calendarEvent namespace', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(SAMPLE_RSS);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarLocation).toContain('535 Telfair St');
  });

  it('extracts description from HTML when present', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(SAMPLE_RSS);
    const data = JSON.parse(entries[1].CalendarData._);

    expect(data.calendarDescription).toContain('Sand Hills');
  });

  it('stores source_url in CalendarData', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(SAMPLE_RSS);
    const data = JSON.parse(entries[0].CalendarData._);

    expect(data.calendarWebsite).toBe('https://www.augustaga.gov/Calendar.aspx?EID=5880');
  });

  it('returns empty array for empty RSS', async () => {
    const { parseCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = parseCivicPlusRss(`<?xml version="1.0"?><rss><channel></channel></rss>`);

    expect(entries).toHaveLength(0);
  });
});

describe('fetchCivicPlusRss', () => {
  const TEST_URL = 'https://www.augustaga.gov/RSSFeed.aspx?ModID=58&CID=All-calendar.xml';
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches RSS XML and returns parsed entries', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_RSS),
    });

    const { fetchCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    const entries = await fetchCivicPlusRss(TEST_URL);

    expect(global.fetch).toHaveBeenCalledWith(
      TEST_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': 'TruckFull/1.0' }),
      }),
    );
    expect(entries).toHaveLength(3);
    expect(entries[0].RowKey._).toBe('5880');
  });

  it('throws on HTTP error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const { fetchCivicPlusRss } = await import('@/lib/events/civicPlusRss');
    await expect(fetchCivicPlusRss(TEST_URL)).rejects.toThrow('503');
  });
});
