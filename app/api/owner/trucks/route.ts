import { NextResponse } from 'next/server';
import { logError } from '@/lib/logging';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listOwnerTrucks } from '@/lib/services/ownerTrucks.server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const {
    data: { user },
    error: authError,
  } = await createServerSupabaseClient().auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    return NextResponse.json({ trucks: await listOwnerTrucks(user.id) });
  } catch (error) {
    logError('Owner truck list failed:', error);
    return NextResponse.json({ error: 'Failed to load trucks' }, { status: 500 });
  }
}
