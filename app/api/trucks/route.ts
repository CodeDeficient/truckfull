import { type NextRequest, NextResponse } from 'next/server';
import { withAuthValidation } from '@/lib/middleware/withAuth';
import {
  handleGetTruckById,
  handleGetTrucksByLocation,
  handlePostTruck,
  handlePutTruck,
  handleGetTruckByIdWithEvents,
} from '@/lib/api/trucks/handlers';
import { CreateFoodTruckSchema, UpdateFoodTruckSchema } from '@/lib/validation/schemas/v1/api';
import { logError } from '@/lib/logging';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { invalidatePublicTruckBySlug } from '@/lib/services/publicTruckPage';
import { DEFAULT_SEARCH_RADIUS_MILES } from '@/lib/api/trucks/radiusLimits';
import { isSignedInRequest } from '@/lib/auth/signedInViewer.server';

// This route handles location-based and user-specific data,
// so it needs to remain dynamic but we can optimize mobile detection
export const dynamic = 'force-dynamic'; // Required because it handles location/truck data that can't be pre-rendered

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') ?? String(DEFAULT_SEARCH_RADIUS_MILES);

  // Check for mobile context
  const isMobile = request.headers.get('x-is-mobile-device') === 'true';
  const isMobileRoute = request.headers.get('x-mobile-route-redirected') === 'true';

  // Apply basic rate limiting for GET requests (public endpoints) - simplified approach
  // In a real production environment you would implement proper rate limiting middleware

  // For mobile devices, we might want to return a more optimized response
  try {
    const includeEvents = searchParams.get('includeEvents') === 'true';

    if (id != undefined && id.length > 0) {
      const response = await (includeEvents
        ? handleGetTruckByIdWithEvents(id)
        : handleGetTruckById(id));

      // If mobile context, we might want to add mobile-specific data or optimize response
      if (
        (isMobile || isMobileRoute) && // Add mobile-specific optimizations or data
        response.status === 200
      ) {
        const responseBody = await response.json();
        // Add mobile-specific fields if necessary
        return NextResponse.json(
          {
            ...responseBody,
            isMobileOptimized: true,
          },
          { status: response.status },
        );
      }

      return response;
    }

    if (lat != undefined && lat.length > 0 && lng != undefined && lng.length > 0) {
      const response = await handleGetTrucksByLocation(
        lat,
        lng,
        radius,
        await isSignedInRequest(),
      );

      // For mobile, potentially limit results or add mobile-specific data
      if ((isMobile || isMobileRoute) && response.status === 200) {
        const responseBody = await response.json();
        // Optimize for mobile: potentially limit results, add mobile-specific data
        const optimizedTrucks = Array.isArray(responseBody.trucks)
          ? responseBody.trucks.map((truck: Record<string, unknown>) => ({
              ...truck,
              mobileOptimized: true,
              // Add any mobile-specific fields here
            }))
          : responseBody;

        return NextResponse.json(
          {
            trucks: optimizedTrucks,
            isMobileOptimized: true,
          },
          { status: response.status },
        );
      }

      return response;
    }

    return NextResponse.json(
      { error: 'Provide an id, or lat and lng, to look up trucks' },
      { status: 400 },
    );
  } catch (error: unknown) {
    logError('Error in trucks GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Use authentication validation for POST requests
export const POST = withAuthValidation(
  CreateFoodTruckSchema,
  async (request: NextRequest, _params, user, validatedData) => {
    // Check for mobile context
    const isMobile = request.headers.get('x-is-mobile-device') === 'true';

    // Only allow food truck owners and admins to create trucks
    if (user.role !== 'food_truck_owner' && user.role !== 'admin') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          details: 'Only food truck owners and administrators can create trucks',
        },
        { status: 403 },
      );
    }

    const response = await handlePostTruck(validatedData);
    const responseBody = response.ok
      ? await response.clone().json() as Record<string, unknown>
      : null;

    if (responseBody) {
      const createdSlug = (responseBody.truck as Record<string, unknown> | undefined)?.slug as
        | string
        | undefined;
      if (createdSlug) {
        invalidatePublicTruckBySlug(createdSlug);
      }
    }

    // If mobile context, potentially modify response
    if (isMobile && responseBody) {
      return NextResponse.json(
        {
          ...responseBody,
          mobileCreated: true,
          isMobileOptimized: true,
        },
        { status: response.status },
      );
    }

    return response;
  },
  {
    requiredRoles: ['food_truck_owner', 'admin'],
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // Limit to 10 truck creations per 15 minutes per user
    },
  },
);

// Use authentication validation for PUT requests
export const PUT = withAuthValidation(
  UpdateFoodTruckSchema,
  async (
    request: NextRequest,
    _params,
    user,
    validatedData: { [x: string]: unknown; id: unknown },
  ) => {
    // Check for mobile context
    const isMobile = request.headers.get('x-is-mobile-device') === 'true';

    // Destructure the validated data
    const { id, ...updates } = validatedData;

    // Check if user can edit this truck
    const { data: truck, error } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('owner_id')
      .eq('id', typeof id === 'string' ? id : '')
      .single();

    if (error || !truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }

    // Only allow the owner, admin or superadmin to update the truck
    if (
      (user as { id: string }).id !== truck.owner_id &&
      (user as { role: string }).role !== 'admin'
    ) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          details: 'Only the truck owner or administrators can update this truck',
        },
        { status: 403 },
      );
    }

    const truckId = typeof id === 'string' ? id : '';

    const canChangeSlug = 'slug' in updates || 'name' in updates;
    const { data: oldTruck } = canChangeSlug
      ? await getSupabaseAdmin()
          .from('food_trucks')
          .select('slug')
          .eq('id', truckId)
          .single()
      : { data: null };

    const response = await handlePutTruck(truckId, updates);

    if (response.status === 200) {
      const responseBody = await response.clone().json() as Record<string, unknown>;
      const newSlug = (responseBody?.truck as Record<string, unknown> | undefined)?.slug as string | undefined;
      const oldSlug = oldTruck?.slug;
      if (newSlug) {
        invalidatePublicTruckBySlug(newSlug);
      }
      if (oldSlug && oldSlug !== newSlug) {
        invalidatePublicTruckBySlug(oldSlug);
      }

      // If mobile context, potentially modify response
      if (isMobile) {
        return NextResponse.json(
          {
            ...responseBody,
            mobileUpdated: true,
            isMobileOptimized: true,
          },
          { status: 200 },
        );
      }

      return response;
    }

    return response;
  },
  {
    requiredRoles: ['food_truck_owner', 'admin'],
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 20, // Limit to 20 truck updates per 15 minutes per user
    },
  },
);
