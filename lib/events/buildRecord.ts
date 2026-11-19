import { parseEprovalDate, parseEprovalTime } from './dateParsing';
import { calendarDataSchema } from './types';
import type { CalendarData, EprovalCityConfig, EprovalCalendarEntry, PermitStatus } from './types';
import type { Database } from '@/lib/database.remote.types';

const ISO_DATETIME_PREFIX = /^\d{4}-\d{2}-\d{2}T/;

export type ExternalEventInsert = Database['public']['Tables']['external_events']['Insert'];

export interface BuildRecordInput {
  entry: EprovalCalendarEntry;
  data: CalendarData;
  permitStatus: PermitStatus;
  lat: number | null;
  lng: number | null;
  config: EprovalCityConfig;
  relevanceScore: number;
}

export interface ParseIssueDiagnostic {
  readonly path: readonly (string | number)[];
  readonly code: string;
}

export interface ParseEntryResult {
  readonly data: CalendarData | null;
  readonly issues: readonly ParseIssueDiagnostic[];
}

function isPermitSource(config: EprovalCityConfig): boolean {
  return config.sourceType === 'eproval' || config.sourceType === 'arcgis_permits';
}

function isIsoDate(value: string | undefined | null): value is string {
  if (!value) return false;
  return ISO_DATETIME_PREFIX.test(value);
}

export function formatDateForDb(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseEntryWithDiagnostics(entry: EprovalCalendarEntry): ParseEntryResult {
  const rawText = entry.CalendarData?._;
  if (!rawText) {
    return {
      data: null,
      issues: [{ path: ['CalendarData'], code: 'missing_calendar_data' }],
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return { data: null, issues: [{ path: [], code: 'invalid_json' }] };
  }

  const parsed = calendarDataSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      data: null,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.filter(
          (segment): segment is string | number =>
            typeof segment === 'string' || typeof segment === 'number',
        ),
        code: issue.code,
      })),
    };
  }

  return { data: parsed.data, issues: [] };
}

export function parseEntry(entry: EprovalCalendarEntry): CalendarData | null {
  return parseEntryWithDiagnostics(entry).data;
}

export function buildRecord(input: BuildRecordInput): ExternalEventInsert {
  const { entry, data, permitStatus, lat, lng, config, relevanceScore } = input;
  return {
    source: config.source,
    source_type: config.sourceType as ExternalEventInsert['source'],
    external_id: entry.RowKey?._,
    source_partition: entry.PartitionKey?._,
    title: data.calendarTitle,
    description: data.calendarDescription ?? null,
    category: data.calendarCategory ?? null,
    organization: data.calendarOrganization ?? null,
    website: data.calendarWebsite ?? null,
    source_url: data.calendarWebsite ?? null,
    location_address: data.calendarLocation ?? null,
    location_lat: lat,
    location_lng: lng,
    event_start_date: formatDateForDb(parseEprovalDate(data.calendarStartDate)),
    event_start_time: parseEprovalTime(data.calendarStartTime),
    event_end_date: formatDateForDb(parseEprovalDate(data.calendarEndDate)),
    event_end_time: parseEprovalTime(data.calendarEndTime),
    permit_start_date: formatDateForDb(parseEprovalDate(data.calendarPermitStartDate)),
    permit_end_date: formatDateForDb(parseEprovalDate(data.calendarPermitEndDate)),
    permit_start_time: parseEprovalTime(data.calendarPermitStartTime),
    permit_end_time: parseEprovalTime(data.calendarPermitEndTime),
    permit_status: permitStatus,
    relevance_score: relevanceScore,
    relevance_classified_at: null,
    verification_tier: isPermitSource(config) ? 3 : 2,
    verification_badge: isPermitSource(config) ? 'government_verified' : 'source_verified',
    city: config.city,
    state: config.state,
    source_updated_at: isIsoDate(entry.Timestamp?._) ? entry.Timestamp._ : new Date().toISOString(),
    raw_data: JSON.parse(JSON.stringify(entry)) as ExternalEventInsert['raw_data'], // eslint-disable-line unicorn/prefer-structured-clone
  };
}
