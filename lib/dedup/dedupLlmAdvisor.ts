import { z } from 'zod';
import { callLLM, type LLMMessage, DEFAULT_LLM_CONFIG } from '@/lib/utils/callLLM';
import type { ConnectedComponent, DedupEventInput } from './dedupTypes';

const LEADING_JSON_FENCE = /^```(?:json)?\n?/gi;
const TRAILING_CODE_FENCE = /```$/g;

export type AdvisoryRecommendation = 'merge' | 'separate' | 'unsure';

export const ADVISORY_KEY_FACTORS = {
  TITLE_SIMILARITY: 'title_similarity',
  TIME_SIMILARITY: 'time_similarity',
  LOCATION_SIMILARITY: 'location_similarity',
  ORGANIZER_SIMILARITY: 'organizer_similarity',
  ADDRESS_SIMILARITY: 'address_similarity',
  CROSS_STATE_LISTING: 'cross_state_listing',
  MISSING_DATA: 'missing_data',
  CONFLICTING_LOCATION: 'conflicting_location',
  CONFLICTING_TIME: 'conflicting_time',
  INSUFFICIENT_INFORMATION: 'insufficient_information',
} as const;

export type AdvisoryKeyFactorValue = typeof ADVISORY_KEY_FACTORS[keyof typeof ADVISORY_KEY_FACTORS];

export const PROMPT_VERSION = '4.6.0' as const;
export const SCHEMA_VERSION = '1.0.0' as const;

export const ADVISORY_MODEL = 'gemma4:31b';

export interface MergeAdviceSuccess {
  readonly status: 'success';
  readonly recommendation: AdvisoryRecommendation;
  readonly reasoning: string;
  readonly keyFactors: readonly AdvisoryKeyFactorValue[];
  readonly model: string;
  readonly provider: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
}

export interface MergeAdviceError {
  readonly status: 'error';
  readonly error: string;
  readonly model: string;
  readonly provider: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
}

export type MergeAdvice = MergeAdviceSuccess | MergeAdviceError;

const AdvisoryResponseSchema = z.object({
  recommendation: z.enum(['merge', 'separate', 'unsure']),
  reasoning: z.string().min(1),
  keyFactors: z.array(
    z.enum(Object.values(ADVISORY_KEY_FACTORS) as [AdvisoryKeyFactorValue, ...AdvisoryKeyFactorValue[]]),
  ),
});

interface SerializedEvent {
  readonly id: string;
  readonly title: string | null;
  readonly date: string | null;
  readonly time: string | null;
  readonly organizer: string | null;
  readonly address: string | null;
  readonly coordinates: { readonly lat: number | null; readonly lng: number | null } | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly source: string;
}

function serializeEvent(event: DedupEventInput): SerializedEvent {
  const hasCoords = event.location_lat !== null && event.location_lng !== null;
  return {
    id: event.id,
    title: event.title,
    date: event.event_start_date,
    time: event.event_start_time,
    organizer: event.organization,
    address: event.location_address,
    coordinates: hasCoords ? { lat: event.location_lat, lng: event.location_lng } : null,
    city: event.city,
    state: event.state,
    source: event.source,
  };
}

function sortEvents(events: readonly DedupEventInput[]): DedupEventInput[] {
  return [...events].sort((a, b) => {
    const dateCmp = (a.event_start_date ?? '').localeCompare(b.event_start_date ?? '');
    if (dateCmp !== 0) return dateCmp;

    const timeCmp = (a.event_start_time ?? '').localeCompare(b.event_start_time ?? '');
    if (timeCmp !== 0) return timeCmp;

    const titleCmp = (a.title ?? '').localeCompare(b.title ?? '');
    if (titleCmp !== 0) return titleCmp;

    const sourceCmp = a.source.localeCompare(b.source);
    if (sourceCmp !== 0) return sourceCmp;

    return a.id.localeCompare(b.id);
  });
}

export function buildMergeAdvicePrompt(component: ConnectedComponent): LLMMessage[] {
  const sorted = sortEvents(component.events);
  const serialized = sorted.map((e) => serializeEvent(e));

  const payload = {
    promptVersion: PROMPT_VERSION,
    instruction: 'Compare these event listings and determine if they represent the same physical event.',
    events: serialized,
  };

  const payloadJson = JSON.stringify(payload, null, 0);

  return [
    {
      role: 'system',
      content: `You are an event deduplication advisor. You receive multiple event listings that may or may not represent the same physical event. Determine whether they are duplicates.

Never infer or invent missing facts. Base your decision only on the supplied event data. If the supplied information is insufficient to distinguish the events, return "unsure".

keyFactors must only use these values: ${Object.values(ADVISORY_KEY_FACTORS).join(', ')}.

Respond in JSON only: {"recommendation":"merge|separate|unsure","reasoning":"brief, 2-3 sentences maximum","keyFactors":["factor1","factor2"]}`,
    },
    {
      role: 'user',
      content: payloadJson,
    },
  ];
}

function cleanJsonResponse(data: string): string {
  return data
    .trim()
    .replaceAll(LEADING_JSON_FENCE, '')
    .replaceAll(TRAILING_CODE_FENCE, '')
    .trim();
}

export function errorAdvice(
  error: string,
  model: string,
  provider: string,
): MergeAdviceError {
  return {
    status: 'error',
    error,
    model,
    provider,
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function parseMergeAdvice(
  rawData: string,
  model: string,
  provider: string,
): MergeAdvice {
  const cleaned = cleanJsonResponse(rawData);
  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch (parseError) {
    return errorAdvice(
      `Failed to parse LLM response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      model,
      provider,
    );
  }

  const validated = AdvisoryResponseSchema.safeParse(parsed);

  if (!validated.success) {
    return errorAdvice(
      `LLM response validation failed: ${validated.error.message}`,
      model,
      provider,
    );
  }

  return {
    status: 'success',
    recommendation: validated.data.recommendation,
    reasoning: validated.data.reasoning,
    keyFactors: validated.data.keyFactors,
    model,
    provider,
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
  };
}

export async function getMergeAdvice(component: ConnectedComponent): Promise<MergeAdvice> {
  const messages = buildMergeAdvicePrompt(component);

  const result = await callLLM(messages, {
    ...DEFAULT_LLM_CONFIG,
    model: ADVISORY_MODEL,
  });

  if (!result.success || !result.data) {
    return errorAdvice(
      result.error ?? 'LLM returned no data',
      result.model ?? ADVISORY_MODEL,
      result.provider ?? '',
    );
  }

  return parseMergeAdvice(result.data, result.model ?? ADVISORY_MODEL, result.provider ?? '');
}
