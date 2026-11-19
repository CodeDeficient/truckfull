/**
 * API Route: Track Analytics Event
 *
 * Records user engagement events for truck analytics.
 * Public endpoint (no auth required for tracking).
 *
 * @module app/api/analytics/track/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logDebug, logError } from '@/lib/logging';
import { rateLimitEndpoint } from '@/lib/middleware/rateLimit';

const TrackEventSchema = z.object({
  truckId: z.string().uuid(),
  eventType: z.enum([
    'view',
    'click_menu',
    'click_directions',
    'favorite',
    'share',
    'call',
    'website',
  ]),
  metadata: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting (prevent spam)
    const { success } = await rateLimitEndpoint('analytics-track', req);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json();
    const validation = TrackEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { truckId, eventType, metadata } = validation.data;

    const supabase = getSupabase();

    // SECURITY: Verify truck exists and check ownership
    const { data: truck, error: truckError } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('id, is_claimed, owner_id')
      .eq('id', truckId)
      .single();

    if (truckError || !truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }

    // Get user ID from auth header if present (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser(authHeader.slice(7));
        userId = user?.id ?? null;
      } catch {
        // Ignore auth errors for analytics - continue anonymously
      }
    }

    // SECURITY: Prevent authenticated users from injecting events for claimed trucks they don't own
    // This prevents "data poisoning" attacks where an attacker inflates competitor analytics
    // Anonymous tracking is still allowed (for legitimate page views)
    // Owner tracking is allowed (for their own truck)
    if (truck.is_claimed && userId && truck.owner_id !== userId) {
      logDebug(
        `Blocked analytics injection attempt: user ${userId} tried to track event for truck ${truckId} owned by ${truck.owner_id}`,
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Insert event
    const { error: insertError } = await supabase.from('analytics_events').insert({
      truck_id: truckId,
      user_id: userId,
      event_type: eventType,
      metadata: metadata || {},
    });

    if (insertError) {
      logError('Failed to insert analytics event:', insertError);
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
    }

    logDebug(`Tracked ${eventType} event for truck ${truckId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Unexpected error in analytics track:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
