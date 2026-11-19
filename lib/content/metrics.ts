import { getSupabasePublicReader } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';

const CSRA_CITIES = ['Augusta', 'Evans', 'Martinez', 'Grovetown', 'North Augusta', 'Aiken'];

export const PRICING = {
  PRO_MONTHLY: 50,
  PRO_FOUNDING_MONTHLY: 25,
} as const;

export interface TruckMetrics {
  totalTrucks: number;
  displayTotal: string;
  csraTrucks: number;
  displayCsra: string;
  claimedTrucks: number;
}

export interface EventSourceMetrics {
  sourceCount: number;
  displaySourceCount: string;
}

async function fetchTotalActiveTrucks(): Promise<number> {
  try {
    const supabase = getSupabasePublicReader();
    const { count, error } = await supabase
      .from('food_trucks')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) {
      logError('fetchTotalActiveTrucks: Supabase error', error);
      return 0;
    }

    return count ?? 0;
  } catch {
    logError('fetchTotalActiveTrucks: unexpected error');
    return 0;
  }
}

async function fetchCsraTrucks(): Promise<number> {
  try {
    const supabase = getSupabasePublicReader();
    const { count, error } = await supabase
      .from('food_trucks')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .in('city', CSRA_CITIES);

    if (error) {
      logError('fetchCsraTrucks: Supabase error', error);
      return 0;
    }

    return count ?? 0;
  } catch {
    logError('fetchCsraTrucks: unexpected error');
    return 0;
  }
}

async function fetchClaimedTrucks(): Promise<number> {
  try {
    const supabase = getSupabasePublicReader();
    const { count, error } = await supabase
      .from('food_trucks')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_claimed', true);

    if (error) {
      logError('fetchClaimedTrucks: Supabase error', error);
      return 0;
    }

    return count ?? 0;
  } catch {
    logError('fetchClaimedTrucks: unexpected error');
    return 0;
  }
}

async function fetchEventSourceCount(): Promise<number> {
  try {
    const supabase = getSupabasePublicReader();

    const { count: directoryCount, error: dirError } = await supabase
      .from('discovered_directories')
      .select('*', { count: 'exact', head: true });

    if (dirError) {
      logError('fetchEventSourceCount: directory count error', dirError);
      return 0;
    }

    const { data: eventSources, error: eventError } = await supabase
      .from('external_events')
      .select('source');

    if (eventError) {
      logError('fetchEventSourceCount: event sources error', eventError);
      return 0;
    }

    const distinctEventSources = new Set((eventSources ?? []).map((e) => e.source).filter(Boolean))
      .size;

    return (directoryCount ?? 0) + distinctEventSources;
  } catch {
    logError('fetchEventSourceCount: unexpected error');
    return 0;
  }
}

export function formatDisplayNumber(n: number): string {
  const step = n >= 1000 ? 1000 : 5;
  const base = Math.floor(n / step) * step;
  return `${base}+`;
}

let cachedTruckMetrics: TruckMetrics | null = null;
let cachedTruckMetricsAt = 0;
let cachedEventSourceMetrics: EventSourceMetrics | null = null;
let cachedEventSourceMetricsAt = 0;
const CACHE_TTL_MS = 60_000;

export async function getTruckMetrics(): Promise<TruckMetrics> {
  if (cachedTruckMetrics && Date.now() - cachedTruckMetricsAt < CACHE_TTL_MS) {
    return cachedTruckMetrics;
  }

  const [totalTrucks, csraTrucks, claimedTrucks] = await Promise.all([
    fetchTotalActiveTrucks(),
    fetchCsraTrucks(),
    fetchClaimedTrucks(),
  ]);

  cachedTruckMetrics = {
    totalTrucks,
    displayTotal: formatDisplayNumber(totalTrucks),
    csraTrucks,
    displayCsra: formatDisplayNumber(csraTrucks),
    claimedTrucks,
  };
  cachedTruckMetricsAt = Date.now();

  return cachedTruckMetrics;
}

export async function getEventSourceMetrics(): Promise<EventSourceMetrics> {
  if (cachedEventSourceMetrics && Date.now() - cachedEventSourceMetricsAt < CACHE_TTL_MS) {
    return cachedEventSourceMetrics;
  }

  const sourceCount = await fetchEventSourceCount();

  cachedEventSourceMetrics = {
    sourceCount,
    displaySourceCount: formatDisplayNumber(sourceCount),
  };
  cachedEventSourceMetricsAt = Date.now();

  return cachedEventSourceMetrics;
}

export async function getFoundingMemberData(): Promise<{
  taken: number;
  remaining: number;
  total: number;
}> {
  try {
    const supabase = getSupabasePublicReader();
    const { data, error } = await supabase.rpc('get_founding_member_status');

    if (error || !data?.[0]) {
      logError('getFoundingMemberData: failed to fetch status', error);
      throw new Error(error?.message ?? 'Founding member status returned no result');
    }

    const status = data[0];
    return {
      taken: status.active + status.reserved,
      remaining: status.remaining,
      total: status.total,
    };
  } catch (error) {
    logError('getFoundingMemberData: unexpected error', error);
    throw error;
  }
}
