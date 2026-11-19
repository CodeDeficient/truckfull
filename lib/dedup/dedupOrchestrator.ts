import type { DedupEventInput, MergeAction, PairEvaluation } from './dedupTypes';
import type { MergeAdvice } from './dedupLlmAdvisor';
import { buildDedupGraph, findConnectedComponents } from './dedupGraph';
import { evaluatePair, coordinateDistanceMeters } from './dedupHelpers';
import { decideMerge } from './dedupMerge';
import { getMergeAdvice, errorAdvice, ADVISORY_MODEL } from './dedupLlmAdvisor';
import { SQL_CANDIDATE_RADIUS_KM } from './dedupConstants';
import { buildQueueInsert } from './dedupReviewQueue';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logWarning } from '@/lib/logging';
import type { Json } from '@/lib/database.remote.types';
import {
  buildDemotionTargets,
  type EventCacheInvalidator,
  type EventIdentityRow,
} from '@/lib/events/eventCacheTargets';

type DedupSupabaseClient = Pick<ReturnType<typeof getSupabaseAdmin>, 'from' | 'rpc'>;

export interface DedupConfig {
  readonly dryRun?: boolean;
  readonly enableLLM?: boolean;
}

export interface DedupDecision {
  readonly componentKey: string;
  readonly action: MergeAction;
  readonly deterministicDecision: MergeAction;
  readonly advisory: MergeAdvice | null;
  readonly canonicalEventId: string | null;
  readonly nonCanonicalEventIds: readonly string[];
  readonly componentSize: number;
  readonly reason: string;
}

export interface DedupRunMetrics {
  readonly totalClusters: number;
  readonly averageClusterSize: number;
  readonly largestClusterSize: number;
  readonly largestClusterKey: string;
  readonly autoMerges: number;
  readonly llmCallsAttempted: number;
  readonly llmCallsSkippedDryRun: number;
  readonly humanReviewCount: number;
  readonly keptSeparateCount: number;
  readonly crossStateClusters: number;
  readonly crossSourceClusters: number;
  readonly nullCoordinateClusters: number;
  readonly rowsAlreadyNonCanonical: number;
  readonly rowsSkippedMutationBecauseAlreadyNonCanonical: number;
  readonly rowsNewlyMarkedNonCanonical: number;
  readonly mutationErrors: number;
  readonly queueInsertErrors: number;
  readonly durationMs: number;
  readonly dryRun: boolean;
}

interface RpcRow {
  id: string;
  title: string | null;
  event_start_date: string | null;
  event_start_time: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  city: string | null;
  state: string | null;
  source: string;
  source_type: string;
  organization: string | null;
  vetting_score: number | null;
  is_canonical: boolean;
  ingested_at: string | null;
}

interface RpcCluster {
  key: string;
  rows: RpcRow[];
}

export function normalizeClusterRows(rows: readonly RpcRow[]): DedupEventInput[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    event_start_date: r.event_start_date,
    event_start_time: r.event_start_time,
    location_lat: r.location_lat,
    location_lng: r.location_lng,
    location_address: r.location_address,
    city: r.city,
    state: r.state,
    source: r.source,
    source_type: r.source_type,
    organization: r.organization,
    vetting_score: r.vetting_score,
    ingested_at: r.ingested_at,
  }));
}

export function buildComponentKey(eventIds: readonly string[]): string {
  return [...eventIds].sort().join('|');
}

export function validateMergeMutation(decision: DedupDecision): void {
  if (decision.canonicalEventId === null) {
    throw new Error(
      `componentKey=${decision.componentKey}: canonicalEventId is null — cannot apply merge`,
    );
  }
  if (decision.nonCanonicalEventIds.length === 0) {
    throw new Error(
      `componentKey=${decision.componentKey}: nonCanonicalEventIds is empty — nothing to merge`,
    );
  }
  if (decision.nonCanonicalEventIds.includes(decision.canonicalEventId)) {
    throw new Error(
      `componentKey=${decision.componentKey}: canonicalEventId ${decision.canonicalEventId} is in nonCanonicalEventIds — canonical would be self-demoted`,
    );
  }
}

export function createSpatialFilteredEval(
  maxRadiusMeters: number,
): (a: DedupEventInput, b: DedupEventInput) => PairEvaluation {
  return (a, b) => {
    const aHasCoords = a.location_lat !== null && a.location_lng !== null;
    const bHasCoords = b.location_lat !== null && b.location_lng !== null;
    if (aHasCoords && bHasCoords) {
      const dist = coordinateDistanceMeters(
        a.location_lat,
        a.location_lng,
        b.location_lat,
        b.location_lng,
      );
      if (dist !== null && dist > maxRadiusMeters) {
        return { strength: 'none', reasons: [], score: 0 };
      }
    }
    return evaluatePair(a, b);
  };
}

interface ComputeMetricsParams {
  readonly totalClusters: number;
  readonly decisions: readonly DedupDecision[];
  readonly crossStateClusters: number;
  readonly crossSourceClusters: number;
  readonly nullCoordinateClusters: number;
  readonly rowsAlreadyNonCanonical: number;
  readonly rowsSkippedMutationBecauseAlreadyNonCanonical: number;
  readonly rowsNewlyMarkedNonCanonical: number;
  readonly mutationErrors: number;
  readonly queueInsertErrors: number;
  readonly durationMs: number;
  readonly dryRun: boolean;
  readonly llmCallsAttempted: number;
  readonly llmCallsSkippedDryRun: number;
}

export function computeRunMetrics(params: ComputeMetricsParams): DedupRunMetrics {
  const componentSizes = params.decisions.map((d) => d.componentSize);
  const totalEvents = componentSizes.reduce((sum, s) => sum + s, 0);
  const largest = componentSizes.length > 0 ? Math.max(...componentSizes) : 0;
  const largestIdx = componentSizes.indexOf(largest);
  const largestKey = largestIdx === -1 ? '' : params.decisions[largestIdx].componentKey;

  return {
    totalClusters: params.totalClusters,
    averageClusterSize:
      params.decisions.length > 0
        ? Math.round((totalEvents / params.decisions.length) * 100) / 100
        : 0,
    largestClusterSize: largest,
    largestClusterKey: largestKey,
    autoMerges: params.decisions.filter((d) => d.action === 'auto_merged').length,
    llmCallsAttempted: params.llmCallsAttempted,
    llmCallsSkippedDryRun: params.llmCallsSkippedDryRun,
    humanReviewCount: params.decisions.filter((d) => d.action === 'human_review').length,
    keptSeparateCount: params.decisions.filter((d) => d.action === 'kept_separate').length,
    crossStateClusters: params.crossStateClusters,
    crossSourceClusters: params.crossSourceClusters,
    nullCoordinateClusters: params.nullCoordinateClusters,
    rowsAlreadyNonCanonical: params.rowsAlreadyNonCanonical,
    rowsSkippedMutationBecauseAlreadyNonCanonical:
      params.rowsSkippedMutationBecauseAlreadyNonCanonical,
    rowsNewlyMarkedNonCanonical: params.rowsNewlyMarkedNonCanonical,
    mutationErrors: params.mutationErrors,
    queueInsertErrors: params.queueInsertErrors,
    durationMs: params.durationMs,
    dryRun: params.dryRun,
  };
}

export async function applyMergeMutation(
  supabase: DedupSupabaseClient,
  decision: DedupDecision,
): Promise<{ rowsNewlyMarkedNonCanonical: number; rowsSkipped: number }> {
  const canonicalRowId = decision.canonicalEventId;
  if (canonicalRowId === null) {
    throw new Error(`componentKey=${decision.componentKey}: canonicalEventId is null`);
  }

  const componentRowIds = [canonicalRowId, ...decision.nonCanonicalEventIds];
  const { data, error } = await supabase.rpc('apply_dedup_merge', {
    p_canonical_row_id: canonicalRowId,
    p_component_row_ids: componentRowIds,
  });

  if (error) {
    throw new Error(
      `Failed to apply dedup merge for componentKey=${decision.componentKey}: ${error.message}`,
    );
  }

  if (typeof data !== 'number' || !Number.isInteger(data) || data < 0) {
    throw new Error(`Invalid newly-demoted count for componentKey=${decision.componentKey}`);
  }

  return {
    rowsNewlyMarkedNonCanonical: data,
    rowsSkipped: decision.nonCanonicalEventIds.length - data,
  };
}

async function logAuditForMerge(
  supabase: DedupSupabaseClient,
  decision: DedupDecision,
): Promise<void> {
  const metadata: Json = {
    componentKey: decision.componentKey,
    deterministicDecision: decision.deterministicDecision,
    canonicalEventId: decision.canonicalEventId,
    nonCanonicalEventIds: [...decision.nonCanonicalEventIds],
    reason: decision.reason,
  };

  const { error } = await supabase
    .from('audit_log')
    .insert({
      user_id: null, // system-generated dedup action
      action_type: 'dedup_merge',
      entity_type: 'external_events',
      entity_id: decision.canonicalEventId ?? decision.componentKey,
      reason: decision.reason,
      metadata,
    } as never);

  if (error) {
    logWarning(
      `Failed to write audit log for componentKey=${decision.componentKey}: ${error.message}`,
    );
  }
}

async function invalidateDemotedComponents(
  invalidate: EventCacheInvalidator,
  componentEvents: readonly DedupEventInput[],
  decision: DedupDecision,
): Promise<void> {
  const demotionRows: EventIdentityRow[] = componentEvents.map((event) => ({
    id: event.id,
    title: event.title,
    city: event.city,
    state: event.state,
    event_start_date: event.event_start_date,
  }));
  const targets = buildDemotionTargets(demotionRows);
  if (targets.length === 0) {
    return;
  }
  try {
    await invalidate(targets);
  } catch (invalidationError) {
    logWarning(
      `Failed to invalidate event cache for demoted component ${decision.componentKey}: ${invalidationError instanceof Error ? invalidationError.message : String(invalidationError)}`,
    );
  }
}

interface MergeMutationOutcome {
  readonly rowsNewlyMarkedNonCanonical: number;
  readonly rowsSkipped: number;
  readonly mutationErrors: number;
}

async function applyMergeMutationWithInvalidation(
  supabase: DedupSupabaseClient,
  decision: DedupDecision,
  componentEvents: readonly DedupEventInput[],
  invalidate: EventCacheInvalidator | undefined,
): Promise<MergeMutationOutcome> {
  try {
    const result = await applyMergeMutation(supabase, decision);
    if (invalidate && result.rowsNewlyMarkedNonCanonical > 0) {
      await invalidateDemotedComponents(invalidate, componentEvents, decision);
    }
    await logAuditForMerge(supabase, decision);
    return {
      rowsNewlyMarkedNonCanonical: result.rowsNewlyMarkedNonCanonical,
      rowsSkipped: result.rowsSkipped,
      mutationErrors: 0,
    };
  } catch (mutationError) {
    logWarning(
      `Dedup mutation failed for ${decision.componentKey}: ${mutationError instanceof Error ? mutationError.message : String(mutationError)}`,
    );
    return {
      rowsNewlyMarkedNonCanonical: 0,
      rowsSkipped: 0,
      mutationErrors: 1,
    };
  }
}

export async function runDedupV2(
  config?: DedupConfig,
  injectedSupabase?: DedupSupabaseClient,
  invalidate?: EventCacheInvalidator,
): Promise<DedupRunMetrics> {
  const startTime = Date.now();
  const dryRun = config?.dryRun ?? false;
  const enableLLM = config?.enableLLM ?? !dryRun;

  const supabase = injectedSupabase ?? getSupabaseAdmin();

  const { data: clustersRaw, error: rpcError } = await (supabase.rpc as (
    fn: string,
  ) => ReturnType<typeof supabase.rpc>)('dedup_v2_candidates');

  if (rpcError) {
    throw new Error(`dedup_v2_candidates RPC failed: ${rpcError.message}`);
  }

  const clusters = (clustersRaw ?? []) as unknown as RpcCluster[];

  const decisions: DedupDecision[] = [];
  let crossStateClusters = 0;
  let crossSourceClusters = 0;
  let nullCoordinateClusters = 0;
  let rowsAlreadyNonCanonical = 0;
  let rowsSkippedMutationBecauseAlreadyNonCanonical = 0;
  let rowsNewlyMarkedNonCanonical = 0;
  let mutationErrors = 0;
  let queueInsertErrors = 0;
  let llmCallsAttempted = 0;
  let llmCallsSkippedDryRun = 0;

  const spatialEval = createSpatialFilteredEval(SQL_CANDIDATE_RADIUS_KM * 1000);

  for (const cluster of clusters) {
    if (!cluster.rows || cluster.rows.length === 0) continue;

    const events = normalizeClusterRows(cluster.rows);

    const preExistingNonCanonical = cluster.rows.filter((r) => !r.is_canonical).length;
    rowsAlreadyNonCanonical += preExistingNonCanonical;

    const states = new Set(events.map((e) => e.state).filter((s) => s !== null));
    if (states.size > 1) crossStateClusters++;

    const sources = new Set(events.map((e) => e.source));
    if (sources.size > 1) crossSourceClusters++;

    const hasNullCoords = events.some(
      (e) => e.location_lat === null || e.location_lng === null,
    );
    if (hasNullCoords) nullCoordinateClusters++;

    const graph = buildDedupGraph(events, spatialEval);
    const components = findConnectedComponents(graph, events);

    for (const component of components) {
      const componentEvents = component.events;
      if (componentEvents.length < 2) {
        decisions.push({
          componentKey: buildComponentKey(componentEvents.map((e) => e.id)),
          action: 'kept_separate',
          deterministicDecision: 'kept_separate',
          advisory: null,
          canonicalEventId: null,
          nonCanonicalEventIds: [],
          componentSize: componentEvents.length,
          reason: 'Singleton component — no merge needed',
        });
        continue;
      }

      const mergeDecision = decideMerge(component, evaluatePair);

      const eventIds = componentEvents.map((e) => e.id);
      const canonicalId = mergeDecision.canonicalEvent?.id ?? null;
      const nonCanonicalIds =
        mergeDecision.action === 'human_review'
          ? eventIds
          : canonicalId === null
            ? []
            : eventIds.filter((id) => id !== canonicalId);

      let advisory: MergeAdvice | null = null;

      if (mergeDecision.action === 'human_review') {
        if (dryRun || !enableLLM) {
          llmCallsSkippedDryRun++;
        } else {
          llmCallsAttempted++;
          try {
            advisory = await getMergeAdvice(component);
          } catch (llmError) {
            advisory = errorAdvice(
              `Unexpected error during LLM advisory: ${llmError instanceof Error ? llmError.message : String(llmError)}`,
              ADVISORY_MODEL,
              'ollama',
            );
          }
        }
      }

      const dedupDecision: DedupDecision = {
        componentKey: buildComponentKey(eventIds),
        action: mergeDecision.action,
        deterministicDecision: mergeDecision.action,
        advisory,
        canonicalEventId: canonicalId,
        nonCanonicalEventIds: nonCanonicalIds,
        componentSize: componentEvents.length,
        reason: mergeDecision.reasoning,
      };

      if (mergeDecision.action === 'auto_merged') {
        validateMergeMutation(dedupDecision);

        if (!dryRun) {
          const mutationOutcome = await applyMergeMutationWithInvalidation(
            supabase,
            dedupDecision,
            componentEvents,
            invalidate,
          );
          rowsNewlyMarkedNonCanonical += mutationOutcome.rowsNewlyMarkedNonCanonical;
          rowsSkippedMutationBecauseAlreadyNonCanonical += mutationOutcome.rowsSkipped;
          mutationErrors += mutationOutcome.mutationErrors;
        }
      }

      if (mergeDecision.action === 'human_review' && !dryRun) {
        try {
          const { error: queueError } = await supabase.rpc('upsert_dedup_review_queue', {
            p_payload: buildQueueInsert(dedupDecision),
          });
          if (queueError) throw queueError;
        } catch (queueError) {
          queueInsertErrors++;
          const queueErrorMessage =
            queueError instanceof Error
              ? queueError.message
              : typeof queueError === 'object' && queueError !== null && 'message' in queueError
                ? String(queueError.message)
                : String(queueError);
          logWarning(
            `Failed to insert into dedup review queue for ${dedupDecision.componentKey}: ${queueErrorMessage}`,
          );
        }
      }

      decisions.push(dedupDecision);
    }
  }

  const durationMs = Date.now() - startTime;

  return computeRunMetrics({
    totalClusters: clusters.length,
    decisions,
    crossStateClusters,
    crossSourceClusters,
    nullCoordinateClusters,
    rowsAlreadyNonCanonical,
    rowsSkippedMutationBecauseAlreadyNonCanonical,
    rowsNewlyMarkedNonCanonical,
    mutationErrors,
    queueInsertErrors,
    durationMs,
    dryRun,
    llmCallsAttempted,
    llmCallsSkippedDryRun,
  });
}
