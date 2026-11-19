import { describe, it, expect, jest, afterEach } from '@jest/globals';
import {
  buildQueryUrl,
  featureToEntry,
  fetchArcgisPermits,
  type ArcgisPermitConfig,
} from '@/lib/events/arcgisPermits';
import type { CalendarData, EprovalCalendarEntry } from '@/lib/events/types';

const POINT_CONFIG: ArcgisPermitConfig = {
  layerUrl: 'https://example.com/arcgis/rest/services/Events/FeatureServer/0',
  where: "status='Approved'",
  idField: 'GlobalID',
  titleField: 'name',
  startField: 'start',
  endField: 'end',
  categoryField: 'type',
  descriptionField: 'details',
  organizationField: 'org',
  websiteField: 'url',
  locationField: 'place',
  defaultLocation: 'Sampletown, NC',
};

const ROUTE_CONFIG: ArcgisPermitConfig = {
  layerUrl: 'https://example.com/arcgis/rest/services/Routes/FeatureServer/0',
  where: "status='Approved'",
  idField: 'OBJECTID',
  titleField: 'EVENT_NAME',
  startField: 'EVENT_STARTDATE',
  endField: 'EVENT_ENDDATE',
  defaultLocation: 'Sampletown, NC',
};

const OCT_24_8AM_EDT = Date.UTC(2026, 9, 24, 12, 0);
const OCT_24_1PM_EDT = Date.UTC(2026, 9, 24, 17, 0);
const DEC_5_7PM_EST = Date.UTC(2026, 11, 6, 0, 0);

function dataOf(entry: EprovalCalendarEntry | null): CalendarData {
  if (!entry) throw new Error('expected an entry');
  return JSON.parse(entry.CalendarData._) as CalendarData;
}

describe('featureToEntry', () => {
  it('maps a point feature to an approved calendar entry in Eastern time', () => {
    const entry = featureToEntry(
      {
        attributes: {
          GlobalID: '{abc-123}',
          name: ' Sample Street Fair ',
          start: OCT_24_8AM_EDT,
          end: OCT_24_1PM_EDT,
          type: 'Fairorfestival',
          details: 'Music and local vendors',
          org: 'Sample Parks Department',
          url: 'https://example.org/fair',
          place: '100 Main St',
        },
        geometry: { x: -78.9, y: 36.0 },
      },
      POINT_CONFIG,
    );

    expect(entry?.PartitionKey._).toBe('Public_Approved_{abc-123}');
    expect(entry?.RowKey._).toBe('{abc-123}');
    expect(entry?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(dataOf(entry)).toEqual({
      calendarTitle: 'Sample Street Fair',
      calendarStartDate: '10-24-2026',
      calendarStartTime: '08:00 am',
      calendarEndDate: '10-24-2026',
      calendarEndTime: '01:00 pm',
      calendarPermitStartDate: '10-24-2026',
      calendarPermitEndDate: '10-24-2026',
      calendarDescription: 'Music and local vendors',
      calendarCategory: 'Fairorfestival',
      calendarOrganization: 'Sample Parks Department',
      calendarWebsite: 'https://example.org/fair',
      calendarLocation: '100 Main St',
      calendarLat: 36.0,
      calendarLng: -78.9,
    });
  });

  it('uses the first route point and the default location for line features', () => {
    const data = dataOf(
      featureToEntry(
        {
          attributes: {
            OBJECTID: 42,
            EVENT_NAME: 'Sample Parade',
            EVENT_STARTDATE: DEC_5_7PM_EST,
            EVENT_ENDDATE: null,
          },
          geometry: {
            paths: [
              [
                [-78.64, 35.78],
                [-78.63, 35.79],
              ],
            ],
          },
        },
        ROUTE_CONFIG,
      ),
    );

    expect(data.calendarStartDate).toBe('12-05-2026');
    expect(data.calendarStartTime).toBe('07:00 pm');
    expect(data.calendarEndDate).toBe('12-05-2026');
    expect(data.calendarLocation).toBe('Sampletown, NC');
    expect(data.calendarLat).toBe(35.78);
    expect(data.calendarLng).toBe(-78.64);
  });

  it('drops websites that are not real http links', () => {
    const data = dataOf(
      featureToEntry(
        {
          attributes: {
            GlobalID: 'g1',
            name: 'Sample Market',
            start: OCT_24_8AM_EDT,
            end: OCT_24_1PM_EDT,
            url: 'TBD',
          },
        },
        POINT_CONFIG,
      ),
    );

    expect(data.calendarWebsite).toBeUndefined();
    expect(data.calendarLocation).toBe('Sampletown, NC');
  });

  it('returns null when the title, start date or id is missing', () => {
    const base = { GlobalID: 'g2', name: 'Sample', start: OCT_24_8AM_EDT, end: null };

    expect(featureToEntry({ attributes: { ...base, name: '  ' } }, POINT_CONFIG)).toBeNull();
    expect(featureToEntry({ attributes: { ...base, start: null } }, POINT_CONFIG)).toBeNull();
    expect(featureToEntry({ attributes: { ...base, GlobalID: null } }, POINT_CONFIG)).toBeNull();
  });
});

describe('buildQueryUrl', () => {
  it('requests only the mapped fields with paging and WGS84 output', () => {
    const url = new URL(buildQueryUrl(ROUTE_CONFIG, 1000));

    expect(url.pathname.endsWith('/FeatureServer/0/query')).toBe(true);
    expect(url.searchParams.get('where')).toBe("status='Approved'");
    expect(url.searchParams.get('outFields')).toBe(
      'OBJECTID,EVENT_NAME,EVENT_STARTDATE,EVENT_ENDDATE',
    );
    expect(url.searchParams.get('resultOffset')).toBe('1000');
    expect(url.searchParams.get('outSR')).toBe('4326');
    expect(url.searchParams.get('f')).toBe('json');
  });
});

describe('fetchArcgisPermits', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('advances the offset by the features received when the server caps pages', async () => {
    const page = (ids: readonly number[], more: boolean): Response =>
      new Response(
        JSON.stringify({
          features: ids.map((id) => ({
            attributes: {
              OBJECTID: id,
              EVENT_NAME: `Event ${id}`,
              EVENT_STARTDATE: OCT_24_8AM_EDT,
            },
          })),
          exceededTransferLimit: more,
        }),
      );
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(page([1, 2], true))
      .mockResolvedValueOnce(page([3], false));

    const entries = await fetchArcgisPermits(ROUTE_CONFIG);

    expect(entries.map((e) => e.RowKey._)).toEqual(['1', '2', '3']);
    const offsets = fetchMock.mock.calls.map(([url]) =>
      new URL(String(url)).searchParams.get('resultOffset'),
    );
    expect(offsets).toEqual(['0', '2']);
  });
});
