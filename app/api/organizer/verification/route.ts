/**
 * Verification API
 * WBS: 6.5.1, 6.5.4
 *
 * POST: Start verification flow
 *
 * NOTE: Sumsub integration has been removed. Stripe Identity verification
 * will be implemented in a future phase. This endpoint returns a placeholder
 * response for now.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { logError, logMessage } from '@/lib/logging';

export async function POST() {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: organizer } = await supabase
      .from('event_organizers')
      .select('id, verification_status')
      .eq('user_id', user.id)
      .single();

    if (!organizer) {
      return NextResponse.json({ error: 'Not an organizer' }, { status: 403 });
    }

    if (organizer.verification_status === 'verified') {
      return NextResponse.json(
        {
          error: 'Already verified',
          status: 'verified',
        },
        { status: 400 },
      );
    }

    // TODO: Implement Stripe Identity verification
    // For now, return a placeholder response
    logMessage(`Verification requested for organizer ${organizer.id}`);

    return NextResponse.json(
      {
        error:
          'Identity verification is coming soon. Stripe Identity integration will be available in a future update.',
        status: 'unavailable',
        organizer_id: organizer.id,
      },
      { status: 503 },
    );
  } catch (error) {
    logError('Error in verification POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
