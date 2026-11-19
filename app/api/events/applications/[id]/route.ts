/**
 * Individual Application API
 * WBS: 6.2.5
 *
 * DELETE: Withdraw an application
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE: Withdraw an application
export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const { id: applicationId } = await context.params;
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get application details first
    // Note: Using !inner on a relation sometimes fails if types or FKs aren't perfect.
    // Simplifying to two steps for robust debugging.
    const adminClient = getSupabaseAdmin();

    const { data: application, error: fetchError } = await adminClient
      .from('event_applications')
      .select('id, status, truck_id')
      .eq('id', applicationId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Now fetch truck to verify ownership
    const { data: truck, error: truckError } = await adminClient
      .from('food_trucks')
      .select('owner_id')
      .eq('id', application.truck_id)
      .single();

    if (truckError || !truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }

    // Verify ownership
    if (truck.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Only pending applications can be withdrawn
    if (application.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Cannot withdraw a ${application.status} application`,
        },
        { status: 400 },
      );
    }

    // Update to withdrawn status
    const { error: updateError } = await adminClient
      .from('event_applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to withdraw application' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Return the actual error message for debugging
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
