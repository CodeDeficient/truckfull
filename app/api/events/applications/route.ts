/**
 * Event Applications API
 * WBS: 6.2.4, 6.2.5
 *
 * GET: List user's applications
 * POST: Submit a new application
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage } from '@/lib/logging';
import { z } from 'zod';
import type { Database, Json } from '@/lib/database.remote.types';

type FoodTruckRow = Database['public']['Tables']['food_trucks']['Row'];

interface EventOrganizerJoined {
  business_name: string;
  user_id: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  verification_status: string | null;
}

interface EventFullEventBasic {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location_data: Json;
  organizer: EventOrganizerJoined | null;
}

interface EventfullEventFull extends EventFullEventBasic {
  description: string | null;
  status: string | null;
  vendor_fee: number | null;
  max_vendors: number | null;
}

interface EventApplicationJoined {
  id: string;
  status: string | null;
  created_at: string | null;
  cover_letter: string | null;
  event: EventFullEventBasic;
  truck: Pick<FoodTruckRow, 'id' | 'name'>;
}

const ApplicationSchema = z.object({
  event_id: z.string().uuid(),
  truck_id: z.string().uuid(),
  cover_letter: z.string().optional(),
  proposed_menu: z.record(z.string(), z.unknown()).optional(),
  payment_disclaimer_accepted: z.boolean().optional(),
});

// GET: List user's applications
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = request.nextUrl;
    const truckId = searchParams.get('truck_id');
    const status = searchParams.get('status');

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's trucks
    const { data: trucks } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('id')
      .eq('owner_id', user.id);

    if (!trucks || trucks.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    const truckIds = truckId
      ? [truckId].filter((id) => trucks.some((t) => t.id === id))
      : trucks.map((t) => t.id);

    if (truckIds.length === 0) {
      return NextResponse.json({ applications: [] });
    }

    // Build query
    // Build query for applications
    let query = supabase
      .from('event_applications')
      .select(
        `
        id, status, created_at, cover_letter,
        event:eventfull_events(
          id, name, start_date, end_date, location_data,
          organizer:event_organizers(business_name, user_id, rating_avg, rating_count, verification_status)
        ),
        truck:food_trucks(id, name)
      `,
      )
      .in('truck_id', truckIds)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: applications, error } = await query;

    if (error) {
      logError('Error fetching applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    // Fetch owned events if requested
    let ownedEvents: EventfullEventFull[] = [];
    const includeOwned = searchParams.get('include_owned') === 'true';

    if (includeOwned) {
      // Find organizer profile for this user
      const { data: organizer } = await supabase
        .from('event_organizers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (organizer) {
        const { data: events, error: ownedError } = await supabase
          .from('eventfull_events')
          .select(
            `
            id, name, start_date, end_date, location_data, description, status, vendor_fee, max_vendors,
            organizer:event_organizers(business_name, rating_avg, rating_count, verification_status, user_id)
          `,
          )
          .eq('organizer_id', organizer.id); // Typo fixed: organizer_id not organizer.id

        if (!ownedError && events) {
          ownedEvents = events
            .map((e) => {
              if (!e.organizer) {
                return null;
              }
              return {
                id: e.id,
                name: e.name,
                start_date: e.start_date,
                end_date: e.end_date,
                location_data: e.location_data,
                description: e.description,
                status: e.status,
                vendor_fee: e.vendor_fee,
                max_vendors: e.max_vendors,
                organizer: e.organizer,
              };
            })
            .filter((e): e is NonNullable<typeof e> => e !== null);
        }
      }
    }

    // Transform response
    const transformedApplications = (applications ?? [])
      .map((app: EventApplicationJoined) => {
        if (!app.event.organizer) {
          return null;
        }
        return {
          id: app.id,
          status: app.status,
          created_at: app.created_at,
          cover_letter: app.cover_letter,
          event: {
            id: app.event.id,
            name: app.event.name,
            start_date: app.event.start_date,
            end_date: app.event.end_date,
            location_data: app.event.location_data,
            organizer: app.event.organizer,
          },
          truck: app.truck,
        };
      })
      .filter((app): app is NonNullable<typeof app> => app !== null);

    return NextResponse.json({
      applications: transformedApplications,
      owned_events: ownedEvents,
    });
  } catch (error) {
    logError('Error in applications GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Submit a new application
export async function POST(request: Request) {
  try {
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
    const validated = ApplicationSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.flatten() },
        { status: 400 },
      );
    }

    const { event_id, truck_id, cover_letter, proposed_menu, payment_disclaimer_accepted } =
      validated.data;

    // Verify truck ownership
    const { data: truck, error: truckError } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('owner_id')
      .eq('id', truck_id)
      .single();

    if (truckError || !truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }

    if (truck.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get owner's subscription tier from their profile
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', truck.owner_id)
      .single();

    const subscriptionTier = ownerProfile?.subscription_tier ?? 'free';

    // Get event details
    const adminClient = getSupabaseAdmin();
    const { data: event, error: eventError } = await adminClient
      .from('eventfull_events')
      .select('id, name, vendor_fee, max_vendors, status')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'published') {
      return NextResponse.json({ error: 'Event is not accepting applications' }, { status: 400 });
    }

    // Check tier restrictions
    if (event.vendor_fee && event.vendor_fee > 0) {
      // Paid events require pro tier
      if (!subscriptionTier || subscriptionTier === 'free') {
        return NextResponse.json(
          {
            error: 'Upgrade required to apply to paid events',
            upgrade_required: true,
          },
          { status: 403 },
        );
      }

      // Must accept payment disclaimer for paid events
      if (!payment_disclaimer_accepted) {
        return NextResponse.json(
          {
            error: 'You must acknowledge the payment disclaimer',
          },
          { status: 400 },
        );
      }
    }

    // Check for existing application
    const { data: existing } = await adminClient
      .from('event_applications')
      .select('id, status')
      .eq('event_id', event_id)
      .eq('truck_id', truck_id)
      .not('status', 'eq', 'withdrawn')
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: 'You have already applied to this event',
          existing_status: existing.status,
        },
        { status: 409 },
      );
    }

    // Create application
    const { data: application, error: insertError } = await adminClient
      .from('event_applications')
      .insert({
        event_id,
        truck_id,
        cover_letter: cover_letter ?? null,
        proposed_menu: (proposed_menu ??
          null) as unknown as import('@/lib/database.remote.types').Json,
        payment_disclaimer_accepted: payment_disclaimer_accepted ?? false,
        status: 'pending',
      })
      .select('id, status')
      .single();

    if (insertError) {
      logError('Failed to create application:', insertError);
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
    }

    logMessage(`Application ${application.id} created for event ${event_id} by truck ${truck_id}`);

    // Send email notification to organizer about new application
    // Run async - don't block the response
    void (async () => {
      try {
        // Get organizer and truck details for email
        const { data: eventData } = await adminClient
          .from('eventfull_events')
          .select(
            `
            name,
            organizer:event_organizers(user_id, business_name)
          `,
          )
          .eq('id', event_id)
          .single();

        const { data: truckData } = await adminClient
          .from('food_trucks')
          .select('name, cuisine_type')
          .eq('id', truck_id)
          .single();

        if (eventData?.organizer) {
          const organizer = eventData.organizer as { user_id: string; business_name: string };

          const { data: organizerProfile } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', organizer.user_id)
            .single();

          // Get total application count for this event
          const { count } = await adminClient
            .from('event_applications')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event_id)
            .neq('status', 'withdrawn');

          if (organizerProfile?.email && truckData) {
            const { notifyOrganizerNewApplication } =
              await import('@/lib/email/eventNotifications');

            await notifyOrganizerNewApplication({
              organizerEmail: organizerProfile.email,
              organizerName: organizerProfile.full_name ?? organizer.business_name,
              eventName: eventData.name,
              truckName: truckData.name,
              cuisineType: Array.isArray(truckData.cuisine_type)
                ? truckData.cuisine_type[0]
                : (truckData.cuisine_type ?? undefined),
              applicationCount: count ?? 1,
            });
          }
        }
      } catch (emailError) {
        logError('Failed to send new application email:', emailError);
      }
    })();

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
      },
    });
  } catch (error) {
    logError('Error in applications POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
