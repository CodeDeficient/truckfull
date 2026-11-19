import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { computeEntitlementActive } from '@/lib/auth/ownerAccess';
import { logError, logMessage } from '@/lib/logging';
import { getPosthogClient } from '@/lib/analytics/posthog';
import { buildTrialStarted, type TrialSource } from '@/lib/analytics/funnel';

const TRIAL_DAYS = 30;
const TRIAL_COOLDOWN_MONTHS = 12;

/**
 * Legacy rows wrote the truck-claim sentence verbatim; new rows append the
 * provisioning source after a shared prefix. Cooldown and webhook lookups
 * match on this prefix so both shapes count as prior trials.
 */
export const TRIAL_NOTE_PREFIX = '30-day free trial provisioned';
const LEGACY_TRIAL_NOTE = `${TRIAL_NOTE_PREFIX} on truck claim`;

async function trackTrialStarted(userId: string, source: TrialSource): Promise<void> {
  const client = getPosthogClient();
  const { event, properties } = buildTrialStarted(source);
  await client.track(event, { ...properties, user_id: userId });
  await client.flush();
}

export type TrialProvisionResult =
  | { success: true; provisioned: true; trialEndsAt: string }
  | { success: true; provisioned: false; reason: 'already_had_trial' | 'already_pro' }
  | { success: false };

export function calculateTrialEndDate(): Date {
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);
  return endsAt;
}

export function hasAlreadyHadTrial(
  historyRows: Array<{ changed_at: string }>,
  referenceDate: Date,
): boolean {
  const cutoff = new Date(referenceDate);
  cutoff.setMonth(cutoff.getMonth() - TRIAL_COOLDOWN_MONTHS);

  return historyRows.some((row) => new Date(row.changed_at) >= cutoff);
}

/**
 * Mirrors the SQL guard in provisionFreeTrial's conditional UPDATE.
 * The SQL WHERE clause (.eq('subscription_tier', 'free').or(...)) is the
 * authoritative source of truth — this function exists for testability and
 * debugging only. If they diverge, the SQL wins.
 */
export function shouldProvisionTrial(
  currentTier: string | null | undefined,
  currentEndsAt: string | null | undefined,
): boolean {
  if (currentTier !== 'free') return false;
  if (!currentEndsAt) return true;
  return new Date(currentEndsAt) <= new Date();
}

export function buildTrialUpdatePayload(endsAt: Date) {
  return {
    subscription_tier: 'pro' as const,
    subscription_started_at: new Date().toISOString(),
    subscription_ends_at: endsAt.toISOString(),
  };
}

export function buildTrialHistoryInsert(userId: string, source: TrialSource = 'claim') {
  const note =
    source === 'claim' ? LEGACY_TRIAL_NOTE : `${TRIAL_NOTE_PREFIX} via ${source}`;
  return {
    user_id: userId,
    from_tier: 'free' as const,
    to_tier: 'pro' as const,
    notes: note,
  };
}

export type TrialEligibility =
  | { eligible: true }
  | { eligible: false; reason: 'active_entitlement'; currentTier: 'pro' | 'enterprise' }
  | { eligible: false; reason: 'cooldown' | 'inactive_entitlement' | 'unsupported_tier' };

/**
 * Pure: trial-eligibility decision from the caller's tier and trial history.
 * Reuses hasAlreadyHadTrial so the 12-month cooldown lives in exactly one
 * place. Server endpoints must revalidate with provisionFreeTrial's SQL
 * guard; this function exists so UI can present the correct action without
 * triggering a failed start.
 */
export function evaluateTrialEligibility(
  params: {
    subscriptionTier: string | null | undefined;
    stripeSubscriptionId?: string | null;
    subscriptionEndsAt?: string | null;
    /** Rows in subscription_history matching the trial-provisioned note. */
    priorTrialRows: Array<{ changed_at: string }>;
  },
  referenceDate: Date,
): TrialEligibility {
  const currentTier = params.subscriptionTier;
  if (
    (currentTier === 'pro' || currentTier === 'enterprise') &&
    computeEntitlementActive(
      {
        subscriptionTier: currentTier,
        stripeSubscriptionId: params.stripeSubscriptionId ?? null,
        subscriptionEndsAt: params.subscriptionEndsAt ?? null,
      },
      referenceDate,
    )
  ) {
    return {
      eligible: false,
      reason: 'active_entitlement',
      currentTier,
    };
  }
  if (currentTier === 'pro') {
    return { eligible: false, reason: 'inactive_entitlement' };
  }
  if (currentTier === 'starter') {
    return { eligible: false, reason: 'unsupported_tier' };
  }
  if (hasAlreadyHadTrial(params.priorTrialRows, referenceDate)) {
    return { eligible: false, reason: 'cooldown' };
  }
  return { eligible: true };
}

/**
 * Fail-closed wrapper: a failed profile read must never fall through to the
 * trial CTA, because eligibility cannot be verified. Callers render the
 * auth-link CTA for the returned 'error'.
 */
export function resolveTrialEligibility(
  params: {
    profile: {
      subscription_tier: string | null;
      stripe_subscription_id: string | null;
      subscription_ends_at: string | null;
    } | null;
    priorTrialRows: Array<{ changed_at: string }>;
  },
  referenceDate: Date,
): TrialEligibility | 'error' {
  if (!params.profile) return 'error';
  return evaluateTrialEligibility(
    {
      subscriptionTier: params.profile.subscription_tier,
      stripeSubscriptionId: params.profile.stripe_subscription_id,
      subscriptionEndsAt: params.profile.subscription_ends_at,
      priorTrialRows: params.priorTrialRows,
    },
    referenceDate,
  );
}

export async function provisionFreeTrial(
  userId: string,
  source: TrialSource = 'claim',
): Promise<TrialProvisionResult> {
  try {
    const supabase = getSupabaseAdmin();

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - TRIAL_COOLDOWN_MONTHS);

    const { data: priorTrials, error: historyError } = await supabase
      .from('subscription_history')
      .select('changed_at')
      .eq('user_id', userId)
      .eq('to_tier', 'pro')
      .like('notes', `${TRIAL_NOTE_PREFIX}%`)
      .gte('changed_at', cutoff.toISOString())
      .limit(1);

    if (historyError) {
      logError('Trial provisioning: failed to check history', historyError);
      return { success: false };
    }

    if (priorTrials && priorTrials.length > 0) {
      logMessage(
        `Trial provisioning skipped for user ${userId} — already had a trial in the last 12 months`,
      );
      return { success: true, provisioned: false, reason: 'already_had_trial' };
    }

    const endsAt = calculateTrialEndDate();

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update(buildTrialUpdatePayload(endsAt))
      .eq('id', userId)
      .eq('subscription_tier', 'free')
      .or(`subscription_ends_at.lte.${new Date().toISOString()},subscription_ends_at.is.null`)
      .select('id')
      .maybeSingle();

    if (updateError) {
      logError('Trial provisioning: failed to update profile', updateError);
      return { success: false };
    }

    if (!updated) {
      logMessage(`Trial provisioning skipped for user ${userId} — already on Pro or active trial`);
      return { success: true, provisioned: false, reason: 'already_pro' };
    }

    const { error: insertError } = await supabase
      .from('subscription_history')
      .insert(buildTrialHistoryInsert(userId, source));

    if (insertError) {
      logError('Trial provisioning: failed to log subscription_history', insertError);
    }

    await trackTrialStarted(userId, source).catch(() => {});

    logMessage(`Trial provisioned for user ${userId} — Pro until ${endsAt.toISOString()}`);
    return { success: true, provisioned: true, trialEndsAt: endsAt.toISOString() };
  } catch (error) {
    logError('Trial provisioning: unexpected error', error);
    return { success: false };
  }
}
