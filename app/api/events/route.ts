/**
 * Events API
 * WBS: 6.2.2
 *
 * GET: List published events with optional filters
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import { cleanEventDescription } from '@/lib/events/descriptionUtils';
import { verifyRoleFromCookies } from '@/lib/auth/authHelpers';
import { verifyOwnerAccessFromCookies } from '@/lib/auth/ownerAccessServer';
import { fetchTrafficForEvents } from '@/lib/traffic/dotTrafficService';

const UNSAFE_SEARCH_CHARS = /[^\w\s\-\.\@]/g;

const TIER_RADIUS_CAP: Record<string, number> = { free: 100, pro: 300, enterprise: 300 };

const createEventSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(5000).optional().default(''),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  location_data: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      address: z.string().max(300).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(2).optional(),
    })
    .optional(),
  vendor_fee: z.number().min(0).max(999_999.99).nullable().optional(),
  max_vendors: z.number().int().min(1).max(500).nullable().optional(),
});

type CountSource = 'platform' | 'external';

function sanitizeSearch(query: string): string {
  return query
    .replaceAll(UNSAFE_SEARCH_CHARS, '')
    .replaceAll('%', String.raw`\%`)
    .replaceAll('_', String.raw`\_`)
    .trim();
}

interface CountFilters {
  startDate: string | null;
  endDate: string | null;
  minVettingScore: number;
}

async function getCount(
  supabase: ReturnType<typeof createClient>,
  status: string,
  q: string | null,
  period: string,
  source: CountSource,
  dateFilters: CountFilters,
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  if (source === 'platform') {
    let query = supabase
      .from('eventfull_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', status);
    if (q) query = query.or(`name.ilike.%${sanitizeSearch(q)}%,description.ilike.%${sanitizeSearch(q)}%`);
    if (period === 'future' || period === 'upcoming') query = query.gte('start_date', today);
    else if (period === 'past') query = query.lt('start_date', today);
    if (dateFilters.startDate) query = query.gte('start_date', dateFilters.startDate);
    if (dateFilters.endDate) query = query.lte('start_date', dateFilters.endDate);
    const { count } = await query;
    return count ?? 0;
  }

  // Note: filters on location_lat/lng NOT NULL for consistency with the
  // paginated list query below. The allMode RPC (find_external_events_for_map_json)
  // filters on location_geog IS NOT NULL instead — a pre-existing divergence
  // between the count/list paths and the RPC path. Rows where location_geog is
  // populated but location_lat/lng are null (or vice versa) will be counted
  // differently between the two paths. This is acceptable because allMode is
  // a separate code path used only by the map view.
  let query = supabase
    .from('canonical_events')
    .select('id', { count: 'exact', head: true })
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null)
    .eq('is_hidden', false);
  if (q) query = query.or(`title.ilike.%${sanitizeSearch(q)}%,description.ilike.%${sanitizeSearch(q)}%`);
  if (period === 'future' || period === 'upcoming') query = query.gte('event_start_date', today);
  else if (period === 'past') query = query.lt('event_start_date', today);
  if (dateFilters.startDate) query = query.gte('event_start_date', dateFilters.startDate);
  if (dateFilters.endDate) query = query.lte('event_start_date', dateFilters.endDate);
  if (dateFilters.minVettingScore > 0) query = query.gte('vetting_score', dateFilters.minVettingScore);
  const { count } = await query;
  return count ?? 0;
}

interface PlatformEventRecord {
  id: string;
  name: string;
  description: string | null;
  location_data: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
  } | null;
  start_date: string;
  end_date: string;
  status: string;
  vendor_fee: number | null;
  max_vendors: number | null;
  created_at: string;
  event_organizers: {
    business_name: string;
    rating_avg: number;
    rating_count: number;
    verification_status: string;
    user_id: string;
  } | null;
}

interface ExternalEventRecord {
  id: string;
  title: string;
  description: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  city: string | null;
  state: string | null;
  source_type: string;
  source: string;
  source_url: string | null;
  vetting_score: number | null;
  verification_badge: string | null;
  relevance_score: number | null;
}

function transformPlatformEvent(
  event: PlatformEventRecord,
  applicationCounts: Record<string, number>,
): Record<string, unknown> {
  return {
    id: event.id,
    name: event.name,
    description: cleanEventDescription(event.description),
    location_data: event.location_data,
    start_date: event.start_date,
    end_date: event.end_date,
    status: event.status,
    vendor_fee: event.vendor_fee,
    max_vendors: event.max_vendors,
    applications_count: applicationCounts[event.id] || 0,
    event_source: 'platform' as const,
    organizer: event.event_organizers
      ? {
          business_name: event.event_organizers.business_name,
          rating_avg: event.event_organizers.rating_avg,
          rating_count: event.event_organizers.rating_count,
          verification_status: event.event_organizers.verification_status,
          user_id: event.event_organizers.user_id,
        }
      : undefined,
  };
}

function transformExternalEvent(event: ExternalEventRecord): Record<string, unknown> {
  return {
    id: event.id,
    name: event.title,
    description: cleanEventDescription(event.description),
    start_date: event.event_start_date,
    end_date: event.event_end_date,
    location_data:
      event.location_lat != null && event.location_lng != null
        ? {
            lat: event.location_lat,
            lng: event.location_lng,
            address: event.location_address,
            city: event.city,
            state: event.state,
          }
        : null,
    status: 'published',
    vendor_fee: null,
    max_vendors: null,
    organizer: {
      business_name: null,
      rating_avg: null,
      rating_count: null,
      verification_status: null,
    },
    event_source: 'external' as const,
    source_type: event.source_type,
    source: event.source,
    source_url: event.source_url,
    vetting_score: event.vetting_score,
    verification_badge: event.verification_badge,
    relevance_score: event.relevance_score,
    is_saved: false,
  };
}

type ServerSupabase = ReturnType<typeof createClient>;

interface EventListFilters {
  readonly status: string;
  readonly searchQ: string | null;
  readonly period: string;
  readonly allMode: boolean;
  readonly dbLimit: number;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly minVettingScore: number;
}

const PLATFORM_EVENT_COLUMNS = `id, name, description, location_data,
             start_date, end_date, status, vendor_fee, max_vendors,
             created_at,
             event_organizers(
               business_name, rating_avg, rating_count, verification_status, user_id
             )`;

const EXTERNAL_EVENT_COLUMNS = `id, title, description, event_start_date, event_end_date,
             location_lat, location_lng, location_address, city, state,
             source_type, source, source_url, vetting_score, verification_badge, relevance_score`;

async function resolveRadiusCap(supabase: ServerSupabase): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 100;
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
  return TIER_RADIUS_CAP[profile?.subscription_tier ?? 'free'] ?? 100;
}

async function fetchPlatformEvents(
  supabase: ServerSupabase,
  filters: EventListFilters,
): Promise<PlatformEventRecord[] | null> {
  const today = new Date().toISOString().split('T')[0];
  let query = supabase
    .from('eventfull_events')
    .select(PLATFORM_EVENT_COLUMNS)
    .eq('status', filters.status)
    .order('start_date', { ascending: true })
    .limit(filters.allMode ? 25_000 : filters.dbLimit);
  if (!filters.allMode && filters.searchQ) {
    const term = sanitizeSearch(filters.searchQ);
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (filters.period === 'future' || filters.period === 'upcoming') query = query.gte('start_date', today);
  else if (filters.period === 'past') query = query.lt('start_date', today);
  if (!filters.allMode && filters.startDate) query = query.gte('start_date', filters.startDate);
  if (!filters.allMode && filters.endDate) query = query.lte('start_date', filters.endDate);
  const { data, error } = await query;
  if (error) {
    logError('Error fetching platform events:', error);
    return null;
  }
  return (data ?? []) as unknown as PlatformEventRecord[];
}

async function fetchExternalEventsForMap(period: string): Promise<ExternalEventRecord[] | null> {
  const { data, error } = await getSupabaseAdmin().rpc('find_external_events_for_map_json', {
    p_period: period,
  });
  if (error) {
    logError('Error fetching external events via JSONB RPC:', error);
    return null;
  }
  return typeof data === 'string'
    ? (JSON.parse(data) as ExternalEventRecord[])
    : (data as unknown as ExternalEventRecord[]);
}

async function fetchExternalEvents(
  supabase: ServerSupabase,
  filters: EventListFilters,
): Promise<ExternalEventRecord[] | null> {
  if (filters.allMode) return fetchExternalEventsForMap(filters.period);
  const today = new Date().toISOString().split('T')[0];
  let query = supabase
    .from('canonical_events')
    .select(EXTERNAL_EVENT_COLUMNS)
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null)
    .gt('location_lat', -90)
    .lt('location_lat', 90)
    .gt('location_lng', -180)
    .lt('location_lng', 180)
    .eq('is_hidden', false)
    .order('event_start_date', { ascending: true })
    .limit(filters.dbLimit);
  if (filters.period === 'future' || filters.period === 'upcoming') query = query.gte('event_start_date', today);
  else if (filters.period === 'past') query = query.lt('event_start_date', today);
  if (filters.startDate) query = query.gte('event_start_date', filters.startDate);
  if (filters.endDate) query = query.lte('event_start_date', filters.endDate);
  if (filters.minVettingScore > 0) query = query.gte('vetting_score', filters.minVettingScore);
  if (filters.searchQ) {
    const term = sanitizeSearch(filters.searchQ);
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) {
    logError('Error fetching external events:', error);
    return null;
  }
  return (data ?? []) as unknown as ExternalEventRecord[];
}

async function fetchApplicationCounts(
  supabase: ServerSupabase,
  eventIds: string[],
): Promise<Record<string, number>> {
  const applicationCounts: Record<string, number> = {};
  if (eventIds.length === 0) return applicationCounts;
  const { data: counts } = await supabase
    .from('event_applications')
    .select('event_id')
    .in('event_id', eventIds)
    .in('status', ['pending', 'accepted']);
  for (const curr of counts ?? []) {
    applicationCounts[curr.event_id] = (applicationCounts[curr.event_id] || 0) + 1;
  }
  return applicationCounts;
}

function sortEvents(events: Array<Record<string, unknown>>, sort: string): void {
  if (sort === 'start_date_desc') {
    events.sort((a, b) => String(b.start_date ?? '').localeCompare(String(a.start_date ?? '')));
  } else if (sort === 'name_asc') {
    events.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
  } else {
    events.sort((a, b) => String(a.start_date ?? '').localeCompare(String(b.start_date ?? '')));
  }
}

async function countAllEvents(
  supabase: ServerSupabase,
  source: string,
  filters: EventListFilters,
): Promise<number> {
  const dateFilters: CountFilters = {
    startDate: filters.startDate,
    endDate: filters.endDate,
    minVettingScore: filters.minVettingScore,
  };
  const [pCount, eCount] = await Promise.all([
    source === 'external' ? 0 : getCount(supabase, filters.status, filters.searchQ, filters.period, 'platform', dateFilters),
    source === 'platform' ? 0 : getCount(supabase, filters.status, filters.searchQ, filters.period, 'external', dateFilters),
  ]);
  return pCount + eCount;
}

async function attachTraffic(pageEvents: Array<Record<string, unknown>>): Promise<void> {
  const eventTrafficMap = await fetchTrafficForEvents(pageEvents);
  for (const event of pageEvents) {
    const traffic = eventTrafficMap.get(event.id as string);
    if (traffic) {
      event.traffic_level = traffic.level;
      event.traffic_score = traffic.score;
      event.traffic_aadt = traffic.aadt;
    }
  }
}

function parseEventListFilters(searchParams: URLSearchParams): {
  filters: EventListFilters;
  source: string;
  sort: string;
  page: number;
  limit: number | undefined;
} {
  const allMode = searchParams.get('all') === 'true';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const limit = allMode
    ? undefined
    : Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
  const minVettingParam = searchParams.get('minVettingScore');
  const filters: EventListFilters = {
    status: searchParams.get('status') || 'published',
    searchQ: searchParams.get('q'),
    period: searchParams.get('period') || 'future',
    allMode,
    dbLimit: page * (limit ?? 20),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
    minVettingScore: minVettingParam == null ? 0 : Number(minVettingParam),
  };
  return {
    filters,
    source: searchParams.get('source') || 'all',
    sort: searchParams.get('sort') || 'start_date_asc',
    page,
    limit,
  };
}

async function listEvents(supabase: ServerSupabase, searchParams: URLSearchParams): Promise<NextResponse> {
  const { filters, source, sort, page, limit } = parseEventListFilters(searchParams);
  const { allMode, dbLimit } = filters;
  const [radiusCap, platformEvents, externalEvents] = await Promise.all([
    allMode ? resolveRadiusCap(supabase) : 100,
    source === 'all' || source === 'platform' ? fetchPlatformEvents(supabase, filters) : [],
    source === 'all' || source === 'external' ? fetchExternalEvents(supabase, filters) : [],
  ]);
  if (!platformEvents || !externalEvents) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }

  const applicationCounts = allMode
    ? {}
    : await fetchApplicationCounts(supabase, platformEvents.map((e) => e.id));
  const allEvents: Array<Record<string, unknown>> = [
    ...platformEvents.map((e) => transformPlatformEvent(e, applicationCounts)),
    ...externalEvents.map((e) => transformExternalEvent(e)),
  ];
  sortEvents(allEvents, sort);

  const from = allMode ? 0 : (page - 1) * (limit ?? 20);
  const to = allMode ? 0 : from + (limit ?? 20) - 1;
  const pageEvents = allMode ? allEvents : allEvents.slice(from, to + 1);
  const needsAccurateTotal =
    !allMode && (platformEvents.length >= dbLimit || externalEvents.length >= dbLimit);
  const [totalCount] = await Promise.all([
    needsAccurateTotal ? countAllEvents(supabase, source, filters) : allEvents.length,
    allMode ? undefined : attachTraffic(pageEvents),
  ]);
  const hasMore = allMode ? false : to + 1 < totalCount;

  const headers = new Headers();
  headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
  return NextResponse.json(
    { events: pageEvents, total: totalCount, page, limit: limit ?? allEvents.length, hasMore, ...(allMode ? { radiusCap } : {}) },
    { headers },
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = request.nextUrl;

    const access = await verifyOwnerAccessFromCookies();
    if (access.outcome === 'unauthenticated' || access.outcome === 'authenticated_without_access') {
      return NextResponse.json({ error: 'Food truck owner access required' }, { status: 403 });
    }

    return await listEvents(supabase, searchParams);
  } catch (error) {
    logError('Error in events GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ok: isOwner } = await verifyRoleFromCookies('food_truck_owner');
    if (!isOwner) {
      return NextResponse.json({ error: 'Only food truck owners can create events' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, description, start_date, end_date, location_data, vendor_fee, max_vendors } =
      parsed.data;

    // 1. Check if user already has an event_organizer profile
    const { data: existingOrganizer, error: organizerLookupError } = await supabase
      .from('event_organizers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // PGRST116 (no rows found) is expected for new organizers
    if (organizerLookupError && organizerLookupError.code !== 'PGRST116') {
      logError('Error checking organizer profile:', organizerLookupError);
    }

    let organizerId = existingOrganizer?.id;

    // 2. If not, create one using their profile info or a default name
    if (!organizerId) {
      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const businessName = profile?.full_name || 'Event Organizer';

      const { data: newOrganizer, error: createError } = await supabase
        .from('event_organizers')
        .insert({
          user_id: user.id,
          business_name: businessName,
          contact_email: profile?.email || user.email,
          verification_status: 'unverified',
          rating_avg: 0,
          rating_count: 0,
        })
        .select('id')
        .single();

      if (createError) {
        logError('Error creating organizer profile:', createError);
        return NextResponse.json({ error: 'Failed to create organizer profile' }, { status: 500 });
      }

      organizerId = newOrganizer.id;
    }

    // 3. Check organizer verification status for paid events
    const { data: organizer, error: organizerStatusError } = await supabase
      .from('event_organizers')
      .select('verification_status')
      .eq('id', organizerId)
      .single();

    if (organizerStatusError) {
      logError('Error checking organizer verification status:', organizerStatusError);
    }

    const isPaidEvent = vendor_fee != null && vendor_fee > 0;
    const isVerified = organizer?.verification_status === 'verified';

    if (isPaidEvent && !isVerified) {
      return NextResponse.json(
        { error: 'Only verified organizers can create paid events' },
        { status: 403 },
      );
    }

    // 4. Create the event
    const { data: event, error: eventError } = await supabase
      .from('eventfull_events')
      .insert({
        organizer_id: organizerId,
        name,
        description,
        start_date,
        end_date,
        location_data,
        status: 'published',
        vendor_fee,
        max_vendors,
      })
      .select()
      .single();

    if (eventError) {
      logError('Error creating event:', eventError);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    logError('Error in events POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
