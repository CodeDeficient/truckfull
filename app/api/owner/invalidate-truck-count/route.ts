import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import { invalidateMetadataTruckCount } from '@/lib/seo/truckCountInvalidation';

interface RouteBody {
  truckId?: string;
}

/**
 * Best-effort metadata truck-count invalidation after owner-side registration.
 *
 * The food_trucks row is inserted client-side during registration; this endpoint
 * exists solely to purge the metadata truck-count cache (180-day ceiling) once
 * that insert has produced a newly-counted active truck owned by the caller.
 *
 * It does NOT accept an arbitrary cache tag, does NOT mutate the truck, and is
 * a no-op for unauthenticated callers or trucks the caller does not own.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as RouteBody;
    const truckId = body.truckId;
    if (typeof truckId !== 'string' || truckId.length === 0) {
      return NextResponse.json({ error: 'truckId required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: truck, error: fetchError } = await admin
      .from('food_trucks')
      .select('id, owner_id, is_active')
      .eq('id', truckId)
      .single();

    if (fetchError || !truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }

    if (truck.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not the truck owner' }, { status: 403 });
    }

    if (truck.is_active !== true) {
      // Not in the counted set — no membership change to invalidate.
      return NextResponse.json({ success: true, invalidated: false });
    }

    invalidateMetadataTruckCount();
    return NextResponse.json({ success: true, invalidated: true });
  } catch (error) {
    logError('owner/invalidate-truck-count failed', error);
    return NextResponse.json({ error: 'Invalidation failed' }, { status: 500 });
  }
}
