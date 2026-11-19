/**
 * Accept Invite API
 *
 * POST: Accepts an invite, claims the truck, and updates user role
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/utils/server';
import { claimTruckForUser, claimTruckAdmin } from '@/lib/services/claimService';
import { logError, logMessage } from '@/lib/logging';

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const { token } = body as { token: string };

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Look up invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('pending_invites')
      .select('id, email, truck_id, expires_at, accepted_at')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Validate invite status
    if (invite.accepted_at) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 });
    }

    if (!user.email_confirmed_at || invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Sign in with the email address this invite was sent to' },
        { status: 403 },
      );
    }

    const truckId = invite.truck_id;

    let trialStarted = false;

    if (truckId) {
      // Try email-validated claim first (standard path)
      const claimResult = await claimTruckForUser(truckId, user.id, invite.email);

      if (claimResult.success) {
        trialStarted = claimResult.trialStarted ?? false;
      } else {
        // Email mismatch — use admin override since invite was admin-authorized
        logMessage(`Email validation failed for invite claim, falling back to admin claim: ${claimResult.error}`);
        const adminResult = await claimTruckAdmin(truckId, user.id);

        if (!adminResult.success) {
          return NextResponse.json(
            { error: adminResult.error || 'Failed to claim truck' },
            { status: 409 },
          );
        }
        trialStarted = adminResult.trialStarted ?? false;
      }
    }

    // 2. Update user role to food_truck_owner
    const { error: roleError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'food_truck_owner' })
      .eq('id', user.id);

    if (roleError) {
      logError('Failed to update role:', roleError);
      // Don't fail - truck is claimed, role update is secondary
    }

    // 3. Mark invite as accepted
    const { error: acceptError } = await supabaseAdmin
      .from('pending_invites')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invite.id);

    if (acceptError) {
      logError('Failed to mark invite as accepted:', acceptError);
      // Don't fail - truck is claimed
    }

    logMessage(`Invite accepted: user ${user.id} claimed truck ${truckId}`);

    return NextResponse.json({
      success: true,
      truck_id: truckId,
      message: 'Truck claimed successfully!',
      trialStarted,
    });
  } catch (error) {
    logError('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
