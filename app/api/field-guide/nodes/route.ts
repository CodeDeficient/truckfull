/**
 * Field Guide API - Get nearby traffic nodes
 *
 * Returns traffic nodes within a radius of a given location.
 * Used for the Field Guide map overlay and top locations list.
 *
 * Tier access:
 * - Free: Cannot access (returns 403)
 * - Pro: Up to 1000 nodes + foot traffic access
 * - Enterprise: Up to 40,000 nodes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkTierAccess } from '@/lib/auth/tierMiddleware';
import { checkRateLimited, locationLimiter, getClientIp } from '@/lib/middleware/rateLimit';
import {
  getBoundingBox,
  processTrafficNodeRows,
  computeAreaStats,
  type TrafficNodeRow,
  type NearbyTrafficNode,
} from '@/lib/traffic/nearbyTrafficNodes';
import { z } from 'zod';

const FIELD_GUIDE_DEFAULT_RADIUS_METERS = 8047; // 5 miles
const FIELD_GUIDE_MAX_RADIUS_METERS = 482_803; // 300 miles
const TRAFFIC_NODE_PAGE_SIZE = 5000;
const TRAFFIC_NODE_FETCH_LIMIT = 100_000;

const querySchema = z.object({
  lat: z.string().transform(Number).pipe(z.number().min(-90).max(90)),
  lng: z.string().transform(Number).pipe(z.number().min(-180).max(180)),
  radius: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : FIELD_GUIDE_DEFAULT_RADIUS_METERS))
    .pipe(z.number().min(100).max(FIELD_GUIDE_MAX_RADIUS_METERS)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 1000))
    .pipe(z.number().min(1).max(40_000)), // Default 1k, max 40k
});

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const rateLimitResult = await checkRateLimited(`field-guide-nodes:${ip}`, locationLimiter);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } },
    );
  }

  // Parse query parameters
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parseResult = querySchema.safeParse(searchParams);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', details: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { lat, lng, radius, limit } = parseResult.data;

  // Check tier access - admins have full access to all Pro features
  const tierCheck = await checkTierAccess(request, ['pro', 'enterprise']);

  // Get user role and admin status in one query
  let isAdmin = false;

  if (tierCheck.userId) {
    const supabase = await import('@/lib/supabase/server').then((m) =>
      m.createServerSupabaseClient(),
    );
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_tier')
      .eq('id', tierCheck.userId)
      .single();

    isAdmin = profile?.role === 'admin';

    // Admins override tier restrictions - give them full access
    if (isAdmin) {
      tierCheck.allowed = true;
      tierCheck.tier = 'enterprise'; // Treat admins as enterprise tier
    }
  }

  if (!tierCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Upgrade required',
        message: 'Field Guide is available for Pro and Enterprise tiers',
        upgradeTarget: 'pro',
      },
      { status: 403 },
    );
  }

  // Tier-based limit enforcement (paid tiers + admins)
  let effectiveLimit: number;
  switch (tierCheck.tier) {
    case 'pro': {
      effectiveLimit = Math.min(limit, 1000);

      break;
    }
    case 'enterprise': {
      effectiveLimit = Math.min(limit, 40_000);

      break;
    }
    default: {
      effectiveLimit = Math.min(limit, 1000);
    }
  }

  try {
    const supabase = getSupabaseAdmin();

    const bounds = getBoundingBox(lat, lng, radius);

    let state = {
      topNodes: [] as NearbyTrafficNode[],
      stationCount: 0,
      sumAadt: 0,
      maxAadt: 0,
      sumPercentile: 0,
      percentileCount: 0,
      fetchedRowCount: 0,
    };
    let truncated = false;

    for (let offset = 0; offset < TRAFFIC_NODE_FETCH_LIMIT; offset += TRAFFIC_NODE_PAGE_SIZE) {
      const { data, error } = await (supabase
        .from('traffic_nodes')
        .select('id, station_id, aadt, lat, lng, location_description, score_percentile')
        .eq('is_accessible', true)
        .gte('lat', bounds.minLat)
        .lte('lat', bounds.maxLat)
        .gte('lng', bounds.minLng)
        .lte('lng', bounds.maxLng)
        .order('id', { ascending: true })
        .range(offset, offset + TRAFFIC_NODE_PAGE_SIZE - 1) as unknown as Promise<{
        data: TrafficNodeRow[] | null;
        error: { message: string } | null;
      }>);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch traffic nodes' }, { status: 500 });
      }

      const pageRows = data ?? [];
      state = processTrafficNodeRows(pageRows, lat, lng, radius, effectiveLimit, state);

      if (pageRows.length < TRAFFIC_NODE_PAGE_SIZE) {
        break;
      }
    }

    if (state.fetchedRowCount >= TRAFFIC_NODE_FETCH_LIMIT) {
      const { data: overflowRows, error: overflowError } = await (supabase
        .from('traffic_nodes')
        .select('id')
        .eq('is_accessible', true)
        .gte('lat', bounds.minLat)
        .lte('lat', bounds.maxLat)
        .gte('lng', bounds.minLng)
        .lte('lng', bounds.maxLng)
        .order('id', { ascending: true })
        .range(TRAFFIC_NODE_FETCH_LIMIT, TRAFFIC_NODE_FETCH_LIMIT) as unknown as Promise<{
        data: { id: string }[] | null;
        error: { message: string } | null;
      }>);

      if (overflowError) {
        return NextResponse.json({ error: 'Failed to fetch traffic nodes' }, { status: 500 });
      }

      truncated = (overflowRows?.length ?? 0) > 0;
    }

    const limited = truncated || state.stationCount > effectiveLimit;
    const areaStats = computeAreaStats(
      state.stationCount,
      state.sumAadt,
      state.maxAadt,
      state.sumPercentile,
      state.percentileCount,
    );

    return NextResponse.json(
      {
        tier: tierCheck.tier,
        area_stats: areaStats,
        nodes: state.topNodes,
        count: state.topNodes.length,
        truncated,
        limited,
        query: { lat, lng, radius, limit: effectiveLimit },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'CDN-Cache-Control': 'public, max-age=3600',
          'Vercel-CDN-Cache-Control': 'public, max-age=3600',
        },
      },
    );
  } catch (error) {
    console.error('Field guide error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
