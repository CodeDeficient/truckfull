import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';

export type TrafficLevel = 'high' | 'medium' | 'low' | 'none';

export interface TrafficResult {
  level: TrafficLevel;
  score: number;
  aadt: number | null;
}

interface TrafficCacheData {
  level: TrafficLevel;
  score: number;
  aadt: number | null;
  station_count: number;
  radius_meters: number;
}

const CACHE_TTL_DAYS = 90;
const RADIUS_STEPS = [1500, 3000, 5000];
const TRAFFIC_CONCURRENCY = 5;

async function getTrafficForCoord(lat: number, lng: number): Promise<TrafficResult> {
  const supabaseAdmin = getSupabaseAdmin();
  const cacheKey = `dot:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CACHE_TTL_DAYS);

  const { data: cacheData } = (await supabaseAdmin
    .from('foot_traffic_cache' as never)
    .select('data')
    .eq('place_id', cacheKey)
    .gte('fetched_at', cutoffDate.toISOString())
    .single()) as { data: { data: TrafficCacheData } | null };

  if (cacheData?.data) {
    const cached = cacheData.data;
    return {
      level: cached.level,
      score: cached.score,
      aadt: cached.aadt,
    };
  }

  let foundResult: TrafficCacheData | null = null;

  for (const radius of RADIUS_STEPS) {
    const { data: rpcData } = (await supabaseAdmin.rpc(
      'get_location_traffic_score' as never,
      {
        p_lat: lat,
        p_lng: lng,
        p_radius_meters: radius,
      } as never,
    )) as {
      data:
        | {
            station_count: number;
            avg_aadt: number;
            max_aadt: number;
            percentile_score: number;
            traffic_level: string;
          }[]
        | null;
    };

    if (rpcData && rpcData.length > 0) {
      const result = rpcData[0];
      if (result.station_count > 0) {
        const level =
          result.traffic_level === 'unknown'
            ? 'none'
            : (result.traffic_level as TrafficLevel);
        foundResult = {
          level,
          score: Math.round(result.percentile_score),
          aadt: Math.round(result.avg_aadt),
          station_count: result.station_count,
          radius_meters: radius,
        };
        break;
      }
    }
  }

  if (!foundResult) {
    foundResult = {
      level: 'none',
      score: 0,
      aadt: null,
      station_count: 0,
      radius_meters: RADIUS_STEPS.at(-1) as number,
    };
  }

  await supabaseAdmin.from('foot_traffic_cache' as never).upsert(
    {
      place_id: cacheKey,
      data: foundResult,
      venue_name: `DOT traffic`,
      venue_address: '',
      fetched_at: new Date().toISOString(),
    } as never,
    { onConflict: 'place_id' } as never,
  );

  return {
    level: foundResult.level,
    score: foundResult.score,
    aadt: foundResult.aadt,
  };
}

interface CoordEntry {
  lat: number;
  lng: number;
  eventIds: string[];
}

export async function fetchTrafficForEvents(
  pageEvents: Array<Record<string, unknown>>,
): Promise<Map<string, TrafficResult>> {
  const uniqueCoords = new Map<string, CoordEntry>();

  for (const event of pageEvents) {
    const loc = event.location_data as { lat: number; lng: number } | null;
    if (loc?.lat == null || loc?.lng == null) continue;
    const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
    if (!uniqueCoords.has(key)) {
      uniqueCoords.set(key, { lat: loc.lat, lng: loc.lng, eventIds: [] });
    }
    uniqueCoords.get(key)!.eventIds.push(event.id as string);
  }

  const coordKeys = [...uniqueCoords.keys()];
  const trafficByCoord = new Map<string, TrafficResult>();

  for (let i = 0; i < coordKeys.length; i += TRAFFIC_CONCURRENCY) {
    const batch = coordKeys.slice(i, i + TRAFFIC_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (key) => {
        const coord = uniqueCoords.get(key)!;
        const result = await getTrafficForCoord(coord.lat, coord.lng);
        return { key, result };
      }),
    );

    for (const [idx, outcome] of results.entries()) {
      const key = batch[idx];
      if (outcome.status === 'fulfilled') {
        trafficByCoord.set(key, outcome.value.result);
      } else {
        logError(`Traffic fetch error for coord ${key}:`, outcome.reason);
        trafficByCoord.set(key, { level: 'none', score: 0, aadt: null });
      }
    }
  }

  const eventTrafficMap = new Map<string, TrafficResult>();
  for (const event of pageEvents) {
    const loc = event.location_data as { lat: number; lng: number } | null;
    if (loc?.lat == null || loc?.lng == null) continue;
    const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
    const traffic = trafficByCoord.get(key);
    if (traffic) {
      eventTrafficMap.set(event.id as string, traffic);
    }
  }

  return eventTrafficMap;
}