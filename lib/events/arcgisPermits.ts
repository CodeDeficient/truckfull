import { hashCalendarData, type CalendarData, type EprovalCalendarEntry } from '@/lib/events/types';

const HTTP_URL_WITH_HOST = /^https?:\/\/[^\s/]+\.[^\s/]+/i;

export interface ArcgisPermitConfig {
  readonly layerUrl: string;
  readonly where: string;
  readonly idField: string;
  readonly titleField: string;
  readonly startField: string;
  readonly endField: string;
  readonly categoryField?: string;
  readonly descriptionField?: string;
  readonly organizationField?: string;
  readonly websiteField?: string;
  readonly locationField?: string;
  readonly defaultLocation: string;
}

type ArcgisAttributes = Readonly<Record<string, string | number | null | undefined>>;

interface ArcgisGeometry {
  readonly x?: number;
  readonly y?: number;
  readonly paths?: ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
}

interface ArcgisFeature {
  readonly attributes: ArcgisAttributes;
  readonly geometry?: ArcgisGeometry | null;
}

interface ArcgisQueryResponse {
  readonly features?: readonly ArcgisFeature[];
  readonly exceededTransferLimit?: boolean;
  readonly error?: { readonly code: number; readonly message: string };
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 10;
const REQUEST_TIMEOUT_MS = 30_000;
const EVENT_TIME_ZONE = 'America/New_York';

const localParts = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function formatLocal(epochMs: number): { readonly date: string; readonly time: string } {
  const parts = Object.fromEntries(
    localParts.formatToParts(new Date(epochMs)).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.month}-${parts.day}-${parts.year}`,
    time: `${parts.hour}:${parts.minute} ${String(parts.dayPeriod).toLowerCase()}`,
  };
}

function text(attrs: ArcgisAttributes, field: string | undefined): string | undefined {
  if (!field) return undefined;
  const value = attrs[field];
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

function website(attrs: ArcgisAttributes, field: string | undefined): string | undefined {
  const raw = text(attrs, field);
  return raw && HTTP_URL_WITH_HOST.test(raw) ? raw : undefined;
}

function point(geometry: ArcgisGeometry | null | undefined): { lat?: number; lng?: number } {
  if (geometry?.x != null && geometry.y != null) return { lat: geometry.y, lng: geometry.x };
  const first = geometry?.paths?.[0]?.[0];
  return first ? { lat: first[1], lng: first[0] } : {};
}

function toCalendarData(feature: ArcgisFeature, config: ArcgisPermitConfig): CalendarData | null {
  const attrs = feature.attributes;
  const title = text(attrs, config.titleField);
  const start = attrs[config.startField];
  if (!title || typeof start !== 'number') return null;
  const end = attrs[config.endField];
  const startLocal = formatLocal(start);
  const endLocal = typeof end === 'number' ? formatLocal(end) : startLocal;
  const { lat, lng } = point(feature.geometry);
  return {
    calendarTitle: title,
    calendarStartDate: startLocal.date,
    calendarStartTime: startLocal.time,
    calendarEndDate: endLocal.date,
    calendarEndTime: endLocal.time,
    calendarPermitStartDate: startLocal.date,
    calendarPermitEndDate: endLocal.date,
    calendarDescription: text(attrs, config.descriptionField),
    calendarCategory: text(attrs, config.categoryField),
    calendarOrganization: text(attrs, config.organizationField),
    calendarWebsite: website(attrs, config.websiteField),
    calendarLocation: text(attrs, config.locationField) ?? config.defaultLocation,
    calendarLat: lat,
    calendarLng: lng,
  };
}

export function featureToEntry(
  feature: ArcgisFeature,
  config: ArcgisPermitConfig,
): EprovalCalendarEntry | null {
  const id = text(feature.attributes, config.idField);
  const data = id ? toCalendarData(feature, config) : null;
  if (!id || !data) return null;
  return {
    PartitionKey: { $: 'Edm.String', _: `Public_Approved_${id}` },
    RowKey: { $: 'Edm.String', _: id },
    Timestamp: { $: 'Edm.DateTime', _: new Date().toISOString() },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(data) },
    Group: { $: 'Edm.String', _: `ARC_${id}` },
    contentHash: hashCalendarData(data),
  };
}

function outFields(config: ArcgisPermitConfig): string {
  return [
    config.idField,
    config.titleField,
    config.startField,
    config.endField,
    config.categoryField,
    config.descriptionField,
    config.organizationField,
    config.websiteField,
    config.locationField,
  ]
    .filter((f) => f !== undefined)
    .join(',');
}

export function buildQueryUrl(config: ArcgisPermitConfig, offset: number): string {
  const params = new URLSearchParams({
    where: config.where,
    outFields: outFields(config),
    orderByFields: config.startField,
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
    outSR: '4326',
    f: 'json',
  });
  return `${config.layerUrl}/query?${params.toString()}`;
}

async function fetchPage(config: ArcgisPermitConfig, offset: number): Promise<ArcgisQueryResponse> {
  const response = await fetch(buildQueryUrl(config, offset), {
    headers: { 'User-Agent': 'TruckFull/1.0' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`ArcGIS query failed: ${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as ArcgisQueryResponse;
  if (body.error) {
    throw new Error(`ArcGIS query error ${body.error.code}: ${body.error.message}`);
  }
  return body;
}

export async function fetchArcgisPermits(
  config: ArcgisPermitConfig,
): Promise<EprovalCalendarEntry[]> {
  const entries: EprovalCalendarEntry[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const body = await fetchPage(config, offset);
    const features = body.features ?? [];
    offset += features.length;
    for (const feature of features) {
      const entry = featureToEntry(feature, config);
      if (entry) entries.push(entry);
    }
    if (!body.exceededTransferLimit || features.length === 0) break;
  }
  return entries;
}
