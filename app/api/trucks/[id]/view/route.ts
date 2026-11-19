import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import { detailLimiter, getClientIp } from '@/lib/middleware/rateLimit';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Truck ID is required' }, { status: 400 });
    }

    // Rate limiting check
    const ip = getClientIp(request);
    const { success } = await detailLimiter.limit(`${ip}_view_${id}`);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = getSupabaseAdmin();

    // Call the RPC function to increment view count
    const { error } = await supabase.rpc('increment_truck_view', {
      p_truck_id: id,
    });

    if (error) {
      logError('Failed to increment view count via RPC', error);
      return NextResponse.json({ error: 'Failed to increment view' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Error tracking view:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
