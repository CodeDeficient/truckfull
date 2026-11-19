import { NextRequest } from 'next/server';
import { verifyRoleFromCookies } from '@/lib/auth/authHelpers';
import { FoodTruckService } from '@/lib/supabase/services/foodTruckService';
import type { FoodTruck } from '@/lib/supabase/types';
import { logDebug, logError } from '@/lib/logging';
import { invalidatePublicTruckBySlug } from '@/lib/services/publicTruckPage';

// Ensure Node.js lambda on Vercel
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Verify the user has the required role
    const { ok, userId, role } = await verifyRoleFromCookies(['food_truck_owner', 'admin']);

    if (!ok) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse the request body
    const body = await request.json();

    // Validate operation type
    const operation = body.operation || 'update'; // 'update', 'go_live', 'close_shop', 'set_default'

    // For go_live and set_default operations, coordinates are required
    if (['go_live', 'set_default', 'update'].includes(operation)) {
      if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
        return Response.json({ error: 'Latitude and longitude are required' }, { status: 400 });
      }

      // Validate coordinates are within reasonable bounds
      if (body.lat < -90 || body.lat > 90 || body.lng < -180 || body.lng > 180) {
        return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
      }
    }

    // Check if the user owns this truck (if not an admin)
    if (role !== 'admin') {
      const truck = await FoodTruckService.getTruckById(id);

      if ('error' in truck) {
        return Response.json({ error: 'Truck not found' }, { status: 404 });
      }

      if (truck.owner_id !== userId) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    logDebug(`[API] Updating truck ${id} with operation: ${operation}`, {
      lat: body.lat,
      lng: body.lng,
      address: body.address,
      accuracy: body.accuracy,
      userId,
      role,
    });

    // Update the truck location using the service with operation type
    const updatedTruck = await FoodTruckService.updateTruckLocation(
      id,
      body.lat,
      body.lng,
      operation,
      body.address,
      body.accuracy,
    );

    if ('error' in updatedTruck) {
      logError(`[API] Error updating truck ${id}:`, updatedTruck.error);
      return Response.json({ error: updatedTruck.error }, { status: 500 });
    }

    const truck = updatedTruck as FoodTruck;
    logDebug(`[API] Successfully updated truck ${id}`, {
      status: truck.status,
      current_location: truck.current_location,
    });

    if (truck.slug) {
      invalidatePublicTruckBySlug(truck.slug);
    }

    return Response.json(updatedTruck);
  } catch (error) {
    logError('Error updating truck location:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Verify the user has the required role
    const { ok, userId, role } = await verifyRoleFromCookies(['food_truck_owner', 'admin']);

    if (!ok) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if the user owns this truck (if not an admin)
    if (role !== 'admin') {
      const truck = await FoodTruckService.getTruckById(id);

      if ('error' in truck) {
        return Response.json({ error: 'Truck not found' }, { status: 404 });
      }

      if (truck.owner_id !== userId) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Get the truck with its current location
    const truck = await FoodTruckService.getTruckById(id);

    if ('error' in truck) {
      return Response.json({ error: 'Truck not found' }, { status: 404 });
    }

    // Return location information including status and both location types
    return Response.json({
      id: truck.id,
      status: truck.status || 'offline',
      current_location: truck.current_location, // Backwards compatibility
      default_location: truck.default_location,
      live_location: truck.live_location,
      updated_at: truck.updated_at,
    });
  } catch (error) {
    logError('Error fetching truck location:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
