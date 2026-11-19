/**
 * Organizer API
 * WBS: 6.3.1
 *
 * POST: Create organizer profile
 * GET: Get current user's organizer profile
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage } from '@/lib/logging';
import { z } from 'zod';

const OrganizerSchema = z.object({
  business_name: z.string().min(2).max(100),
  contact_email: z.string().email(),
  contact_phone: z.string().optional(),
});

// GET: Get current user's organizer profile
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

    const { data: organizer, error } = await supabase
      .from('event_organizers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      logError('Error fetching organizer:', error);
      return NextResponse.json({ error: 'Failed to fetch organizer' }, { status: 500 });
    }

    return NextResponse.json({
      organizer: organizer ?? null,
      is_organizer: !!organizer,
    });
  } catch (error) {
    logError('Error in organizer GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create organizer profile
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

    // Check if already an organizer
    const { data: existing } = await supabase
      .from('event_organizers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: 'You are already registered as an organizer',
          organizer_id: existing.id,
        },
        { status: 409 },
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validated = OrganizerSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.flatten() },
        { status: 400 },
      );
    }

    const { business_name, contact_email, contact_phone } = validated.data;

    // Create organizer profile
    const adminClient = getSupabaseAdmin();
    const { data: organizer, error: insertError } = await adminClient
      .from('event_organizers')
      .insert({
        user_id: user.id,
        business_name,
        contact_email,
        contact_phone: contact_phone ?? null,
        verification_status: 'unverified',
        rating_avg: null,
        rating_count: 0,
      })
      .select('id, business_name, verification_status')
      .single();

    if (insertError) {
      logError('Failed to create organizer:', insertError);
      return NextResponse.json({ error: 'Failed to create organizer profile' }, { status: 500 });
    }

    logMessage(`Organizer profile created: ${organizer.id} for user ${user.id}`);

    return NextResponse.json({
      success: true,
      organizer: {
        id: organizer.id,
        business_name: organizer.business_name,
        verification_status: organizer.verification_status,
      },
    });
  } catch (error) {
    logError('Error in organizer POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
