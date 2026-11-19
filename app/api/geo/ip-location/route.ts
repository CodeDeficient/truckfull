import { type NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logging';
import { resolveRequestLocation } from '@/lib/location/requestGeo';
import { REGION_FALLBACK } from '@/lib/utils/geocoding';

const FALLBACK_LOCATION = {
  lat: REGION_FALLBACK.lat,
  lng: REGION_FALLBACK.lng,
  city: 'Augusta',
  country: 'US',
};

export async function GET(request: NextRequest) {
  try {
    const resolved = resolveRequestLocation(request.headers);
    if (resolved) {
      return NextResponse.json(resolved);
    }

    // Fallback for local development or when the edge cannot resolve a location
    return NextResponse.json({
      ...FALLBACK_LOCATION,
      source: 'fallback',
    });
  } catch (error) {
    // On any error, return fallback location
    logError('IP geolocation error:', error);
    return NextResponse.json({
      ...FALLBACK_LOCATION,
      source: 'fallback-error',
    });
  }
}
