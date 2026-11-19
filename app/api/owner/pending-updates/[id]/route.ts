/**
 * Pending Update Action API
 * WBS: 3.4.2
 *
 * PUT: Approve or reject a pending update
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage } from '@/lib/logging';
import { z } from 'zod';
import { pickWritableTruckFields } from '@/lib/trucks/updateWhitelist';

const ActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteParams) {
  try {
    const { id: updateId } = await context.params;
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const validated = ActionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { action, reason } = validated.data;

    // Fetch the pending update
    const adminClient = getSupabaseAdmin();

    // Use separate query to avoid type issues with new tables
    const { data: updateRows, error: fetchError } = await adminClient
      .from('pending_updates')
      .select('id, truck_id, status, new_value, old_value')
      .eq('id', updateId);

    if (fetchError || !updateRows || updateRows.length === 0) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    // Type assertion for unmigrated table
    const update = updateRows[0] as {
      id: string;
      truck_id: string;
      status: string;
      new_value: Record<string, unknown> | null;
      old_value: Record<string, unknown> | null;
    };

    // Fetch related truck to verify ownership
    const { data: truck, error: truckError } = await adminClient
      .from('food_trucks')
      .select('owner_id, name')
      .eq('id', update.truck_id)
      .single();

    if (truckError || !truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }

    // Verify ownership
    if (truck.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if already processed
    if (update.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Update already ${update.status}`,
          current_status: update.status,
        },
        { status: 400 },
      );
    }

    const appliedFields: Record<string, unknown> | null =
      action === 'approve' ? pickWritableTruckFields(update.new_value ?? {}) : null;
    if (appliedFields && Object.keys(appliedFields).length === 0) {
      return NextResponse.json({ error: 'Update has no editable fields' }, { status: 400 });
    }

    if (appliedFields) {
      const { error: applyError } = await adminClient
        .from('food_trucks')
        .update(appliedFields)
        .eq('id', update.truck_id);

      if (applyError) {
        logError('Error applying approved update:', applyError);
        return NextResponse.json({ error: 'Failed to apply update' }, { status: 500 });
      }
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { error: updateError } = await adminClient
      .from('pending_updates')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', updateId);

    if (updateError) {
      logError('Error updating pending update:', updateError);
      return NextResponse.json({ error: 'Failed to process update' }, { status: 500 });
    }

    // Log to audit_log
    await adminClient.from('audit_log').insert({
      action_type: action === 'approve' ? 'manual_approve' : 'manual_reject',
      entity_type: 'pending_update',
      entity_id: updateId,
      user_id: user.id,
      old_value: (update.old_value ?? null) as import('@/lib/database.remote.types').Json,
      new_value: (appliedFields ??
        update.new_value ??
        null) as import('@/lib/database.remote.types').Json,
      reason: reason ?? null,
      metadata: {
        truck_id: update.truck_id,
        truck_name: truck.name,
      } as import('@/lib/database.remote.types').Json,
    });

    logMessage(`Pending update ${updateId} ${newStatus} by ${user.id}`);

    return NextResponse.json({
      success: true,
      status: newStatus,
      applied: action === 'approve',
    });
  } catch (error) {
    logError('Error in pending-updates PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
