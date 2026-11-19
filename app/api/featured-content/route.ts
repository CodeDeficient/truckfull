import { type NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logging';
import { getFeaturedContentLists } from '@/lib/supabase/services/featuredContentService';
import { capRadiusMiles } from '@/lib/api/trucks/radiusLimits';
import { isSignedInRequest } from '@/lib/auth/signedInViewer.server';

const DEFAULT_RADIUS_MILES = 30;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const requestedRadiusMiles = Number.parseFloat(
    searchParams.get('radius') ?? String(DEFAULT_RADIUS_MILES),
  );

  if (!Number.isFinite(requestedRadiusMiles) || requestedRadiusMiles <= 0) {
    return NextResponse.json({ error: 'Radius must be a positive number' }, { status: 400 });
  }

  const radiusMiles = capRadiusMiles(requestedRadiusMiles, await isSignedInRequest());

  const hasLocation = (lat != null && lat.length > 0) && (lng != null && lng.length > 0);
  if (!hasLocation) {
    try {
      const content = await getFeaturedContentLists(undefined, radiusMiles);
      return NextResponse.json(content);
    } catch (error) {
      logError('Error in featured-content GET:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  const userLat = Number.parseFloat(lat ?? '');
  const userLng = Number.parseFloat(lng ?? '');
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    return NextResponse.json({ error: 'Invalid location parameters' }, { status: 400 });
  }

  if (Math.abs(userLat) > 90 || Math.abs(userLng) > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  try {
    const content = await getFeaturedContentLists({ lat: userLat, lng: userLng }, radiusMiles);
    return NextResponse.json(content);
  } catch (error) {
    logError('Error in featured-content GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
