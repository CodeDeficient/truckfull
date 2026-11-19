import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/authHelpers';
import { logError } from '@/lib/logging';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const hasAdminAccess = await verifyAdminAccess(request);

  if (!hasAdminAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('verify_radius_status').single();
    if (error) {
      logError('Failed to verify radius status:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    return NextResponse.json({ status: data ?? undefined }, { status: 200 });
  } catch (error) {
    logError('Failed to verify radius status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
