import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ArcgisPermitConfig } from '@/lib/events/arcgisPermits';

export interface EprovalOdataField {
  $: string;
  _: string;
}

export interface EventbriteMetadata {
  readonly category: string | null;
  readonly subcategory: string | null;
  readonly format: string | null;
  readonly organizerTags: readonly string[];
  readonly organizerName: string | null;
  readonly venueCity: string | null;
  readonly venueRegion: string | null;
  readonly fullDescription?: string;
}

export interface EprovalCalendarEntry {
  PartitionKey: EprovalOdataField;
  RowKey: EprovalOdataField;
  Timestamp: EprovalOdataField;
  CalendarData: EprovalOdataField;
  Group: EprovalOdataField;
  contentHash?: string;
  eventbrite?: EventbriteMetadata;
}

export const calendarDataSchema = z.object({
  calendarTitle: z.string(),
  calendarStartDate: z.string(),
  calendarDescription: z.string().optional(),
  calendarCategory: z.string().optional(),
  calendarOrganization: z.string().optional(),
  calendarWebsite: z.string().optional(),
  calendarLocation: z.string().optional(),
  calendarStartTime: z.string().optional(),
  calendarEndDate: z.string().optional(),
  calendarEndTime: z.string().optional(),
  calendarPermitStartDate: z.string().optional(),
  calendarPermitEndDate: z.string().optional(),
  calendarPermitStartTime: z.string().optional(),
  calendarPermitEndTime: z.string().optional(),
  calendarLat: z.number().optional(),
  calendarLng: z.number().optional(),
});

export type CalendarData = z.infer<typeof calendarDataSchema>;

export interface EprovalCalendarSettings {
  type: string;
  client: string;
  account: string;
  lightWeekView: boolean;
  hideWeekView: boolean;
  hideDayView: boolean;
  hideAgendaView: boolean;
  agendaTabName: string;
  appsubtypes: string[];
  manualentryguid: string;
  showDateSourceSwitch: boolean;
  usePermitDateSourceByDefault: boolean;
  showstatus: boolean;
  statuses: Record<string, string>;
  showcategoryfilter: boolean;
  categories: Array<{ name: string; bgcolor: string; fontcolor: string }>;
  hideMap: boolean;
  googleMapsApiKey: string;
  applicationURL: string;
  calendarLocationCity: string;
  disabledFields: unknown[];
  formats: { storage: { date: string } };
}

export interface EprovalRpcRequest {
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface EprovalRpcResponse<T = unknown> {
  result: T;
  jsonrpc: '2.0';
  id: string;
  error?: { code: number; message: string };
}

export type PermitStatus =
  | 'Submitted'
  | 'More Info Needed'
  | 'Under Review'
  | 'Approved'
  | 'Closeout'
  | 'unknown';

export interface RelevanceScore {
  score: number;
  matchedKeywords: string[];
  isFoodTruckRelevant: boolean;
}

export interface IngestionResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  invalidRecords: number;
  enrichmentFailures: number;
  geocodePending: number;
  duration_ms: number;
  error?: string;
}

export interface TourismScraperConfig {
  url: string;
  eventContainerSelector: string;
  titleSelector: string;
  dateSelector: string;
  daySelector?: string;
  locationSelector?: string;
  defaultLocation?: string;
  descriptionSelector?: string;
  linkSelector?: string;
  dateParsePattern: string;
}

export type CitySourceType =
  | 'eproval'
  | 'civicplus_rss'
  | 'simpleview_rss'
  | 'ical'
  | 'aiken_playwright'
  | 'eventbrite'
  | 'tourism_html'
  | 'algolia_api'
  | 'timely_api'
  | 'arcgis_permits';

export interface EprovalCityConfig {
  city: string;
  state: string;
  source: string;
  sourceType: CitySourceType;
  calendarKey?: string;
  clientUri?: string;
  partitionGuids?: string[];
  rssUrl?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  tourismSelectors?: TourismScraperConfig;
  algoliaConfig?: {
    appId: string;
    apiKey: string;
    indexName: string;
    filters: string;
  };
  timelyConfig?: {
    calendarId: string;
    apiKey: string;
  };
  arcgisConfig?: ArcgisPermitConfig;
}

export function hashCalendarData(data: CalendarData): string {
  const fields = [
    data.calendarTitle,
    data.calendarStartDate,
    data.calendarEndDate ?? '',
    data.calendarStartTime ?? '',
    data.calendarEndTime ?? '',
    data.calendarPermitStartDate ?? '',
    data.calendarPermitEndDate ?? '',
    data.calendarPermitStartTime ?? '',
    data.calendarPermitEndTime ?? '',
    data.calendarDescription ?? '',
    data.calendarWebsite ?? '',
    data.calendarLocation ?? '',
    data.calendarCategory ?? '',
    data.calendarOrganization ?? '',
  ];
  return createHash('sha256')
    .update(fields.map((f, i) => `${i}:${f}`).join('\0'))
    .digest('hex');
}
