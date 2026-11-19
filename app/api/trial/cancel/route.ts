import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimited, authLimiter, getClientIp } from '@/lib/middleware/rateLimit';
import { logError, logMessage } from '@/lib/logging';
import {
  deriveTrialAccountState,
  evaluateTrialCancellation,
  buildTrialCancelMarkerInsert,
  TRIAL_CANCELED_NOTE,
} from '@/lib/subscription/trialState';

export const runtime = 'nodejs';

interface ProfileBillingRow {
  subscription_tier: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_ends_at: string | null;
  subscription_started_at: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const rateLimitResult = await checkRateLimited(`trial-cancel:${ip}`, authLimiter);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
        { status: 429 },
      );
    }

    const admin = getSupabaseAdmin();

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select(
        'subscription_tier, stripe_customer_id, stripe_subscription_id, subscription_ends_at, subscription_started_at',
      )
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logError('Trial cancel: profile load failed', profileError);
      return NextResponse.json(
        { error: 'Could not load your billing state. Please try again.' },
        { status: 500 },
      );
    }

    const row = profile as ProfileBillingRow;

    // Only markers recorded during the CURRENT trial count as evidence of
    // cancellation. A marker from a previous trial cycle (e.g. the 12-month
    // cooldown lapsed and a new trial was provisioned) must not block
    // canceling the new trial. Trial provisioning sets
    // subscription_started_at, so markers older than it belong to a prior
    // trial.
    let markerQuery = admin
      .from('subscription_history')
      .select('changed_at')
      .eq('user_id', user.id)
      .like('notes', `${TRIAL_CANCELED_NOTE}%`)
      .order('changed_at', { ascending: false })
      .limit(1);
    if (row.subscription_started_at) {
      markerQuery = markerQuery.gte('changed_at', row.subscription_started_at);
    }
    const { data: cancelMarker } = await markerQuery.maybeSingle();

    const state = deriveTrialAccountState(
      {
        tier: row.subscription_tier ?? 'free',
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        subscriptionEndsAt: row.subscription_ends_at,
        trialCanceledAt: cancelMarker?.changed_at ?? null,
      },
      new Date(),
    );

    const decision = evaluateTrialCancellation(state);

    if (!decision.allowed) {
      return NextResponse.json({ error: decision.error }, { status: 409 });
    }

    const { error: insertError } = await admin
      .from('subscription_history')
      .insert(buildTrialCancelMarkerInsert(user.id, decision.trialEndsAt));

    if (insertError) {
      logError('Trial cancel: failed to write cancellation marker', insertError);
      return NextResponse.json(
        { error: 'Could not record your cancellation. Please try again.' },
        { status: 500 },
      );
    }

    logMessage(
      `Trial canceled for user ${user.id} — Pro preserved through ${decision.trialEndsAt}`,
    );
    return NextResponse.json({
      status: 'trial_canceled',
      trialEndsAt: decision.trialEndsAt,
      message: decision.userMessage,
    });
  } catch (error) {
    logError('Error in trial/cancel:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
