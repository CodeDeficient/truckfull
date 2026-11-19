import {
  buildEventbriteMetadata,
  EventbriteRateLimitExhausted,
  type EventbriteEventResult,
} from './eventbriteApi';

const HTML_ENTITY = /&(#x?[\da-f]+|[a-z]+);/giu;
const BLOCK_BREAK_TAGS = /<(?:br|\/p|\/div|\/li|\/h\d)[^>]*>/giu;
const HTML_TAGS = /<[^>]+>/gu;
const SPACE_RUNS = /[ \t]+/gu;
const PADDED_NEWLINE = /\s*\n\s*/gu;

export const EVENTBRITE_ID_BATCH_SIZE = 20;
export const MAX_FULL_DESCRIPTION_LENGTH = 8000;

export interface BackfillRow {
  readonly id: string;
  readonly externalId: string;
  readonly rawData: unknown;
}

export interface BackfillStore {
  readonly updateRawData: (id: string, rawData: Record<string, unknown>) => Promise<void>;
}

export interface BackfillSource {
  readonly fetchByIds: (ids: readonly string[]) => Promise<EventbriteEventResult[]>;
  readonly fetchDescription: (id: string) => Promise<string | null>;
  readonly remaining: () => number;
}

export interface MetadataBackfillResult {
  readonly updatedRows: number;
  readonly missingIds: readonly string[];
}

export interface DescriptionBackfillResult {
  readonly updatedRows: number;
  readonly fetched: number;
  readonly failedIds: readonly string[];
  readonly stoppedForBudget: boolean;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function decodeEntities(text: string): string {
  return text.replaceAll(HTML_ENTITY, (match, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }
    if (code.startsWith('#')) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

export function htmlToText(html: string): string {
  const withBreaks = html.replaceAll(BLOCK_BREAK_TAGS, '\n');
  const text = decodeEntities(withBreaks.replaceAll(HTML_TAGS, ' '));
  return text
    .replaceAll(SPACE_RUNS, ' ')
    .replaceAll(PADDED_NEWLINE, '\n')
    .trim()
    .slice(0, MAX_FULL_DESCRIPTION_LENGTH);
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function needsMetadata(rawData: unknown): boolean {
  return !('category' in asRecord(asRecord(rawData).eventbrite));
}

export function needsFullDescription(rawData: unknown): boolean {
  return typeof asRecord(asRecord(rawData).eventbrite).fullDescription !== 'string';
}

export function mergeEventbriteData(
  rawData: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const raw = asRecord(rawData);
  return { ...raw, eventbrite: { ...asRecord(raw.eventbrite), ...patch } };
}

function groupByExternalId(
  rows: readonly BackfillRow[],
  needs: (rawData: unknown) => boolean,
): Map<string, BackfillRow[]> {
  const groups = new Map<string, BackfillRow[]>();
  for (const row of rows) {
    if (!needs(row.rawData)) continue;
    const group = groups.get(row.externalId) ?? [];
    group.push(row);
    groups.set(row.externalId, group);
  }
  return groups;
}

async function applyPatch(
  rows: readonly BackfillRow[],
  patch: Record<string, unknown>,
  store: BackfillStore,
): Promise<number> {
  for (const row of rows) {
    await store.updateRawData(row.id, mergeEventbriteData(row.rawData, patch));
  }
  return rows.length;
}

export async function backfillMetadata(
  rows: readonly BackfillRow[],
  source: BackfillSource,
  store: BackfillStore,
): Promise<MetadataBackfillResult> {
  const groups = groupByExternalId(rows, needsMetadata);
  const missingIds: string[] = [];
  let updatedRows = 0;
  for (const ids of chunk([...groups.keys()], EVENTBRITE_ID_BATCH_SIZE)) {
    const events = await source.fetchByIds(ids);
    const byId = new Map(events.map((event) => [event.id, event]));
    for (const id of ids) {
      const event = byId.get(id);
      if (!event) {
        missingIds.push(id);
        continue;
      }
      const metadata = { ...buildEventbriteMetadata(event) };
      updatedRows += await applyPatch(groups.get(id) ?? [], metadata, store);
    }
  }
  return { updatedRows, missingIds };
}

export async function backfillDescriptions(
  rows: readonly BackfillRow[],
  source: BackfillSource,
  store: BackfillStore,
  minRemaining: number,
): Promise<DescriptionBackfillResult> {
  const groups = groupByExternalId(rows, needsFullDescription);
  const failedIds: string[] = [];
  let updatedRows = 0;
  let fetched = 0;
  for (const [id, group] of groups) {
    if (source.remaining() <= minRemaining) {
      return { updatedRows, fetched, failedIds, stoppedForBudget: true };
    }
    try {
      const html = await source.fetchDescription(id);
      fetched++;
      const fullDescription = html ? htmlToText(html) : '';
      updatedRows += await applyPatch(group, { fullDescription }, store);
    } catch (error) {
      if (error instanceof EventbriteRateLimitExhausted) {
        return { updatedRows, fetched, failedIds, stoppedForBudget: true };
      }
      failedIds.push(id);
    }
  }
  return { updatedRows, fetched, failedIds, stoppedForBudget: false };
}
