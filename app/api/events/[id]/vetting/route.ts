/**
 * Event Vetting API
 *
 * GET /api/events/[id]/vetting?source=eventfull|external
 *   Returns cached vetting result (24-hour cache)
 *   source=eventfull: queries eventfull_events table (default)
 *   source=external: queries external_events table with column mapping
 *
 * POST /api/events/[id]/vetting?source=eventfull|external
 *   Force re-vetting (clears cache)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { logError, logMessage } from '@/lib/logging';
import {
  vetEvent,
  getCachedVetting,
  setCachedVetting,
  clearVettingCache,
} from '@/lib/events/eventVetting';
import type { EventVettingRequest, EventSource } from '@/lib/events/vettingTypes';
import { saveVettingResult, getVettingResult } from '@/lib/events/vettingStore';
import { shouldUseCityFallback, getCityCenter } from '@/lib/events/vettingLocationFallback';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyOwnerAccessFromCookies } from '@/lib/auth/ownerAccessServer';
import {
  buildVettingEligibilityTargets,
  type EventIdentityRow,
} from '@/lib/events/eventCacheTargets';
import { invalidateEventCacheTargets } from '@/lib/events/eventPageInvalidation';
import {
  canVetEvent,
  type EventOwnership,
  type VettingCaller,
} from '@/lib/events/vettingAuthorization';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type ExternalEventRow = {
  id: string;
  title: string;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  event_start_date: string | null;
  city: string | null;
  state: string | null;
  vetting_score: number | null;
  submitted_by: string | null;
};

interface ExternalVettingBuildResult {
  request: EventVettingRequest | null;
  errorResponse: Response | null;
  priorVettingScore: number | null;
  ownership: EventOwnership;
}

async function buildExternalVettingRequest(
  eventId: string,
): Promise<ExternalVettingBuildResult | null> {
  const supabase = createClient();
  const { data: event, error } = await supabase
    .from('external_events')
    .select(
      'id, title, location_lat, location_lng, location_address, event_start_date, city, state, vetting_score, submitted_by',
    )
    .eq('id', eventId)
    .single();

  if (error || !event) {
    return null;
  }

  const row = event as unknown as ExternalEventRow;
  const ownership: EventOwnership = {
    source: 'external',
    organizerUserId: null,
    submittedBy: row.submitted_by,
  };
  let lat = row.location_lat;
  let lng = row.location_lng;
  let locationType: 'precise' | 'approximate' = 'precise';

  if (lat == null || lng == null) {
    if (!shouldUseCityFallback(row)) {
      return {
        request: null,
        errorResponse: NextResponse.json(
          { error: 'Event cannot be vetted: insufficient location data' },
          { status: 422 },
        ),
        priorVettingScore: row.vetting_score,
        ownership,
      };
    }
    const center = getCityCenter(row.city ?? '', row.state ?? '');
    if (!center) {
      return {
        request: null,
        errorResponse: NextResponse.json(
          { error: 'Event cannot be vetted: insufficient location data' },
          { status: 422 },
        ),
        priorVettingScore: row.vetting_score,
        ownership,
      };
    }
    lat = center.lat;
    lng = center.lng;
    locationType = 'approximate';
  }

  const request: EventVettingRequest = {
    eventId: row.id,
    eventName: row.title,
    location: {
      lat: lat ?? 0,
      lng: lng ?? 0,
      address: row.location_address ?? '',
    },
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    date: row.event_start_date,
    source: 'external',
    locationType,
  };

  return { request, errorResponse: null, priorVettingScore: row.vetting_score, ownership };
}

async function clearExternalDbCache(eventId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('external_events')
    .update({
      vetting_score: null,
      vetting_result: null,
    })
    .eq('id', eventId);

  if (error) {
    logError('Failed to clear external event vetting cache:', error);
  }
}

async function resolveEventfullOwnership(eventId: string): Promise<EventOwnership | null> {
  const supabase = getSupabaseAdmin();
  const { data: event, error } = await supabase
    .from('eventfull_events')
    .select('organizer_id, event_organizers(user_id)')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    return null;
  }

  const organizer = event.event_organizers as { user_id: string | null } | null;
  return {
    source: 'eventfull',
    organizerUserId: organizer?.user_id ?? null,
    submittedBy: null,
  };
}

async function handleGet(request: NextRequest, context: RouteParams): Promise<Response> {
  const access = await verifyOwnerAccessFromCookies();
  if (access.outcome === 'unauthenticated' || access.outcome === 'authenticated_without_access') {
    return NextResponse.json({ error: 'Owner tools access required' }, { status: 403 });
  }

  const { id: eventId } = await context.params;
  if (!eventId) {
    return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
  }

  const source = (request.nextUrl.searchParams.get('source') ?? 'eventfull') as EventSource;

  if (source !== 'eventfull' && source !== 'external') {
    return NextResponse.json(
      { error: 'Invalid source parameter. Use eventfull or external' },
      { status: 400 },
    );
  }

  try {
    if (source === 'external') {
      return await handleExternalGet(eventId);
    }

    const cached = await getCachedVetting(eventId);
    if (cached) {
      logMessage(`Returning cached vetting for event ${eventId}`);
      return NextResponse.json({
        result: cached,
        cached: true,
        cachedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { result: null, cached: false, vetted: false },
      { status: 200 },
    );
  } catch (error) {
    logError('Error in vetting GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleExternalGet(eventId: string): Promise<Response> {
  const cached = await getVettingResult(eventId, 'external');
  if (cached) {
    return NextResponse.json({ result: cached, cached: true, source: 'external' });
  }

  return NextResponse.json(
    { result: null, cached: false, source: 'external', vetted: false },
    { status: 200 },
  );
}

async function handlePost(request: NextRequest, context: RouteParams): Promise<Response> {
  const access = await verifyOwnerAccessFromCookies();
  if (access.outcome === 'unauthenticated' || access.outcome === 'authenticated_without_access') {
    return NextResponse.json({ error: 'Owner tools access required' }, { status: 403 });
  }

  const { id: eventId } = await context.params;
  if (!eventId) {
    return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
  }

  const source = (request.nextUrl.searchParams.get('source') ?? 'eventfull') as EventSource;

  if (source !== 'eventfull' && source !== 'external') {
    return NextResponse.json(
      { error: 'Invalid source parameter. Use eventfull or external' },
      { status: 400 },
    );
  }

  try {
    const caller: VettingCaller = {
      userId: access.userId,
      role: access.role,
      hasOwnerAccess: true,
    };

    if (source === 'external') {
      return await handleExternalPost(eventId, caller);
    }

    const ownership = await resolveEventfullOwnership(eventId);
    if (!ownership) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!canVetEvent(caller, ownership)) {
      return NextResponse.json({ error: 'Not authorized to vet this event' }, { status: 403 });
    }

    await clearVettingCache(eventId);
    logMessage(`Cache cleared for event ${eventId}`);

    const supabase = createClient();
    const { data: event, error } = await supabase
      .from('eventfull_events')
      .select('id, name, location_data, start_date')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      logError('Event not found:', error);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const locationData = event.location_data as {
      lat?: number;
      lng?: number;
      address?: string;
    } | null;
    const vettingRequest: EventVettingRequest = {
      eventId: event.id,
      eventName: event.name,
      location: {
        lat: locationData?.lat ?? 0,
        lng: locationData?.lng ?? 0,
        address: locationData?.address ?? '',
      },
      date: event.start_date,
    };

    const result = await vetEvent(vettingRequest);
    await setCachedVetting(eventId, result);

    return NextResponse.json({
      result,
      cached: false,
      generatedAt: new Date().toISOString(),
      refreshed: true,
    });
  } catch (error) {
    logError('Error in vetting POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleExternalPost(eventId: string, caller: VettingCaller): Promise<Response> {
  const built = await buildExternalVettingRequest(eventId);
  if (!built) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (!canVetEvent(caller, built.ownership)) {
    return NextResponse.json({ error: 'Not authorized to vet this event' }, { status: 403 });
  }

  if (!built.request) {
    return built.errorResponse ?? NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  await clearExternalDbCache(eventId);

  const result = await vetEvent(built.request);
  await saveVettingResult(eventId, 'external', result);

  const row: EventIdentityRow = {
    id: built.request.eventId,
    title: built.request.eventName,
    city: built.request.city ?? null,
    state: built.request.state ?? null,
    event_start_date: built.request.date,
  };
  const targets = buildVettingEligibilityTargets(row, built.priorVettingScore, null);
  if (targets.length > 0) {
    invalidateEventCacheTargets(targets);
  }

  return NextResponse.json({
    result,
    cached: false,
    source: 'external',
    generatedAt: new Date().toISOString(),
    refreshed: true,
  });
}

export const GET = handleGet;
export const POST = handlePost;
