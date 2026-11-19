import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';

export interface PipelineStats {
  readonly syncLog: Array<{ source: string; lastSyncedAt: string }>;
  readonly eventCounts: {
    readonly total: number;
    readonly withCoordinates: number;
    readonly vetted: number;
    readonly relevant: number;
    readonly classified: number;
    readonly reviewNeeded: number;
  };
  readonly geocodingFailures: {
    readonly total: number;
    readonly unresolved: number;
  };
  readonly recentEvents: Array<{
    id: string;
    title: string;
    source: string;
    ingested_at: string;
    vetting_score: number | null;
    is_food_truck_relevant: boolean | null;
    has_coordinates: boolean;
  }>;
}

export async function getPipelineStats(): Promise<PipelineStats> {
  const supabase = getSupabaseAdmin();

  const [
    syncLogResult,
    totalResult,
    withCoordsResult,
    vettedResult,
    relevantResult,
    classifiedResult,
    reviewNeededResult,
    geocodingTotalResult,
    geocodingUnresolvedResult,
    recentResult,
  ] = await Promise.all([
    supabase
      .from('external_events_sync_log')
      .select('source, last_synced_at')
      .order('last_synced_at', { ascending: false }),
    supabase.from('external_events').select('id', { count: 'exact', head: true }),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .not('vetting_score', 'is', null),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .eq('is_food_truck_relevant', true),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .not('relevance_classified_at', 'is', null),
    supabase
      .from('external_events')
      .select('id', { count: 'exact', head: true })
      .eq('relevance_review_needed', true),
    supabase.from('geocoding_failures').select('id', { count: 'exact', head: true }),
    supabase
      .from('geocoding_failures')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null),
    supabase
      .from('external_events')
      .select(
        'id, title, source, ingested_at, vetting_score, is_food_truck_relevant, location_lat, location_lng',
      )
      .order('ingested_at', { ascending: false })
      .limit(20),
  ]);

  const errors = [
    syncLogResult,
    totalResult,
    withCoordsResult,
    vettedResult,
    relevantResult,
    classifiedResult,
    reviewNeededResult,
    geocodingTotalResult,
    geocodingUnresolvedResult,
    recentResult,
  ].filter((r) => r.error);

  if (errors.length > 0) {
    logError(
      'Pipeline stats query failed:',
      errors.map((e) => e.error?.message).join(', '),
    );
  }

  return {
    syncLog: ((syncLogResult.data ?? []) as Array<{ source: string; last_synced_at: string }>).map(
      (r) => ({ source: r.source, lastSyncedAt: r.last_synced_at }),
    ),
    eventCounts: {
      total: totalResult.count ?? 0,
      withCoordinates: withCoordsResult.count ?? 0,
      vetted: vettedResult.count ?? 0,
      relevant: relevantResult.count ?? 0,
      classified: classifiedResult.count ?? 0,
      reviewNeeded: reviewNeededResult.count ?? 0,
    },
    geocodingFailures: {
      total: geocodingTotalResult.count ?? 0,
      unresolved: geocodingUnresolvedResult.count ?? 0,
    },
    recentEvents: ((recentResult.data ?? []) as Array<{
      id: string;
      title: string;
      source: string;
      ingested_at: string;
      vetting_score: number | null;
      is_food_truck_relevant: boolean | null;
      location_lat: number | null;
      location_lng: number | null;
    }>).map((r) => ({
      id: r.id,
      title: r.title,
      source: r.source,
      ingested_at: r.ingested_at,
      vetting_score: r.vetting_score,
      is_food_truck_relevant: r.is_food_truck_relevant,
      has_coordinates: r.location_lat != null && r.location_lng != null,
    })),
  };
}
