/**
 * Individual Event Management API
 * WBS: 6.3.4, 6.3.5
 *
 * GET: Get event details with applications
 * PUT: Update event (including publish)
 * DELETE: Delete draft event
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage } from '@/lib/logging';
import { z } from 'zod';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate that a string is a valid UUID
 * Prevents SQL injection and ensures proper ID format
 */
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

const UpdateEventSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  location_data: z.record(z.string(), z.unknown()).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  vendor_fee: z.number().min(0).nullable().optional(),
  max_vendors: z.number().min(1).nullable().optional(),
  requirements: z.string().optional(),
  status: z.enum(['draft', 'published', 'cancelled']).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get event details with applications
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: eventId } = await context.params;

    // Validate UUID format
    if (!isValidUUID(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get organizer profile
    const { data: organizer } = await supabase
      .from('event_organizers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!organizer) {
      return NextResponse.json({ error: 'Not an organizer' }, { status: 403 });
    }

    // Get event
    const { data: event, error } = await supabase
      .from('eventfull_events')
      .select('*')
      .eq('id', eventId)
      .eq('organizer_id', organizer.id)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get applications
    const { data: applications } = await supabase
      .from('event_applications')
      .select(
        `
        id, status, created_at, cover_letter, proposed_menu,
        truck:food_trucks(id, name, cuisine_type, profile_image_url)
      `,
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      event,
      applications: applications ?? [],
    });
  } catch (error) {
    logError('Error in event GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update event
export async function PUT(request: Request, context: RouteParams) {
  try {
    const { id: eventId } = await context.params;

    // Validate UUID format
    if (!isValidUUID(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get organizer profile
    const { data: organizer } = await supabase
      .from('event_organizers')
      .select('id, verification_status')
      .eq('user_id', user.id)
      .single();

    if (!organizer) {
      return NextResponse.json({ error: 'Not an organizer' }, { status: 403 });
    }

    // Get existing event
    const adminClient = getSupabaseAdmin();
    const { data: existingEvent } = await adminClient
      .from('eventfull_events')
      .select('id, status, vendor_fee, organizer_id')
      .eq('id', eventId)
      .single();

    if (!existingEvent || existingEvent.organizer_id !== organizer.id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Parse body
    const body = await request.json();
    const validated = UpdateEventSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.flatten() },
        { status: 400 },
      );
    }

    // Check publish requirements
    if (validated.data.status === 'published') {
      const vendorFee = validated.data.vendor_fee ?? existingEvent.vendor_fee;

      // Paid events require verified organizer
      if (vendorFee && vendorFee > 0 && organizer.verification_status !== 'verified') {
        return NextResponse.json(
          {
            error:
              'Paid events require a verified organizer account. Please complete identity verification first.',
            verification_required: true,
          },
          { status: 403 },
        );
      }
    }

    // Can't edit published events (except to cancel)
    if (
      existingEvent.status === 'published' &&
      validated.data.status !== 'cancelled' && // Only allow cancellation
      Object.keys(validated.data).some((k) => k !== 'status')
    ) {
      return NextResponse.json(
        {
          error: 'Cannot edit a published event. You can only cancel it.',
        },
        { status: 400 },
      );
    }

    // Update event - cast to proper type for Supabase
    const updateData = {
      ...validated.data,
      ...(validated.data.location_data && {
        location_data: validated.data
          .location_data as unknown as import('@/lib/database.remote.types').Json,
      }),
    } as {
      name?: string;
      description?: string;
      location_data?: import('@/lib/database.remote.types').Json;
      start_date?: string;
      end_date?: string;
      vendor_fee?: number | null;
      max_vendors?: number | null;
      requirements?: string;
      status?: 'draft' | 'published' | 'cancelled';
    };

    const { data: updatedEvent, error: updateError } = await adminClient
      .from('eventfull_events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (updateError) {
      logError('Failed to update event:', updateError);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    logMessage(`Event ${eventId} updated: status=${updatedEvent.status}`);

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });
  } catch (error) {
    logError('Error in event PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete draft event
export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const { id: eventId } = await context.params;

    // Validate UUID format
    if (!isValidUUID(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get organizer profile
    const { data: organizer } = await supabase
      .from('event_organizers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!organizer) {
      return NextResponse.json({ error: 'Not an organizer' }, { status: 403 });
    }

    // Get event
    const adminClient = getSupabaseAdmin();
    const { data: event } = await adminClient
      .from('eventfull_events')
      .select('id, status, organizer_id')
      .eq('id', eventId)
      .single();

    if (!event || event.organizer_id !== organizer.id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Only draft events can be deleted
    if (event.status !== 'draft') {
      return NextResponse.json(
        {
          error: 'Only draft events can be deleted. Cancel the event instead.',
        },
        { status: 400 },
      );
    }

    // Delete event
    const { error: deleteError } = await adminClient
      .from('eventfull_events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      logError('Failed to delete event:', deleteError);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    logMessage(`Event ${eventId} deleted by organizer ${organizer.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Error in event DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
