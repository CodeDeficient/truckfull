/**
 * Saved External Leads API
 * WBS: Phase 3B
 *
 * GET: List saved external leads for a truck
 * POST: Save an external event lead
 * DELETE: Remove a saved lead
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/utils/server';
import { logError } from '@/lib/logging';
import { cleanEventDescription } from '@/lib/events/descriptionUtils';
import { verifyOwnerAccessFromCookies } from '@/lib/auth/ownerAccessServer';
import { getUserTier } from '@/lib/auth/tierMiddleware';
import { getMaxLeads } from '@/lib/subscription/tierFeatures';
import { z } from 'zod';

const SAVED_LEAD_LIMIT_MESSAGE = /Saved lead limit reached \((\d+)\)/;

interface SavedLeadExternalEvent {
  id: string;
  title: string;
  description: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  city: string | null;
  state: string | null;
  location_address: string | null;
  source_type: string | null;
  source_url: string | null;
  vetting_score: number | null;
}

interface SavedLeadRow {
  id: string;
  event_id: string;
  created_at: string;
  external_events: SavedLeadExternalEvent[] | null;
}

interface InsertErrorInfo {
  code: string;
  message: string;
}

interface ClassifiedError {
  type: 'limit_reached' | 'already_saved' | 'not_found' | 'generic_error';
  status: number;
  body: Record<string, unknown>;
}

export function classifyInsertError(
  error: InsertErrorInfo | null | undefined,
): ClassifiedError | null {
  if (!error) return null;

  if (error.code === '23514') {
    const match = error.message.match(SAVED_LEAD_LIMIT_MESSAGE);
    const limit = match ? match[1] : 'your subscription tier';
    return {
      type: 'limit_reached',
      status: 403,
      body: { error: `Lead limit reached (${limit} for your subscription tier)`, code: 'LIMIT_REACHED' },
    };
  }

  if (error.code === '23505') {
    return {
      type: 'already_saved',
      status: 200,
      body: { message: 'Lead already saved' },
    };
  }

  if (error.code === '23503') {
    return {
      type: 'not_found',
      status: 400,
      body: { error: 'Event or truck not found' },
    };
  }

  return {
    type: 'generic_error',
    status: 500,
    body: { error: 'Failed to save lead' },
  };
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const SaveLeadSchema = z.object({
  event_id: z.string().uuid(),
  truck_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = request.nextUrl;
    const truckId = searchParams.get('truck_id');
    const eventId = searchParams.get('event_id');

    if (!truckId) {
      return NextResponse.json({ error: 'truck_id is required' }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const access = await verifyOwnerAccessFromCookies();
    if (access.outcome === 'unauthenticated' || access.outcome === 'authenticated_without_access') {
      return NextResponse.json({ error: 'Owner tools access required' }, { status: 403 });
    }

    const { data: truck, error: truckError } = await getAdminClient()
      .from('food_trucks')
      .select('owner_id')
      .eq('id', truckId)
      .single();

    if (truckError || !truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }

    if (truck.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const adminClient = getAdminClient();
    let query = adminClient
      .from('saved_external_leads')
      .select(
        `
        id,
        event_id,
        created_at,
        external_events(
          id,
          title,
          description,
          event_start_date,
          event_end_date,
          city,
          state,
          location_address,
          source_type,
          source_url,
          vetting_score
        )
      `,
      )
      .eq('truck_id', truckId);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data: leads, error: leadsError } = await query.order('created_at', { ascending: false });

    if (leadsError) {
      logError('Error fetching saved leads:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch saved leads' }, { status: 500 });
    }

    const cleaned = (leads as unknown as SavedLeadRow[]).map((lead) => {
      let parsed = lead.external_events;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          parsed = null;
        }
      }
      return {
        ...lead,
        external_events: Array.isArray(parsed)
          ? parsed.map((ext) => ({
              ...ext,
              description: cleanEventDescription(ext.description),
            }))
          : parsed,
      };
    });

    return NextResponse.json({ leads: cleaned });
  } catch (error) {
    logError('Saved leads GET error:', error);
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const access = await verifyOwnerAccessFromCookies();
    if (access.outcome === 'unauthenticated' || access.outcome === 'authenticated_without_access') {
      return NextResponse.json({ error: 'Owner tools access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = SaveLeadSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.flatten() },
        { status: 400 },
      );
    }

    const { event_id, truck_id } = validated.data;

    const { data: truck, error: truckError } = await getAdminClient()
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

    const tier = await getUserTier(user.id);
    const maxLeads = getMaxLeads(tier);

    const adminClient = getAdminClient();

    const [{ data: existing }, { count }] = await Promise.all([
      adminClient
        .from('saved_external_leads')
        .select('id')
        .eq('event_id', event_id)
        .eq('truck_id', truck_id)
        .single(),
      maxLeads >= 0
        ? adminClient
            .from('saved_external_leads')
            .select('id', { count: 'exact', head: true })
            .eq('truck_id', truck_id)
        : Promise.resolve({ count: 0 }),
    ]);

    if (existing) {
      return NextResponse.json({ id: existing.id, message: 'Lead already saved' });
    }

    if (maxLeads >= 0 && (count ?? 0) >= maxLeads) {
      return NextResponse.json(
        { error: `Lead limit reached (${maxLeads} for ${tier} tier)`, code: 'LIMIT_REACHED' },
        { status: 403 },
      );
    }

    const { data: lead, error: insertError } = await adminClient
      .from('saved_external_leads')
      .insert({ event_id, truck_id })
      .select('id')
      .single();

    if (insertError) {
      const classified = classifyInsertError(insertError);
      if (classified) {
        return NextResponse.json(classified.body, { status: classified.status });
      }
      logError('Error saving lead:', insertError);
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
    }

    return NextResponse.json({ id: lead.id, message: 'Lead saved' }, { status: 201 });
  } catch (error) {
    logError('Saved leads POST error:', error);
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = request.nextUrl;
    const leadId = searchParams.get('id');

    if (!leadId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const access = await verifyOwnerAccessFromCookies();
    if (access.outcome === 'unauthenticated' || access.outcome === 'authenticated_without_access') {
      return NextResponse.json({ error: 'Owner tools access required' }, { status: 403 });
    }

    const adminClient = getAdminClient();

    const { data: lead, error: leadError } = await adminClient
      .from('saved_external_leads')
      .select('truck_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const { data: truck } = await adminClient
      .from('food_trucks')
      .select('owner_id')
      .eq('id', lead.truck_id)
      .single();

    if (!truck || truck.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { error: deleteError } = await adminClient
      .from('saved_external_leads')
      .delete()
      .eq('id', leadId);

    if (deleteError) {
      logError('Error deleting lead:', deleteError);
      return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Lead removed' });
  } catch (error) {
    logError('Saved leads DELETE error:', error);
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
