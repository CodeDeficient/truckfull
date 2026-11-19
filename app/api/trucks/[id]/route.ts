import { type NextRequest, NextResponse } from 'next/server';
import { FoodTruckService, type FoodTruck } from '@/lib/supabase';
import { verifyRoleFromCookies } from '@/lib/auth/authHelpers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { invalidatePublicTruckBySlug } from '@/lib/services/publicTruckPage';
import {
  normalizeWeeklyScheduleForWrite,
  withManualScheduleSource,
} from '@/lib/mappers/weeklyScheduleModel';
import { applyManualRecurringProvenance } from '@/lib/services/recurringArbitration';
import { pickWritableTruckFields } from '@/lib/trucks/updateWhitelist';
import { handleGetTruckById } from '@/lib/api/trucks/handlers';

/**
 * Source-arbitration columns the consolidated App-level truck type does not
 * model. Server-managed only: request bodies are stripped of them before any
 * update is issued.
 */
interface TruckRequestBody extends Partial<FoodTruck> {
  schedule_updated_by?: string;
  schedule_updated_at?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return handleGetTruckById(id);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Use cookie-based verification (works with browser fetch automatically)
    const authResult = await verifyRoleFromCookies(['food_truck_owner', 'admin']);

    if (!authResult.ok || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user can edit this specific truck
    const { data: truck, error } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (error || !truck) {
      return NextResponse.json({ error: 'Food truck not found' }, { status: 404 });
    }

    // Only allow the owner or admin to update the truck
    if (authResult.userId !== truck.owner_id && authResult.role !== 'admin') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          details: 'Only the truck owner or administrators can update this truck',
        },
        { status: 403 },
      );
    }

    const rawBody = (await request.json()) as TruckRequestBody;
    // Whitelist client-writable columns: server-managed state (verification,
    // ratings, claim/billing fields, audit stamps, owner_id, ids, timestamps)
    // and unknown keys never reach the UPDATE.
    const body = pickWritableTruckFields(rawBody) as TruckRequestBody;
    const canChangeSlug = 'slug' in body || 'name' in body;
    // Read the persisted slug BEFORE the update: after it lands, the stored
    // slug is the new one and old-slug invalidation would never fire.
    const { data: oldTruck } = canChangeSlug
      ? await getSupabaseAdmin().from('food_trucks').select('slug').eq('id', id).single()
      : { data: null };

    let updatedTruck: FoodTruck | { error: string } | undefined;
    if (body.operating_hours) {
      const normalized = normalizeWeeklyScheduleForWrite(body.operating_hours);
      if (normalized.error || !normalized.value) {
        return NextResponse.json({ error: normalized.error }, { status: 400 });
      }
      body.operating_hours = normalized.value;
      // Schedule source metadata is server-authoritative — client-supplied
      // values (including arbitration `_meta`) are never trusted.
      delete body.schedule_updated_by;
      delete body.schedule_updated_at;

      const updated = await putWithProvenance(id, normalized.value, body);
      if (updated === 'conflict') {
        return NextResponse.json(
          { error: 'Schedule changed while saving; reload and retry' },
          { status: 409 },
        );
      }
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update food truck' }, { status: 500 });
      }
      updatedTruck = updated;
    } else {
      // Never trust client-supplied schedule source metadata on writes that do
      // not carry scheduled hours (e.g. phone/description-only edits).
      delete body.schedule_updated_by;
      delete body.schedule_updated_at;
    }

    if (!updatedTruck) {
      updatedTruck = await FoodTruckService.updateTruck(id, body);
    }

    // Check if the result is an error object
    if (updatedTruck && typeof updatedTruck === 'object' && 'error' in updatedTruck) {
      return NextResponse.json({ error: updatedTruck.error }, { status: 500 });
    }

    const newSlug = (updatedTruck as FoodTruck).slug;
    const oldSlug = oldTruck?.slug;
    if (newSlug) {
      invalidatePublicTruckBySlug(newSlug);
    }
    if (oldSlug && oldSlug !== newSlug) {
      invalidatePublicTruckBySlug(oldSlug);
    }

    return NextResponse.json({
      message: 'Food truck updated successfully',
      truck: updatedTruck,
    });
  } catch {
    // Error is already handled by returning a 500 response
    return NextResponse.json({ error: 'Failed to update food truck' }, { status: 500 });
  }
}

interface TruckRequestBodyWithHours extends TruckRequestBody {
  operating_hours?: NonNullable<TruckRequestBody['operating_hours']>;
}

/**
 * Per-unit manual provenance with optimistic concurrency: compare the
 * persisted recurring hours against the submitted ones and stamp ONLY the
 * semantic units whose values actually changed (hours fields → schedule
 * clock; per-day location → location clock). The write is conditional on the
 * persisted `operating_hours` snapshot; on a lost race (e.g. a concurrent
 * Facebook write) the full body is re-derived from a fresh read so the owner
 * never overwrites a newer Facebook action. Bounded retries return
 * `'conflict'` after exhaustion.
 */
async function putWithProvenance(
  id: string,
  normalizedValue: NonNullable<TruckRequestBody['operating_hours']>,
  body: TruckRequestBody,
): Promise<FoodTruck | { error: string } | 'conflict' | null> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { data: prior, error: priorError } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('operating_hours')
      .eq('id', id)
      .single();
    if (priorError) {
      return { error: 'Failed to read current schedule before update' };
    }
    const now = new Date().toISOString();
    const provenance = applyManualRecurringProvenance(
      prior?.operating_hours as Record<string, unknown> | null | undefined,
      normalizedValue as Record<string, unknown> | null | undefined,
      now,
    );
    const payload: TruckRequestBodyWithHours = {
      ...body,
      operating_hours: provenance.hours as typeof normalizedValue,
    };
    if (provenance.changed) {
      Object.assign(payload, withManualScheduleSource({}, now));
    }

    const result = await FoodTruckService.updateTruck(id, payload, {
      expectedOperatingHours: prior?.operating_hours ?? null,
    });
    if (!('error' in result) || result.error !== 'OPERATING_HOURS_CONFLICT') {
      return result;
    }
  }
  return 'conflict';
}
