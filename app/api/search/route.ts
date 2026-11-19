export const dynamic = 'force-dynamic'; // Force dynamic rendering for this route

import { type NextRequest, NextResponse } from 'next/server';
import { processSearchRequest } from '@/lib/api/search/helpers';
import { logError } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    // Check for mobile context
    const isMobile = request.headers.get('x-is-mobile-device') === 'true';
    const isMobileRoute = request.headers.get('x-mobile-route-redirected') === 'true';

    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q');
    const cuisine = searchParams.get('cuisine');
    const openNow = searchParams.get('openNow') === 'true';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');

    // For mobile, potentially adjust default parameters
    const adjustedRadius =
      isMobile || isMobileRoute
        ? radius || '5' // Default to 5 miles for mobile if not specified
        : radius || '10'; // Default to 10 miles for desktop if not specified

    const response = await processSearchRequest({
      query,
      cuisine,
      openNow,
      lat,
      lng,
      radius: adjustedRadius,
    });

    // If mobile context, potentially modify the response
    if (isMobile || isMobileRoute) {
      const responseBody = await response.json();

      // Create a new response with mobile-optimized data
      return NextResponse.json(
        {
          ...responseBody,
          mobileOptimized: true,
          isMobile: true,
          originalRadius: radius,
          adjustedRadius: adjustedRadius,
        },
        {
          status: response.status,
          headers: response.headers,
        },
      );
    }

    return response;
  } catch (error) {
    logError('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
