import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { fetchPageContent } from '@/lib/research/fetchPageContent';
import { logError, logMessage, logWarning } from '@/lib/logging';
import type { OpenCodeGoRequest, OpenCodeGoResult } from '@/lib/utils/callOpenCodeGo';
import { callOllamaCloud } from '@/lib/utils/callOllamaCloud';
import {
  FACTS_MODEL,
  FACTS_SYSTEM_PROMPT,
  buildListingText,
  decideRelevance,
  parseEventFacts,
  type EventFacts,
  type EventListing,
  type RelevanceOutcome,
} from '@/lib/events/relevanceFacts';
import {
  buildRelevanceFlipTargets,
  type EventCacheInvalidator,
} from '@/lib/events/eventCacheTargets';

export const FACTS_MODEL_ID = `facts:${FACTS_MODEL}`;
export const HUMAN_REVIEW_MODEL = 'human_review';

const BATCH_LIMIT = 500;
const CONCURRENCY = 6;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const PAGE_TEXT_LIMIT = 3000;
const PROGRESS_EVERY = 50;

const SELECTION_FILTER = [
  'relevance_model.is.null',
  `relevance_model.not.in.(${HUMAN_REVIEW_MODEL},"${FACTS_MODEL_ID}")`,
  `and(relevance_model.eq."${FACTS_MODEL_ID}",relevance_classified_at.is.null)`,
].join(',');

const EVENT_COLUMNS =
  'id, title, description, source_url, city, state, event_start_date, vetting_score, location_address, organization, is_food_truck_relevant, eventbrite:raw_data->eventbrite';

export interface RelevanceCronResult {
  readonly success: boolean;
  readonly total: number;
  readonly confirmed: number;
  readonly likely: number;
  readonly rejected: number;
  readonly modelFailures: number;
  readonly errors: number;
  readonly duration_ms: number;
}

export interface EventForClassification {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly source_url: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly event_start_date: string | null;
  readonly vetting_score: number | null;
  readonly location_address: string | null;
  readonly organization: string | null;
  readonly is_food_truck_relevant: boolean | null;
  readonly eventbrite: unknown;
}

export interface RelevanceDecision {
  readonly outcome: RelevanceOutcome;
  readonly facts: EventFacts;
}

export interface FactsClassifierDeps {
  readonly fetchBatch: () => Promise<readonly EventForClassification[]>;
  readonly callModel: (request: OpenCodeGoRequest) => Promise<OpenCodeGoResult>;
  readonly fetchPage: (url: string) => Promise<string | null>;
  readonly saveDecision: (
    event: EventForClassification,
    decision: RelevanceDecision,
  ) => Promise<boolean>;
  readonly delay: (ms: number) => Promise<void>;
  readonly invalidate?: EventCacheInvalidator;
}

interface Tally {
  confirmed: number;
  likely: number;
  rejected: number;
  modelFailures: number;
  errors: number;
  done: number;
}

const OUTCOME_COUNTER: Record<RelevanceOutcome, 'confirmed' | 'likely' | 'rejected'> = {
  confirmed: 'confirmed',
  likely: 'likely',
  no: 'rejected',
};

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readEventbrite(value: unknown): {
  category: string | null;
  organizerName: string | null;
  fullDescription: string | null;
  organizerTags: string[];
} {
  const record =
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const tags = Array.isArray(record.organizerTags) ? record.organizerTags : [];
  return {
    category: readString(record, 'category'),
    organizerName: readString(record, 'organizerName'),
    fullDescription: readString(record, 'fullDescription'),
    organizerTags: tags.filter((tag): tag is string => typeof tag === 'string'),
  };
}

export function toListing(event: EventForClassification, pageText: string | null): EventListing {
  const eventbrite = readEventbrite(event.eventbrite);
  return {
    title: event.title,
    startDate: event.event_start_date,
    venue: event.location_address,
    organizer: event.organization ?? eventbrite.organizerName,
    category: eventbrite.category,
    organizerTags: eventbrite.organizerTags,
    summary: event.description,
    fullDescription: eventbrite.fullDescription ?? pageText,
  };
}

async function loadPageText(
  event: EventForClassification,
  deps: FactsClassifierDeps,
): Promise<string | null> {
  if (event.description || readEventbrite(event.eventbrite).fullDescription) return null;
  if (!event.source_url) return null;
  try {
    const text = await deps.fetchPage(event.source_url);
    return text ? text.slice(0, PAGE_TEXT_LIMIT) : null;
  } catch {
    return null;
  }
}

export async function decideEvent(
  event: EventForClassification,
  deps: FactsClassifierDeps,
): Promise<RelevanceDecision | null> {
  const listing = toListing(event, await loadPageText(event, deps));
  const request = {
    model: FACTS_MODEL,
    system: FACTS_SYSTEM_PROMPT,
    user: buildListingText(listing),
  };
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await deps.callModel(request);
    const facts = result.success ? parseEventFacts(result.text) : null;
    if (facts) return { outcome: decideRelevance(facts, listing), facts };
    logWarning(`Relevance facts attempt ${attempt} failed for "${event.title}"`, {
      error: result.success ? 'unparsable reply' : result.error,
    });
    if (attempt < MAX_ATTEMPTS) await deps.delay(RETRY_DELAY_MS * attempt);
  }
  return null;
}

async function invalidateFlip(
  event: EventForClassification,
  invalidate: EventCacheInvalidator,
): Promise<void> {
  const targets = buildRelevanceFlipTargets(event, true);
  if (targets.length === 0) return;
  try {
    await invalidate(targets);
  } catch (error) {
    logError(`Failed to invalidate event cache for relevance change ${event.id}`, error);
  }
}

async function processEvent(
  event: EventForClassification,
  deps: FactsClassifierDeps,
  tally: Tally,
): Promise<void> {
  const decision = await decideEvent(event, deps);
  if (!decision) {
    tally.modelFailures++;
    return;
  }
  if (!(await deps.saveDecision(event, decision))) {
    tally.errors++;
    return;
  }
  tally[OUTCOME_COUNTER[decision.outcome]]++;
  const shown = decision.outcome !== 'no';
  if (deps.invalidate && shown !== (event.is_food_truck_relevant === true)) {
    await invalidateFlip(event, deps.invalidate);
  }
}

export async function runFactsClassification(
  deps: FactsClassifierDeps,
): Promise<RelevanceCronResult> {
  const startTime = Date.now();
  const events = await deps.fetchBatch();
  const tally: Tally = {
    confirmed: 0,
    likely: 0,
    rejected: 0,
    modelFailures: 0,
    errors: 0,
    done: 0,
  };
  let next = 0;
  const worker = async (): Promise<void> => {
    for (let event = events[next++]; event; event = events[next++]) {
      await processEvent(event, deps, tally);
      tally.done++;
      if (tally.done % PROGRESS_EVERY === 0) {
        logMessage(`Relevance classification progress ${tally.done}/${events.length}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, events.length) }, worker));
  const result = {
    success: tally.errors === 0,
    total: events.length,
    confirmed: tally.confirmed,
    likely: tally.likely,
    rejected: tally.rejected,
    modelFailures: tally.modelFailures,
    errors: tally.errors,
    duration_ms: Date.now() - startTime,
  };
  logMessage('Relevance classification completed', result);
  return result;
}

async function fetchEventsNeedingClassification(
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<EventForClassification[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('external_events')
    .select(EVENT_COLUMNS)
    .gte('event_start_date', today)
    .eq('is_canonical', true)
    .not('is_hidden', 'is', true)
    .is('relevance_reviewed_at', null)
    .not('title', 'is', null)
    .or(SELECTION_FILTER)
    .order('event_start_date')
    .limit(BATCH_LIMIT);

  if (error) {
    throw new Error(`Failed to fetch events for classification: ${error.message}`);
  }
  return (data ?? []) as unknown as EventForClassification[];
}

async function saveDecision(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  event: EventForClassification,
  decision: RelevanceDecision,
): Promise<boolean> {
  const { error } = await supabase
    .from('external_events')
    .update({
      is_food_truck_relevant: decision.outcome !== 'no',
      relevance_review_needed: decision.outcome === 'likely',
      relevance_model: FACTS_MODEL_ID,
      relevance_confidence: null,
      relevance_reasoning: JSON.stringify({ outcome: decision.outcome, ...decision.facts }),
      relevance_classified_at: new Date().toISOString(),
    })
    .eq('id', event.id)
    .is('relevance_reviewed_at', null)
    .or(`relevance_model.is.null,relevance_model.neq.${HUMAN_REVIEW_MODEL}`);

  if (error) {
    logError(`Failed to save relevance decision for ${event.id}:`, error);
    return false;
  }
  return true;
}

function emptyResult(errors: number): RelevanceCronResult {
  return {
    success: errors === 0,
    total: 0,
    confirmed: 0,
    likely: 0,
    rejected: 0,
    modelFailures: 0,
    errors,
    duration_ms: 0,
  };
}

export async function classifyRelevanceCron(
  invalidate?: EventCacheInvalidator,
): Promise<RelevanceCronResult> {
  if (!process.env.OLLAMA_CLOUD_API_KEY) {
    logError('OLLAMA_CLOUD_API_KEY is not configured; relevance classification skipped');
    return emptyResult(1);
  }
  const supabase = getSupabaseAdmin();
  return runFactsClassification({
    fetchBatch: () => fetchEventsNeedingClassification(supabase),
    callModel: (request) => callOllamaCloud(request),
    fetchPage: fetchPageContent,
    saveDecision: (event, decision) => saveDecision(supabase, event, decision),
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    invalidate,
  });
}
