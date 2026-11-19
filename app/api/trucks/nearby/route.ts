import { type NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logging';
import { searchNearbyTrucks } from '@/lib/api/trucks/cachedNearbySearch';
import { DEFAULT_SEARCH_RADIUS_MILES, capRadiusMiles } from '@/lib/api/trucks/radiusLimits';
import { isSignedInRequest } from '@/lib/auth/signedInViewer.server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const json = (await request.json().catch(() => ({}))) as unknown;
    const body =
      typeof json === 'object' && json != undefined ? (json as Record<string, unknown>) : {};

    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const requestedRadiusMiles = Number(body.radiusMiles) || DEFAULT_SEARCH_RADIUS_MILES;

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(requestedRadiusMiles) ||
      requestedRadiusMiles <= 0
    ) {
      return NextResponse.json(
        { error: 'Invalid parameters: lat, lng, and radiusMiles are required' },
        { status: 400 },
      );
    }

    const radiusMiles = capRadiusMiles(requestedRadiusMiles, await isSignedInRequest());

    const trucks = await searchNearbyTrucks(lat, lng, radiusMiles);

    return NextResponse.json(
      {
        trucks,
        totalCount: trucks.length,
        radiusMiles,
        cached: false,
      },
      { status: 200 },
    );
  } catch (error) {
    logError('nearby route error', error);
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
