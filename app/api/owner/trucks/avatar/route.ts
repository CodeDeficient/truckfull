import { type NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logging';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isOwnAvatarUrl, setOwnerTruckPhotos } from '@/lib/services/ownerTrucks.server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const {
    data: { user },
    error: authError,
  } = await createServerSupabaseClient().auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const url = body?.url;
  if (typeof url !== 'string' || url.length > 2048 || !isOwnAvatarUrl(url, user.id)) {
    return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
  }
  try {
    return NextResponse.json({ updated: await setOwnerTruckPhotos(user.id, url) });
  } catch (error) {
    logError('Owner truck avatar sync failed:', error);
    return NextResponse.json({ error: 'Failed to update truck photos' }, { status: 500 });
  }
}
