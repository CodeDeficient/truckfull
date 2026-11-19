import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  TRIAL_NOTE_PREFIX,
  resolveTrialEligibility,
  type TrialEligibility,
} from '@/lib/subscription/trialProvisioning';

/**
 * Server-side trial-eligibility read for the pricing page, so the page can
 * present exactly one correct action (trial vs paid upgrade) before any
 * click. Reuses the canonical cooldown logic via resolveTrialEligibility —
 * the same rules provisionFreeTrial enforces at start time, and it fails
 * closed when the profile row cannot be read.
 */
export async function getTrialEligibility(): Promise<TrialEligibility | 'unauthenticated' | 'error'> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error != undefined || user == undefined) {
      return 'unauthenticated';
    }

    const adminClient = getSupabaseAdmin();

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('subscription_tier, stripe_subscription_id, subscription_ends_at')
      .eq('id', user.id)
      .single();

    if (profileError != undefined) {
      return 'error';
    }

    const { data: priorTrials, error: historyError } = await adminClient
      .from('subscription_history')
      .select('changed_at')
      .eq('user_id', user.id)
      .eq('to_tier', 'pro')
      .like('notes', `${TRIAL_NOTE_PREFIX}%`)
      .limit(100);

    if (historyError != undefined) {
      return 'error';
    }

    return resolveTrialEligibility(
      {
        profile: profile
          ? {
              subscription_tier: profile.subscription_tier,
              stripe_subscription_id: profile.stripe_subscription_id,
              subscription_ends_at: profile.subscription_ends_at,
            }
          : null,
        priorTrialRows: (priorTrials ?? []).map((row) => ({
          changed_at: row.changed_at ?? '',
        })),
      },
      new Date(),
    );
  } catch {
    return 'error';
  }
}
