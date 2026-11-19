/**
 * Organizer Events Management API
 * WBS: 6.3.2, 6.3.4
 *
 * GET: List organizer's events
 * POST: Create a new event
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage } from '@/lib/logging';
import { z } from 'zod';

const LocationDataSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  show_fuzzy: z.boolean().optional(), // Privacy: show general area to public
});

const EventSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  location_data: LocationDataSchema,
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  vendor_fee: z.number().min(0).nullable().optional(),
  max_vendors: z.number().min(1).nullable().optional(),
  requirements: z.string().optional(),
});

// GET: List organizer's events
export async function GET() {
  try {
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

    // Get events
    const { data: events, error } = await supabase
      .from('eventfull_events')
      .select(
        `
        id, name, description, location_data,
        start_date, end_date, status, vendor_fee, max_vendors,
        created_at
      `,
      )
      .eq('organizer_id', organizer.id)
      .order('start_date', { ascending: false });

    if (error) {
      logError('Error fetching organizer events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    // Count applications per event
    const eventIds = events?.map((e) => e.id) ?? [];
    const applicationCounts: Record<string, { pending: number; accepted: number; total: number }> =
      {};

    if (eventIds.length > 0) {
      const { data: apps } = await supabase
        .from('event_applications')
        .select('event_id, status')
        .in('event_id', eventIds);

      if (apps) {
        for (const app of apps) {
          if (!applicationCounts[app.event_id]) {
            applicationCounts[app.event_id] = { pending: 0, accepted: 0, total: 0 };
          }
          applicationCounts[app.event_id].total++;
          if (app.status === 'pending') applicationCounts[app.event_id].pending++;
          if (app.status === 'accepted') applicationCounts[app.event_id].accepted++;
        }
      }
    }

    const enrichedEvents = (events ?? []).map((event) => ({
      ...event,
      applications: applicationCounts[event.id] ?? { pending: 0, accepted: 0, total: 0 },
    }));

    return NextResponse.json({ events: enrichedEvents });
  } catch (error) {
    logError('Error in organizer events GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new event
export async function POST(request: Request) {
  try {
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
      return NextResponse.json(
        { error: 'Not an organizer. Please register first.' },
        { status: 403 },
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = EventSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.flatten() },
        { status: 400 },
      );
    }

    const {
      name,
      description,
      location_data,
      start_date,
      end_date,
      vendor_fee,
      max_vendors,
      requirements,
    } = validated.data;

    // Validate dates
    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    if (new Date(start_date) < new Date()) {
      return NextResponse.json({ error: 'Start date must be in the future' }, { status: 400 });
    }

    // STRICT: Block paid events for unverified organizers
    if (vendor_fee && vendor_fee > 0 && organizer.verification_status !== 'verified') {
      return NextResponse.json(
        { error: 'Identity verification required to create paid events.' },
        { status: 403 },
      );
    }

    // Create event as draft
    const adminClient = getSupabaseAdmin();
    const { data: event, error: insertError } = await adminClient
      .from('eventfull_events')
      .insert({
        organizer_id: organizer.id,
        name,
        description,
        location_data,
        start_date,
        end_date,
        vendor_fee: vendor_fee ?? 0,
        max_vendors: max_vendors ?? null,
        requirements: requirements ?? null,
        status: 'draft', // Events start as drafts
      })
      .select('id, name, status')
      .single();

    if (insertError) {
      logError('Failed to create event:', insertError);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    logMessage(`Event created: ${event.id} by organizer ${organizer.id}`);

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        status: event.status,
      },
    });
  } catch (error) {
    logError('Error in organizer events POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
