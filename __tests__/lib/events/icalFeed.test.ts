import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const SAMPLE_ICAL = `BEGIN:VCALENDAR
PRODID:-//github.com/rianjs/ical.net//NONSGML ical.net 4.0//EN
VERSION:2.0
X-WR-TIMEZONE:America/New_York
BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:STANDARD
DTSTART:20241103T020000
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=11
TZNAME:EST
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:20250309T020000
RRULE:FREQ=YEARLY;BYDAY=2SU;BYMONTH=3
TZNAME:EDT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
DESCRIPTION: https://www.waynesboroga.com/calendar.aspx?EID=3109
DTEND;TZID=America/New_York;VALUE=DATE:20261223
DTSTAMP;TZID=America/New_York:20260121T084837
DTSTART;TZID=America/New_York;VALUE=DATE:20261222
LAST-MODIFIED;TZID=America/New_York:20260121T084837
LOCATION: -   Waynesboro GA 30830
SEQUENCE:0
SUMMARY:Food Truck Downtown Event
UID:3109
URL:/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=14
END:VEVENT
BEGIN:VEVENT
DESCRIPTION: https://www.waynesboroga.com/calendar.aspx?EID=3085
DTEND;TZID=America/New_York:20261221T235900
DTSTAMP;TZID=America/New_York:20260121T084218
DTSTART;TZID=America/New_York:20261221T180000
LAST-MODIFIED;TZID=America/New_York:20260121T084218
LOCATION:<p>City Council Meeting at 6:00 PM at City Hall at 615 N Liberty Street in Waynesboro\\, GA 30830.</p> -   Waynesboro GA 30830
SEQUENCE:0
SUMMARY:City Council Meeting
UID:3085
URL:/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=14
END:VEVENT
BEGIN:VEVENT
DESCRIPTION: https://www.waynesboroga.com/calendar.aspx?EID=3114
DTEND;TZID=America/New_York:20261124T150000
DTSTAMP;TZID=America/New_York:20260121T122311
DTSTART;TZID=America/New_York:20261124T100000
LAST-MODIFIED;TZID=America/New_York:20260121T122311
LOCATION:<p>Blood Connection Blood Mobile &nbsp\\;from 10 AM - 3 PM at 540 Liberty Street</p> -   Waynesboro GA 30830
SEQUENCE:0
SUMMARY:Blood Connection Blood Mobile
UID:3114
URL:/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=14
END:VEVENT
BEGIN:VEVENT
DESCRIPTION: https://www.waynesboroga.com/calendar.aspx?EID=3101
DTEND;TZID=America/New_York;VALUE=DATE:20260429
DTSTAMP;TZID=America/New_York:20260121T121918
DTSTART;TZID=America/New_York;VALUE=DATE:20260428
LAST-MODIFIED;TZID=America/New_York:20260121T121918
LOCATION:<p>Laziza Street Eats 2 pm - 6 pm - 103 6th Street</p> -   Waynesboro GA 30830
SEQUENCE:0
SUMMARY:Food Truck Downtown Event
UID:3101
URL:/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=14
END:VEVENT
BEGIN:VEVENT
DESCRIPTION:City Hall will be closed on Wednesday\\, Dec. 25\\, 2013 in observance of Christmas Day. https://www.waynesboroga.com/calendar.aspx?EID=58
DTEND;TZID=America/New_York:20131225T180000
DTSTAMP;TZID=America/New_York:20130114T114514
DTSTART;TZID=America/New_York:20131225T070000
LAST-MODIFIED;TZID=America/New_York:20130114T114514
LOCATION: - 628 Myrick Street  Waynesboro GA 30830
SEQUENCE:0
SUMMARY:City Hall Closed
UID:58
URL:/common/modules/iCalendar/iCalendar.aspx?feed=calendar&catID=14
END:VEVENT
END:VCALENDAR`;

describe('parseIcalFeed', () => {
  it('parses VEVENT items into EprovalCalendarEntry format', async () => {
    const { parseIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = parseIcalFeed(SAMPLE_ICAL);

    expect(entries).toHaveLength(5);
    const d0 = JSON.parse(entries[0].CalendarData._);
    const d1 = JSON.parse(entries[1].CalendarData._);
    expect(d0.calendarTitle).toBe('Food Truck Downtown Event');
    expect(d1.calendarTitle).toBe('City Council Meeting');
  });

  it('maps UID to external_id', async () => {
    const { parseIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = parseIcalFeed(SAMPLE_ICAL);

    expect(entries[0].RowKey._).toBe('3109');
    expect(entries[1].RowKey._).toBe('3085');
    expect(entries[4].RowKey._).toBe('58');
  });

  it('parses DTSTART/DTEND with TZID timezone', async () => {
    const { parseIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = parseIcalFeed(SAMPLE_ICAL);
    const d1 = JSON.parse(entries[1].CalendarData._);

    expect(d1.calendarStartDate).toBe('12-21-2026');
    expect(d1.calendarEndDate).toBe('12-21-2026');
  });

  it('handles all-day events (VALUE=DATE, no time)', async () => {
    const { parseIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = parseIcalFeed(SAMPLE_ICAL);
    const d0 = JSON.parse(entries[0].CalendarData._);
    const d3 = JSON.parse(entries[3].CalendarData._);

    expect(d0.calendarStartDate).toBe('12-22-2026');
    expect(d0.calendarEndDate).toBe('12-23-2026');
    expect(d0.calendarStartTime).toBeUndefined();
    expect(d0.calendarEndTime).toBeUndefined();

    expect(d3.calendarStartDate).toBe('04-28-2026');
    expect(d3.calendarEndDate).toBe('04-29-2026');
  });

  it('extracts location (strips HTML p tags)', async () => {
    const { parseIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = parseIcalFeed(SAMPLE_ICAL);
    const d1 = JSON.parse(entries[1].CalendarData._);
    const d2 = JSON.parse(entries[2].CalendarData._);

    expect(d1.calendarLocation).toContain('City Hall');
    expect(d1.calendarLocation).toContain('615 N Liberty Street');
    expect(d1.calendarLocation).not.toContain('<p>');
    expect(d2.calendarLocation).toContain('540 Liberty Street');
    expect(d2.calendarLocation).not.toContain('<p>');
  });

  it('extracts description (strips HTML and URL)', async () => {
    const { parseIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = parseIcalFeed(SAMPLE_ICAL);
    const d4 = JSON.parse(entries[4].CalendarData._);

    expect(d4.calendarDescription).toContain('City Hall will be closed');
    expect(d4.calendarDescription).not.toContain('https://');
  });

  it('extracts time from timed events', async () => {
    const { parseIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = parseIcalFeed(SAMPLE_ICAL);
    const d1 = JSON.parse(entries[1].CalendarData._);

    expect(d1.calendarStartTime).toBe('6:00 pm');
    expect(d1.calendarEndTime).toBe('11:59 pm');
  });

  it('extracts event URL into calendarWebsite', async () => {
    const { parseIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = parseIcalFeed(SAMPLE_ICAL);
    const d0 = JSON.parse(entries[0].CalendarData._);

    expect(d0.calendarWebsite).toContain('waynesboroga.com/calendar.aspx?EID=3109');
  });

  it('returns empty array for empty calendar', async () => {
    const { parseIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = parseIcalFeed('BEGIN:VCALENDAR\nEND:VCALENDAR');

    expect(entries).toHaveLength(0);
  });

  it('uses LAST-MODIFIED as timestamp', async () => {
    const { parseIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = parseIcalFeed(SAMPLE_ICAL);

    expect(entries[0].Timestamp._).toContain('2026-01-21');
    expect(entries[4].Timestamp._).toContain('2013-01-14');
  });
});

describe('fetchIcalFeed', () => {
  const TEST_URL =
    'https://www.waynesboroga.com/common/modules/iCalendar/iCalendar.aspx?catID=14&feed=calendar';
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches iCal and returns parsed entries', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_ICAL),
    });

    const { fetchIcalFeed } = await import('@/lib/events/icalFeed');
    const entries = await fetchIcalFeed(TEST_URL);

    expect(global.fetch).toHaveBeenCalledWith(
      TEST_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': 'TruckFull/1.0' }),
      }),
    );
    expect(entries).toHaveLength(5);
    expect(entries[0].RowKey._).toBe('3109');
  });

  it('throws on HTTP error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { fetchIcalFeed } = await import('@/lib/events/icalFeed');
    await expect(fetchIcalFeed(TEST_URL)).rejects.toThrow('500');
  });
});
