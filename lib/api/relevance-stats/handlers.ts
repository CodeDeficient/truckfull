import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';

export interface RelevanceStats {
  readonly totalClassified: number;
  readonly relevant: number;
  readonly notRelevant: number;
  readonly reviewNeeded: number;
  readonly avgConfidence: number;
  readonly tier1Classified: number;
  readonly tier2Classified: number;
  readonly pendingClassification: number;
  readonly bySource: Record<string, { total: number; relevant: number }>;
  readonly timestamp: string;
}

export function buildSourceBreakdown(
  rows: ReadonlyArray<{ source: string; total: number; relevant: number }> | null,
): Record<string, { total: number; relevant: number }> {
  const bySource: Record<string, { total: number; relevant: number }> = {};
  for (const row of rows ?? []) {
    bySource[row.source] = {
      total: Number(row.total),
      relevant: Number(row.relevant),
    };
  }
  return bySource;
}

export async function getRelevanceStats(): Promise<RelevanceStats> {
  const supabase = getSupabaseAdmin();

  const [
    totalClassifiedResult,
    relevantResult,
    notRelevantResult,
    reviewNeededResult,
    avgConfidenceResult,
    tier1Result,
    tier2Result,
    pendingResult,
    sourceBreakdownResult,
  ] = await Promise.all([
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .not('relevance_classified_at', 'is', null),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .eq('is_food_truck_relevant', true),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .eq('is_food_truck_relevant', false),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .eq('relevance_review_needed', true),
    supabase
      .from('external_events')
      .select('relevance_confidence')
      .not('relevance_confidence', 'is', null),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .eq('relevance_model', 'keyword_classifier'),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .or('relevance_model.like.%gemma%,relevance_model.like.%deepseek%'),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .is('relevance_classified_at', null),
    supabase.rpc('get_relevance_stats_by_source'),
  ]);

  const errors = [
    totalClassifiedResult,
    relevantResult,
    notRelevantResult,
    reviewNeededResult,
    avgConfidenceResult,
    tier1Result,
    tier2Result,
    pendingResult,
    sourceBreakdownResult,
  ].filter((r) => r.error);

  if (errors.length > 0) {
    const messages = errors.map((e) => e.error?.message).join(', ');
    logError('Relevance stats query failed:', messages);
  }

  const confidenceValues = (
    avgConfidenceResult.data as Array<{ relevance_confidence: number }> | null
  )?.map((r) => r.relevance_confidence) ?? [];

  const avgConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((a: number, b: number) => a + b, 0) / confidenceValues.length
      : 0;

  const bySource = buildSourceBreakdown(sourceBreakdownResult.data);

  return {
    totalClassified: totalClassifiedResult.count ?? 0,
    relevant: relevantResult.count ?? 0,
    notRelevant: notRelevantResult.count ?? 0,
    reviewNeeded: reviewNeededResult.count ?? 0,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    tier1Classified: tier1Result.count ?? 0,
    tier2Classified: tier2Result.count ?? 0,
    pendingClassification: pendingResult.count ?? 0,
    bySource,
    timestamp: new Date().toISOString(),
  };
}
