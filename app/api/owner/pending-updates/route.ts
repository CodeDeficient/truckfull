/**
 * Pending Updates API - List
 * WBS: 3.4.2
 *
 * GET: List pending updates for the owner's trucks
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage } from '@/lib/logging';

export async function GET() {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user's trucks
    const { data: trucks, error: trucksError } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('id, name')
      .eq('owner_id', user.id);

    if (trucksError) {
      logError('Error fetching owner trucks:', trucksError);
      return NextResponse.json({ error: 'Failed to fetch trucks' }, { status: 500 });
    }

    if (!trucks || trucks.length === 0) {
      return NextResponse.json({ updates: [] });
    }

    const truckIds = trucks.map((t) => t.id);
    const truckMap = Object.fromEntries(trucks.map((t) => [t.id, t.name]));

    // Fetch pending updates for owner's trucks
    const { data: updates, error: updatesError } = await supabase
      .from('pending_updates')
      .select('*')
      .in('truck_id', truckIds)
      .order('created_at', { ascending: false });

    if (updatesError) {
      logError('Error fetching pending updates:', updatesError);
      return NextResponse.json({ error: 'Failed to fetch updates' }, { status: 500 });
    }

    // Enrich with truck names
    const enrichedUpdates = (updates ?? []).map((update) => ({
      ...update,
      truck_name: truckMap[update.truck_id] || 'Unknown Truck',
    }));

    logMessage(`Fetched ${enrichedUpdates.length} pending updates for owner ${user.id}`);

    return NextResponse.json({ updates: enrichedUpdates });
  } catch (error) {
    logError('Error in pending-updates GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
