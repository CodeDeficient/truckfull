import { type NextRequest, NextResponse } from 'next/server';
import { verifyRoleFromCookies } from '@/lib/auth/authHelpers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isValidServiceDate } from '@/lib/services/scheduleOverride';
import {
  createSupabaseRecurrenceStore,
  saveRecurrenceSeries,
  type RecurrenceMutationClient,
} from '@/lib/services/scheduleRecurrenceMutation';
import type { MonthlyMode } from '@/lib/services/scheduleRecurrence';
import {
  invalidatePublicTruckBySlug,
  invalidatePublicTruckSearchCaches,
} from '@/lib/services/publicTruckPage';

interface SaveRecurrenceRequest {
  readonly series_id?: string;
  readonly truck_id?: string;
  readonly frequency?: string;
  readonly monthly_mode?: string | null;
  readonly start_date?: string;
  readonly occurrences?: number | null;
  readonly start_time?: string;
  readonly end_time?: string;
  readonly location_data?: { address?: string } | null;
  readonly converted_override_date?: string;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

async function getOwnedTruck(
  truckId: string,
  userId: string,
  role: string,
): Promise<{ id: string; slug: string | null; timezone: string } | NextResponse> {
  const { data: truck, error } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('id, owner_id, timezone, slug')
    .eq('id', truckId)
    .single();

  if (error || !truck) return NextResponse.json({ error: 'Food truck not found' }, { status: 404 });
  if (role !== 'admin' && userId !== truck.owner_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return {
    id: truck.id,
    slug: truck.slug,
    timezone: typeof truck.timezone === 'string' ? truck.timezone : 'UTC',
  };
}

async function saveRecurrence(request: NextRequest, requireSeriesId: boolean): Promise<NextResponse> {
  const authResult = await verifyRoleFromCookies(['food_truck_owner', 'admin']);
  if (!authResult.ok || !authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SaveRecurrenceRequest;
    const seriesId = body.series_id?.trim();
    const truckId = body.truck_id?.trim();
    const startDate = body.start_date?.trim();
    const frequency = body.frequency;
    const occurrences = body.occurrences ?? null;
    if (!truckId || !startDate || !isValidServiceDate(startDate)) {
      return NextResponse.json({ error: 'truck_id and a valid start_date are required' }, { status: 400 });
    }
    if (requireSeriesId && !seriesId) {
      return NextResponse.json({ error: 'series_id is required' }, { status: 400 });
    }
    if (!requireSeriesId && seriesId) {
      return NextResponse.json({ error: 'Use PUT to update an existing series' }, { status: 400 });
    }
    if (body.converted_override_date && body.converted_override_date !== startDate) {
      return NextResponse.json({ error: 'converted_override_date must match start_date' }, { status: 400 });
    }
    if (frequency !== 'daily' && frequency !== 'weekly' && frequency !== 'monthly') {
      return NextResponse.json({ error: 'frequency must be daily, weekly, or monthly' }, { status: 400 });
    }
    const requestedMonthlyMode = body.monthly_mode ?? 'same_date';
    const monthlyMode: MonthlyMode | null = frequency === 'monthly'
      ? requestedMonthlyMode as MonthlyMode
      : null;
    if (frequency === 'monthly' && monthlyMode !== 'same_date' && monthlyMode !== 'ordinal_weekday') {
      return NextResponse.json({ error: 'monthly_mode must be same_date or ordinal_weekday' }, { status: 400 });
    }
    if (occurrences !== null && (!Number.isInteger(occurrences) || occurrences < 1)) {
      return NextResponse.json({ error: 'occurrences must be a positive whole number or null' }, { status: 400 });
    }
    if (!body.start_time || !body.end_time || !TIME_PATTERN.test(body.start_time) || !TIME_PATTERN.test(body.end_time)) {
      return NextResponse.json({ error: 'valid start_time and end_time are required' }, { status: 400 });
    }
    const truck = await getOwnedTruck(truckId, authResult.userId ?? '', authResult.role ?? '');
    if (truck instanceof NextResponse) return truck;

    const admin = getSupabaseAdmin();
    // Attach map coordinates to the repeating schedule's location when the
    // request carries a concrete address; failure keeps the words-only value.
    const { enrichOverrideLocation } = await import('@/lib/services/overrideLocationEnrichment');
    const { geocodeAddress } = await import('@/lib/utils/geocoding');
    const requestedLocation = body.location_data ?? null;
    const enriched: { address?: string; lat?: number; lng?: number } | null = requestedLocation
      ? ((await enrichOverrideLocation(requestedLocation, geocodeAddress)) as typeof requestedLocation &
          { lat?: number; lng?: number } | null)
      : null;
    const result = await saveRecurrenceSeries(
      createSupabaseRecurrenceStore(admin as unknown as RecurrenceMutationClient),
      {
      truckId: truck.id,
      seriesId,
      frequency,
      monthlyMode,
      startDate,
      occurrences,
      startTime: body.start_time,
      endTime: body.end_time,
      timezone: truck.timezone,
      locationData: enriched ?? null,
      convertedOverrideDate: body.converted_override_date,
      canDeleteAdminOverride: authResult.role === 'admin',
    });
    if (!result.success) {
      const status = result.error.includes('times') ? 400 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    if (truck.slug) invalidatePublicTruckBySlug(truck.slug);
    invalidatePublicTruckSearchCaches();
    return NextResponse.json({ success: true, id: result.id, slug: truck.slug });
  } catch {
    return NextResponse.json({ error: 'Unable to save repeating schedule' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return saveRecurrence(request, false);
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return saveRecurrence(request, true);
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authResult = await verifyRoleFromCookies(['food_truck_owner', 'admin']);
  if (!authResult.ok || !authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { truck_id?: string; series_id?: string };
    const truckId = body.truck_id?.trim();
    const seriesId = body.series_id?.trim();
    if (!truckId || !seriesId) {
      return NextResponse.json({ error: 'truck_id and series_id are required' }, { status: 400 });
    }

    const truck = await getOwnedTruck(truckId, authResult.userId ?? '', authResult.role ?? '');
    if (truck instanceof NextResponse) return truck;

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('food_truck_recurrences')
      .delete()
      .eq('id', seriesId)
      .eq('food_truck_id', truck.id);
    if (error) return NextResponse.json({ error: 'Unable to delete repeating schedule' }, { status: 500 });

    if (truck.slug) invalidatePublicTruckBySlug(truck.slug);
    invalidatePublicTruckSearchCaches();
    return NextResponse.json({ success: true, slug: truck.slug });
  } catch {
    return NextResponse.json({ error: 'Unable to delete repeating schedule' }, { status: 500 });
  }
}
