/**
 * Validate Invite API
 *
 * GET: Validates an invite token and returns truck info
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logError } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Look up invite
    const { data: invite, error } = await supabase
      .from('pending_invites')
      .select(
        `
        id, email, expires_at, accepted_at,
        truck:food_trucks(id, name, cuisine_type, city, state)
      `,
      )
      .eq('token', token)
      .single();

    if (error || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Check if already accepted
    if (invite.accepted_at) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 });
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 });
    }

    const truckData = invite.truck as unknown;
    const truck = Array.isArray(truckData)
      ? (truckData[0] as
          | { id: string; name: string; cuisine_type?: string; city?: string; state?: string }
          | undefined)
      : (truckData as {
          id: string;
          name: string;
          cuisine_type?: string;
          city?: string;
          state?: string;
        } | null);

    return NextResponse.json({
      valid: true,
      invite: {
        truck_id: truck?.id,
        truck_name: truck?.name || 'Your Food Truck',
        cuisine_type: truck?.cuisine_type,
        location: truck?.city && truck?.state ? `${truck.city}, ${truck.state}` : undefined,
        expires_at: invite.expires_at,
      },
    });
  } catch (error) {
    logError('Error validating invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
