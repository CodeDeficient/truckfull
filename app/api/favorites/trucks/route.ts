import { NextResponse } from 'next/server';
import { logError } from '@/lib/logging';
import { getRequestUserId } from '@/lib/auth/requestUser.server';
import { listFavoriteTrucks } from '@/lib/services/favoriteTrucks.server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const userId = await getRequestUserId();
  if (userId === null) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    return NextResponse.json({ trucks: await listFavoriteTrucks(userId) });
  } catch (error) {
    logError('Favorite truck list failed:', error);
    return NextResponse.json({ error: 'Failed to load favorites' }, { status: 500 });
  }
}
