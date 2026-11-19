/**
 * Admin Search Unclaimed Trucks API
 *
 * GET: Search for trucks that are NOT claimed (no owner_id)
 * Used by the invite owners page to find trucks to send invites for.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse search params
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') || '';
    const limit = Number.parseInt(searchParams.get('limit') || '20');

    if (!search || search.length < 2) {
      return NextResponse.json({ trucks: [], message: 'Enter at least 2 characters to search' });
    }

    // Use admin client to bypass RLS
    const adminClient = getSupabaseAdmin();

    // Search for UNCLAIMED trucks only (owner_id is NULL or is_claimed is FALSE)
    const { data: trucks, error } = await adminClient
      .from('food_trucks')
      .select('id, name, cuisine_type, city, state, contact_info, is_claimed, owner_id')
      .or(`owner_id.is.null,is_claimed.eq.false`)
      .ilike('name', `%${search}%`)
      .order('name')
      .limit(limit);

    if (error) {
      logError('Error searching unclaimed trucks:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Also check if there are any pending invites for these trucks
    const truckIds = trucks?.map((t) => t.id) || [];
    const { data: pendingInvites } = await adminClient
      .from('pending_invites')
      .select('truck_id, email, expires_at')
      .in('truck_id', truckIds)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString());

    // Map pending invites to trucks
    const inviteMap = new Map<string, { email: string; expires_at: string }>();
    if (pendingInvites)
      for (const inv of pendingInvites) {
        if (inv.truck_id) {
          inviteMap.set(inv.truck_id, { email: inv.email, expires_at: inv.expires_at });
        }
      }

    // Enrich truck data with invite status
    const enrichedTrucks = trucks?.map((truck) => ({
      ...truck,
      pending_invite: inviteMap.get(truck.id) || null,
    }));

    return NextResponse.json({
      trucks: enrichedTrucks,
      total: enrichedTrucks?.length || 0,
    });
  } catch (error) {
    logError('Error in unclaimed trucks search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
