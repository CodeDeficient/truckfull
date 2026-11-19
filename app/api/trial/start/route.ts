import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { provisionFreeTrial } from '@/lib/subscription/trialProvisioning';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimited, authLimiter, getClientIp } from '@/lib/middleware/rateLimit';
import { logError } from '@/lib/logging';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimitResult = await checkRateLimited(`trial-start:${ip}`, authLimiter);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
        { status: 429 },
      );
    }

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = getSupabaseAdmin();

    const { data: profile } = await adminClient
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'enterprise') {
      return NextResponse.json({ status: 'already_pro', redirect: '/owner-dashboard' });
    }

    if (profile?.subscription_tier === 'starter') {
      // The provisioning guard only grants trials to free-tier accounts, so a
      // starter user would otherwise be silently dropped into Billing.
      return NextResponse.json(
        {
          status: 'trial_unavailable',
          reason: 'unsupported_tier',
          redirect: '/owner-dashboard/billing',
        },
        { status: 409 },
      );
    }

    const result = await provisionFreeTrial(user.id, 'pricing');

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 });
    }

    if (result.provisioned) {
      return NextResponse.json({ status: 'trial_started', trialEndsAt: result.trialEndsAt });
    }

    if (result.reason === 'already_had_trial') {
      return NextResponse.json(
        {
          status: 'trial_unavailable',
          reason: 'cooldown',
          redirect: '/owner-dashboard/billing',
        },
        { status: 409 },
      );
    }

    if (result.reason === 'already_pro') {
      return NextResponse.json({ status: 'already_pro', redirect: '/owner-dashboard' });
    }

    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  } catch (error) {
    logError('Error in trial/start:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
