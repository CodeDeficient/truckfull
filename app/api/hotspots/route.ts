/**
 * Hotspots API
 * WBS: 4.2.1
 *
 * GET: List active hotspots for Pro tier owners
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';

export async function GET() {
  try {
    const supabase = createClient();

    // Verify auth and Pro tier
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is Pro tier (subscription_tier is in profiles table, not food_trucks)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || profile.subscription_tier !== 'pro') {
      return NextResponse.json(
        {
          error: 'Hotspots are a Pro tier feature',
          upgrade_required: true,
        },
        { status: 403 },
      );
    }

    // Get all trucks owned by user for reservation checking
    const { data: trucks } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('id')
      .eq('owner_id', user.id);

    const truckIds = new Set((trucks ?? []).map((t) => t.id));

    // Fetch active hotspots
    const { data: hotspots, error: hotspotsError } = await supabase
      .from('hotspots')
      .select(
        `
        id, lat, lng, traffic_score, expires_at,
        hotspot_reservations!left(truck_id, status)
      `,
      )
      .eq('is_active', true)
      .order('traffic_score', { ascending: false });

    if (hotspotsError) {
      logError('Error fetching hotspots:', hotspotsError);
      return NextResponse.json({ error: 'Failed to fetch hotspots' }, { status: 500 });
    }

    // Transform to include reservation status
    const enrichedHotspots = (hotspots ?? []).map((h) => {
      const reservations = (h.hotspot_reservations as { truck_id: string; status: string }[]) ?? [];
      const activeReservation = reservations.find((r) => r.status === 'active');

      return {
        id: h.id,
        lat: h.lat,
        lng: h.lng,
        traffic_score: h.traffic_score,
        expires_at: h.expires_at,
        is_reserved: !!activeReservation,
        reserved_by_me: activeReservation ? truckIds.has(activeReservation.truck_id) : false,
      };
    });

    return NextResponse.json({ hotspots: enrichedHotspots });
  } catch (error) {
    logError('Error in hotspots GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
