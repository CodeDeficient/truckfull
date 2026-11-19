import { jest, describe, it, expect } from '@jest/globals';

jest.unstable_mockModule('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          setDefaultTimeout: jest.fn(),
          goto: jest.fn(),
          $: jest.fn().mockResolvedValue(null),
          click: jest.fn(),
          waitForTimeout: jest.fn(),
          $eval: jest.fn().mockResolvedValue('<div class="ai1ec-calendar">mock</div>'),
          $$: jest.fn().mockResolvedValue([]),
        }),
      }),
      close: jest.fn(),
    }),
  },
}));

const SAMPLE_HTML = `
<div class="ai1ec-date-events">
  <div class="ai1ec-event ai1ec-event-id-64298 ai1ec-event-instance-id-16311 ai1ec-allday" data-end="">
    <div class="ai1ec-event-header">
      <div class="ai1ec-event-toggle">
        <i class="ai1ec-fa ai1ec-fa-minus-circle ai1ec-fa-lg"></i>
        <i class="ai1ec-fa ai1ec-fa-plus-circle ai1ec-fa-lg"></i>
      </div>
      <span class="ai1ec-event-title">Red Recycling Week</span>
      <div class="ai1ec-event-time"> Mar 30 <span class="ai1ec-allday-badge">all-day</span></div>
    </div>
    <div class="ai1ec-event-summary">
      <div class="ai1ec-event-description">
        <a class="ai1ec-load-event" href="https://www.cityofaikensc.gov/event/red-recycling-week/?instance_id=16311">
          <div class="ai1ec-event-avatar timely ai1ec-post_thumbnail ai1ec-landscape"><img src="https://example.com/image.jpg" alt="Red Recycling Week" width="700" height="394"></div>
        </a>
      </div>
    </div>
  </div>

  <div class="ai1ec-event ai1ec-event-id-68788 ai1ec-event-instance-id-16743" data-end="">
    <div class="ai1ec-event-header">
      <div class="ai1ec-event-toggle">
        <i class="ai1ec-fa ai1ec-fa-minus-circle ai1ec-fa-lg"></i>
        <i class="ai1ec-fa ai1ec-fa-plus-circle ai1ec-fa-lg"></i>
      </div>
      <span class="ai1ec-event-title">Spring Sports Season</span>
      <div class="ai1ec-event-time"> Mar 31 @ 3:00 pm</div>
    </div>
    <div class="ai1ec-event-summary">
      <div class="ai1ec-event-description">
        <a class="ai1ec-load-event" href="https://www.cityofaikensc.gov/event/spring-sports-season/?instance_id=16743">
          <div class="ai1ec-event-avatar timely ai1ec-post_thumbnail ai1ec-landscape"><img src="https://example.com/sports.jpg" alt="Spring Sports Season @ Citizens Park" width="529" height="398"></div>
        </a>
        <p>Get ready — Spring 2026 Sports – The season runs from February 16- May 29th. Programs for all skill levels.</p>
      </div>
    </div>
  </div>

  <div class="ai1ec-event ai1ec-event-id-69010 ai1ec-event-instance-id-16470" data-end="">
    <div class="ai1ec-event-header">
      <div class="ai1ec-event-toggle">
        <i class="ai1ec-fa ai1ec-fa-minus-circle ai1ec-fa-lg"></i>
        <i class="ai1ec-fa ai1ec-fa-plus-circle ai1ec-fa-lg"></i>
      </div>
      <span class="ai1ec-event-title">Spring Story Time</span>
      <div class="ai1ec-event-time"> Mar 31 @ 4:00 pm – 5:00 pm</div>
    </div>
    <div class="ai1ec-event-summary">
      <div class="ai1ec-event-description">
        <a class="ai1ec-load-event" href="https://www.cityofaikensc.gov/event/spring-story-time/?instance_id=16470">
          <div class="ai1ec-event-avatar timely ai1ec-post_thumbnail ai1ec-landscape"><img src="https://example.com/story.jpg" alt="Spring Story Time @ Rye Patch" width="708" height="398"></div>
        </a>
        <p>Spring Story Time is BACK and we can't wait to see you on the lawn at Rye Patch! Join us every Tuesday in March, April &amp; May at 4:00 PM for fun stories, fresh air,</p>
      </div>
    </div>
  </div>

  <div class="ai1ec-event ai1ec-event-id-68788 ai1ec-event-instance-id-16744" data-end="">
    <div class="ai1ec-event-header">
      <div class="ai1ec-event-toggle">
        <i class="ai1ec-fa ai1ec-fa-minus-circle ai1ec-fa-lg"></i>
        <i class="ai1ec-fa ai1ec-fa-plus-circle ai1ec-fa-lg"></i>
      </div>
      <span class="ai1ec-event-title">Spring Sports Season</span>
      <div class="ai1ec-event-time"> Apr 1 @ 3:00 pm</div>
    </div>
    <div class="ai1ec-event-summary">
      <div class="ai1ec-event-description">
        <a class="ai1ec-load-event" href="https://www.cityofaikensc.gov/event/spring-sports-season/?instance_id=16744">
          <div class="ai1ec-event-avatar timely ai1ec-post_thumbnail ai1ec-landscape"><img src="https://example.com/sports2.jpg" alt="Spring Sports Season @ Citizens Park" width="529" height="398"></div>
        </a>
        <p>Get ready — Spring 2026 Sports – The season runs from February 16- May 29th.</p>
      </div>
    </div>
  </div>
</div>
`;

const CELL_DATE = '3/30/2026';

describe('parseAikenCalendarHtml', () => {
  it('parses ai1ec events into EprovalCalendarEntry format', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml(SAMPLE_HTML, CELL_DATE);

    expect(entries.length).toBeGreaterThanOrEqual(3);
    const d0 = JSON.parse(entries[0].CalendarData._);
    expect(d0.calendarTitle).toBe('Red Recycling Week');
  });

  it('extracts event ID from ai1ec-event-id class', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml(SAMPLE_HTML, CELL_DATE);

    expect(entries[0].RowKey._).toBe('64298');
    expect(entries[1].RowKey._).toBe('68788');
    expect(entries[2].RowKey._).toBe('69010');
  });

  it('deduplicates events by ID (same event on multiple dates)', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml(SAMPLE_HTML, CELL_DATE);

    const ids = entries.map((e) => e.RowKey._);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('parses all-day events', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml(SAMPLE_HTML, CELL_DATE);
    const d0 = JSON.parse(entries[0].CalendarData._);

    expect(d0.calendarStartDate).toBe('03-30-2026');
    expect(d0.calendarStartTime).toBeUndefined();
    expect(d0.calendarEndTime).toBeUndefined();
  });

  it('parses timed events with start time only', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml(SAMPLE_HTML, CELL_DATE);
    const d1 = JSON.parse(entries[1].CalendarData._);

    expect(d1.calendarStartDate).toBe('03-31-2026');
    expect(d1.calendarStartTime).toBe('3:00 pm');
    expect(d1.calendarEndTime).toBeUndefined();
  });

  it('parses timed events with start and end time', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml(SAMPLE_HTML, CELL_DATE);
    const d2 = JSON.parse(entries[2].CalendarData._);

    expect(d2.calendarStartTime).toBe('4:00 pm');
    expect(d2.calendarEndTime).toBe('5:00 pm');
  });

  it('extracts description text from p tags (strips HTML)', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml(SAMPLE_HTML, CELL_DATE);
    const d1 = JSON.parse(entries[1].CalendarData._);

    expect(d1.calendarDescription).toContain('Spring 2026 Sports');
    expect(d1.calendarDescription).not.toContain('<img');
    expect(d1.calendarDescription).not.toContain('<a');
  });

  it('stores event URL in calendarWebsite', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml(SAMPLE_HTML, CELL_DATE);
    const d1 = JSON.parse(entries[1].CalendarData._);

    expect(d1.calendarWebsite).toBe(
      'https://www.cityofaikensc.gov/event/spring-sports-season/?instance_id=16743',
    );
  });

  it('decodes HTML entities in description', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml(SAMPLE_HTML, CELL_DATE);
    const d2 = JSON.parse(entries[2].CalendarData._);

    expect(d2.calendarDescription).toContain('March, April & May');
  });

  it('returns empty array for empty HTML', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml('<div></div>', CELL_DATE);

    expect(entries).toHaveLength(0);
  });

  it('uses cell date to determine event date when time text lacks month', async () => {
    const { parseAikenCalendarHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenCalendarHtml(SAMPLE_HTML, CELL_DATE);
    const d1 = JSON.parse(entries[1].CalendarData._);

    expect(d1.calendarStartDate).toBe('03-31-2026');
  });
});

describe('parseAikenEventTime', () => {
  it('parses all-day time text', async () => {
    const { parseAikenEventTime } = await import('@/lib/events/aikenCalendar');
    const result = parseAikenEventTime('Mar 30 all-day');
    expect(result.startTime).toBeUndefined();
    expect(result.endTime).toBeUndefined();
  });

  it('parses single time', async () => {
    const { parseAikenEventTime } = await import('@/lib/events/aikenCalendar');
    const result = parseAikenEventTime('Mar 31 @ 3:00 pm');
    expect(result.startTime).toBe('3:00 pm');
    expect(result.endTime).toBeUndefined();
  });

  it('parses time range with en-dash', async () => {
    const { parseAikenEventTime } = await import('@/lib/events/aikenCalendar');
    const result = parseAikenEventTime('Mar 31 @ 4:00 pm – 5:00 pm');
    expect(result.startTime).toBe('4:00 pm');
    expect(result.endTime).toBe('5:00 pm');
  });

  it('parses time range with regular dash', async () => {
    const { parseAikenEventTime } = await import('@/lib/events/aikenCalendar');
    const result = parseAikenEventTime('Mar 31 @ 10:00 am - 3:00 pm');
    expect(result.startTime).toBe('10:00 am');
    expect(result.endTime).toBe('3:00 pm');
  });
});

const SAMPLE_MONTH_VIEW = `
<table class="ai1ec-month-view">
<tbody>
  <tr class="ai1ec-week">
    <td>
      <div class="ai1ec-day">
        <div class="ai1ec-date"><a href="#">7</a></div>
        <a href="https://www.cityofaikensc.gov/event/movie-night-in-the-park-2/?instance_id=16274" class="ai1ec-event-container ai1ec-popup-trigger ai1ec-event-id-68783 ai1ec-event-instance-id-16274">
          <div class="ai1ec-event" style="color: #16a085 !important;">
            <span class="ai1ec-event-title">Movie Night in the Park</span>
            <span class="ai1ec-event-time">5:00 pm</span>
          </div>
        </a>
      </div>
    </td>
    <td>
      <div class="ai1ec-day">
        <div class="ai1ec-date"><a href="#">9</a></div>
        <a href="https://www.cityofaikensc.gov/event/city-council-meetings-2024/?instance_id=16184" class="ai1ec-event-container ai1ec-popup-trigger ai1ec-event-id-63567 ai1ec-event-instance-id-16184">
          <div class="ai1ec-event" style="color: #8e44ad !important;">
            <span class="ai1ec-event-title">City Council Meeting</span>
            <span class="aiec-event-time">7:00 pm</span>
          </div>
        </a>
        <a href="https://www.cityofaikensc.gov/event/spring-sports-season/?instance_id=16721" class="ai1ec-event-container ai1ec-popup-trigger ai1ec-event-id-68788 ai1ec-event-instance-id-16721">
          <div class="aiec-event" style="color: #16a085 !important;">
            <span class="ai1ec-event-title">Spring Sports Season</span>
            <span class="aiec-event-time">3:00 pm</span>
          </div>
        </a>
      </div>
    </td>
  </tr>
</tbody>
</table>

<div class="ai1ec-popover ai1ec-popup-in-month-view ai1ec-event-id-68783 ai1ec-event-instance-id-16274">
  <div class="ai1ec-color-swatches"><span class="ai1ec-color-swatch" style="background:#16a085" title="Parks Recreation and Tourism"></span></div>
  <span class="ai1ec-popup-title"><a href="https://www.cityofaikensc.gov/event/movie-night-in-the-park-2/?instance_id=16274">Movie Night in the Park</a></span>
  <div class="aiec-event-time">Mar 7 @ 5:00 pm – 8:00 pm</div>
  <a class="ai1ec-load-event" href="https://www.cityofaikensc.gov/event/movie-night-in-the-park-2/?instance_id=16274">
    <div class="ai1ec-event-avatar timely ai1ec-post_thumbnail ai1ec-landscape"><img src="https://example.com/mip.jpg" alt="Movie Night in the Park @ Beverly B. Clyburn Generations Park" width="531" height="398"></div>
  </a>
  <div class="ai1ec-popup-excerpt">Movie Night in the Park | Free Admission Grab your blankets, lawn chairs, and favorite snacks.</div>
</div>

<div class="ai1ec-popover ai1ec-popup-in-month-view ai1ec-event-id-63567 ai1ec-event-instance-id-16184">
  <div class="aiec-color-swatches"><span class="ai1ec-color-swatch" style="background:#8e44ad" title="Meetings"></span></div>
  <span class="aiec-popup-title"><a href="https://www.cityofaikensc.gov/event/city-council-meetings-2024/?instance_id=16184">City Council Meeting</a></span>
  <div class="ai1ec-event-time">Mar 9 @ 7:00 pm</div>
  <a class="ai1ec-load-event" href="https://www.cityofaikensc.gov/event/city-council-meetings-2024/?instance_id=16184">
    <div class="ai1ec-event-avatar timely ai1ec-post_thumbnail ai1ec-landscape"><img src="https://example.com/council.jpg" alt="City Council Meeting" width="700" height="394"></div>
  </a>
  <div class="aiec-popup-excerpt">Aiken City Council Municipal Building, 111 Chesterfield St S</div>
</div>

<div class="ai1ec-popover ai1ec-popup-in-month-view ai1ec-event-id-68788 ai1ec-event-instance-id-16721">
  <div class="ai1ec-color-swatches"><span class="aiec-color-swatch" style="background:#16a085" title="Parks Recreation and Tourism"></span></div>
  <span class="aiec-popup-title"><a href="https://www.cityofaikensc.gov/event/spring-sports-season/?instance_id=16721">Spring Sports Season</a></span>
  <div class="aiec-event-time">Mar 9 @ 3:00 pm</div>
  <a class="aiec-load-event" href="https://www.cityofaikensc.gov/event/spring-sports-season/?instance_id=16721">
    <div class="aiec-event-avatar timely ai1ec-post_thumbnail ai1ec-landscape"><img src="https://example.com/sports.jpg" alt="Spring Sports Season @ Citizens Park" width="529" height="398"></div>
  </a>
  <div class="aiec-popup-excerpt">Get ready — Spring 2026 Sports – The season runs from February 16- May 29th.</div>
</div>
`;

describe('parseAikenMonthViewHtml', () => {
  it('extracts events from month view table cells', async () => {
    const { parseAikenMonthViewHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenMonthViewHtml(SAMPLE_MONTH_VIEW);

    expect(entries.length).toBeGreaterThanOrEqual(3);
    const titles = entries.map((e) => JSON.parse(e.CalendarData._).calendarTitle);
    expect(titles).toContain('Movie Night in the Park');
    expect(titles).toContain('City Council Meeting');
    expect(titles).toContain('Spring Sports Season');
  });

  it('extracts location from image alt text (@ Venue Name)', async () => {
    const { parseAikenMonthViewHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenMonthViewHtml(SAMPLE_MONTH_VIEW);

    const movieEvent = entries.find(
      (e) => JSON.parse(e.CalendarData._).calendarTitle === 'Movie Night in the Park',
    );
    expect(movieEvent).toBeDefined();
    const data = JSON.parse(movieEvent!.CalendarData._);
    expect(data.calendarLocation).toBe('Beverly B. Clyburn Generations Park');
  });

  it('extracts location from img alt text with no @ prefix', async () => {
    const { parseAikenMonthViewHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenMonthViewHtml(SAMPLE_MONTH_VIEW);

    const sportsEvent = entries.find(
      (e) => JSON.parse(e.CalendarData._).calendarTitle === 'Spring Sports Season',
    );
    expect(sportsEvent).toBeDefined();
    const data = JSON.parse(sportsEvent!.CalendarData._);
    expect(data.calendarLocation).toBe('Citizens Park');
  });

  it('returns empty location when no @ in alt text', async () => {
    const { parseAikenMonthViewHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenMonthViewHtml(SAMPLE_MONTH_VIEW);

    const councilEvent = entries.find(
      (e) => JSON.parse(e.CalendarData._).calendarTitle === 'City Council Meeting',
    );
    expect(councilEvent).toBeDefined();
    const data = JSON.parse(councilEvent!.CalendarData._);
    expect(data.calendarLocation).toBeUndefined();
  });

  it('extracts event IDs and deduplicates', async () => {
    const { parseAikenMonthViewHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenMonthViewHtml(SAMPLE_MONTH_VIEW);

    const ids = entries.map((e) => e.RowKey._);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    expect(ids).toContain('68783');
    expect(ids).toContain('63567');
  });

  it('extracts time from popover', async () => {
    const { parseAikenMonthViewHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenMonthViewHtml(SAMPLE_MONTH_VIEW);

    const movieEvent = entries.find(
      (e) => JSON.parse(e.CalendarData._).calendarTitle === 'Movie Night in the Park',
    );
    const data = JSON.parse(movieEvent!.CalendarData._);
    expect(data.calendarStartTime).toBe('5:00 pm');
    expect(data.calendarEndTime).toBe('8:00 pm');
  });

  it('extracts event URL from popover link', async () => {
    const { parseAikenMonthViewHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenMonthViewHtml(SAMPLE_MONTH_VIEW);

    const movieEvent = entries.find(
      (e) => JSON.parse(e.CalendarData._).calendarTitle === 'Movie Night in the Park',
    );
    const data = JSON.parse(movieEvent!.CalendarData._);
    expect(data.calendarWebsite).toBe(
      'https://www.cityofaikensc.gov/event/movie-night-in-the-park-2/?instance_id=16274',
    );
  });

  it('returns empty array for empty table', async () => {
    const { parseAikenMonthViewHtml } = await import('@/lib/events/aikenCalendar');
    const entries = parseAikenMonthViewHtml(
      '<table class="ai1ec-month-view"><tbody></tbody></table>',
    );

    expect(entries).toHaveLength(0);
  });

  it('excludes events with no popover date enrichment', async () => {
    const { parseAikenMonthViewHtml } = await import('@/lib/events/aikenCalendar');
    const html = `
<table class="ai1ec-month-view">
<tbody>
  <tr class="ai1ec-week">
    <td>
      <div class="ai1ec-day">
        <div class="ai1ec-date"><a href="#">7</a></div>
        <a href="#" class="ai1ec-event-container ai1ec-popup-trigger ai1ec-event-id-99999 ai1ec-event-instance-id-11111">
          <div class="ai1ec-event" style="color: #16a085 !important;">
            <span class="ai1ec-event-title">Orphan Event</span>
            <span class="ai1ec-event-time">5:00 pm</span>
          </div>
        </a>
      </div>
    </td>
  </tr>
</tbody>
</table>
`;
    const entries = parseAikenMonthViewHtml(html);

    expect(entries).toHaveLength(0);
  });

  it('includes events whose popover provides a date', async () => {
    const { parseAikenMonthViewHtml } = await import('@/lib/events/aikenCalendar');
    const html = `
<table class="ai1ec-month-view">
<tbody>
  <tr class="ai1ec-week">
    <td>
      <div class="ai1ec-day">
        <div class="ai1ec-date"><a href="#">7</a></div>
        <a href="#" class="ai1ec-event-container ai1ec-popup-trigger ai1ec-event-id-99999 ai1ec-event-instance-id-11111">
          <div class="ai1ec-event" style="color: #16a085 !important;">
            <span class="ai1ec-event-title">Enriched Event</span>
            <span class="ai1ec-event-time">5:00 pm</span>
          </div>
        </a>
      </div>
    </td>
  </tr>
</tbody>
</table>

<div class="ai1ec-popover ai1ec-popup-in-month-view ai1ec-event-id-99999 ai1ec-event-instance-id-11111">
  <span class="ai1ec-popup-title">Enriched Event</span>
  <div class="aiec-event-time">Mar 7 @ 5:00 pm</div>
  <a class="ai1ec-load-event" href="https://example.com">
    <div class="ai1ec-event-avatar timely ai1ec-post_thumbnail ai1ec-landscape"><img src="https://example.com/img.jpg" alt="Enriched Event @ Some Park" width="531" height="398"></div>
  </a>
</div>
`;
    const entries = parseAikenMonthViewHtml(html);

    expect(entries).toHaveLength(1);
    const data = JSON.parse(entries[0].CalendarData._);
    expect(data.calendarTitle).toBe('Enriched Event');
    expect(data.calendarStartDate).toBe('03-07-2026');
  });
});
