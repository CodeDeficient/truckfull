import { type NextRequest, NextResponse } from 'next/server';
import { verifyRoleFromCookies } from '@/lib/auth/authHelpers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  isValidTimezone,
  isValidServiceDate,
  isOvernightTimeRange,
  writeScheduleOverride,
  type OverrideLocation,
} from '@/lib/services/scheduleOverride';
import {
  invalidatePublicTruckBySlug,
  invalidatePublicTruckSearchCaches,
} from '@/lib/services/publicTruckPage';

interface CloseDateRequest {
  readonly truck_id?: string;
  readonly service_date?: string;
}

interface EditDateRequest extends CloseDateRequest {
  readonly start_time?: string;
  readonly end_time?: string;
  readonly location_data?: OverrideLocation | null;
}

async function getOwnedTruck(
  truckId: string,
  userId: string,
  role: string,
): Promise<{ id: string; owner_id: string | null; timezone: string; slug: string | null } | NextResponse> {
  const { data: truck, error } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('id, owner_id, timezone, slug')
    .eq('id', truckId)
    .single();

  if (error || !truck) return NextResponse.json({ error: 'Food truck not found' }, { status: 404 });
  if (role !== 'admin' && userId !== truck.owner_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!truck.timezone || !isValidTimezone(truck.timezone)) {
    return NextResponse.json({ error: 'Truck timezone is invalid' }, { status: 400 });
  }
  return {
    id: truck.id,
    owner_id: truck.owner_id,
    timezone: truck.timezone,
    slug: truck.slug,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await verifyRoleFromCookies(['food_truck_owner', 'admin']);
  if (!authResult.ok || !authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CloseDateRequest;
    const truckId = body.truck_id?.trim();
    const serviceDate = body.service_date?.trim();
    if (!truckId || !serviceDate || !isValidServiceDate(serviceDate)) {
      return NextResponse.json({ error: 'truck_id and service_date are required' }, { status: 400 });
    }

    const truck = await getOwnedTruck(truckId, authResult.userId ?? '', authResult.role ?? '');
    if (truck instanceof NextResponse) return truck;

    const result = await writeScheduleOverride(getSupabaseAdmin(), {
      truckId,
      shape: {
        serviceDate,
        isClosed: true,
        isAllDay: false,
        startTime: null,
        endTime: null,
        endsNextDay: false,
        location: null,
      },
      source: 'manual',
      sourcePostId: null,
      timezone: truck.timezone,
      now: new Date().toISOString(),
    });

    if (!result.success) return NextResponse.json({ error: result.error ?? 'Unable to close date' }, { status: 400 });
    if (truck.slug) invalidatePublicTruckBySlug(truck.slug);
    invalidatePublicTruckSearchCaches();
    return NextResponse.json({ success: true, slug: truck.slug });
  } catch {
    return NextResponse.json({ error: 'Unable to close date' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const authResult = await verifyRoleFromCookies(['food_truck_owner', 'admin']);
  if (!authResult.ok || !authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as EditDateRequest;
    const truckId = body.truck_id?.trim();
    const serviceDate = body.service_date?.trim();
    if (!truckId || !serviceDate || !isValidServiceDate(serviceDate)) {
      return NextResponse.json({ error: 'truck_id and service_date are required' }, { status: 400 });
    }
    if (!body.start_time || !body.end_time) {
      return NextResponse.json({ error: 'start_time and end_time are required' }, { status: 400 });
    }

    const truck = await getOwnedTruck(truckId, authResult.userId ?? '', authResult.role ?? '');
    if (truck instanceof NextResponse) return truck;
    // Attach map coordinates to the dated stop when the request carries a
    // concrete address; failure keeps the words-only value and never blocks.
    const { enrichOverrideLocation } = await import('@/lib/services/overrideLocationEnrichment');
    const { geocodeAddress } = await import('@/lib/utils/geocoding');
    const requestedLocation = body.location_data ?? null;
    const enriched = requestedLocation
      ? await enrichOverrideLocation(requestedLocation, geocodeAddress)
      : null;
    const result = await writeScheduleOverride(getSupabaseAdmin(), {
      truckId,
      shape: {
        serviceDate,
        isClosed: false,
        isAllDay: false,
        startTime: body.start_time,
        endTime: body.end_time,
        endsNextDay: isOvernightTimeRange(body.start_time, body.end_time),
        location: enriched,
      },
      source: 'manual',
      sourcePostId: null,
      timezone: truck.timezone,
      now: new Date().toISOString(),
    });

    if (!result.success) return NextResponse.json({ error: result.error ?? 'Unable to save date' }, { status: 400 });
    if (truck.slug) invalidatePublicTruckBySlug(truck.slug);
    invalidatePublicTruckSearchCaches();
    return NextResponse.json({ success: true, slug: truck.slug });
  } catch {
    return NextResponse.json({ error: 'Unable to save date' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = await verifyRoleFromCookies(['food_truck_owner', 'admin']);
  if (!authResult.ok || !authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CloseDateRequest;
    const truckId = body.truck_id?.trim();
    const serviceDate = body.service_date?.trim();
    if (!truckId || !serviceDate || !isValidServiceDate(serviceDate)) {
      return NextResponse.json({ error: 'truck_id and service_date are required' }, { status: 400 });
    }

    const truck = await getOwnedTruck(truckId, authResult.userId ?? '', authResult.role ?? '');
    if (truck instanceof NextResponse) return truck;
    const admin = getSupabaseAdmin();
    const deleteQuery = admin
      .from('food_truck_schedule_overrides')
      .delete()
      .eq('food_truck_id', truckId)
      .eq('service_date', serviceDate);
    const { data: deleted, error } = authResult.role === 'admin'
      ? await deleteQuery.select('id')
      : await deleteQuery.neq('source_type', 'admin').select('id');

    if (error) return NextResponse.json({ error: 'Unable to remove date-specific schedule' }, { status: 500 });
    if (authResult.role !== 'admin' && deleted.length === 0) {
      const { data: existing, error: lookupError } = await admin
        .from('food_truck_schedule_overrides')
        .select('source_type')
        .eq('food_truck_id', truckId)
        .eq('service_date', serviceDate)
        .maybeSingle();
      if (lookupError) return NextResponse.json({ error: 'Unable to verify date-specific schedule' }, { status: 500 });
      if (existing?.source_type === 'admin') {
        return NextResponse.json({ error: 'Admin date-specific schedules require admin removal' }, { status: 403 });
      }
      return NextResponse.json({ success: true, slug: truck.slug });
    }
    if (truck.slug) invalidatePublicTruckBySlug(truck.slug);
    invalidatePublicTruckSearchCaches();
    return NextResponse.json({ success: true, slug: truck.slug });
  } catch {
    return NextResponse.json({ error: 'Unable to remove date-specific schedule' }, { status: 500 });
  }
}
