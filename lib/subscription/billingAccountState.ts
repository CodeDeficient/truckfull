/**
 * Billing presentation states derived from a profile row plus the newest
 * trial-cancellation marker. This is presentation-only: access decisions must
 * use computeEntitlementActive (lib/auth/ownerAccess.ts), never this module.
 *
 * Unlike deriveTrialAccountState, this derivation understands comped
 * enterprise accounts (no Stripe identifiers, no dates) and distinguishes a
 * never-provisioned free account from an expired trial (the expiry cron
 * downgrades the tier but leaves subscription_ends_at in the past).
 */

export type BillingAccountState =
  | { kind: 'never_pro' }
  | { kind: 'enterprise' }
  | { kind: 'paid'; stripeSubscriptionId: string }
  | { kind: 'trial_active'; trialEndsAt: string; daysRemaining: number }
  | { kind: 'trial_canceled'; trialEndsAt: string; daysRemaining: number }
  | { kind: 'trial_expired'; trialEndsAt: string | null };

export interface BillingAccountInput {
  subscriptionTier: 'free' | 'pro' | 'enterprise' | 'starter' | string;
  stripeSubscriptionId: string | null;
  /** Raw profiles.subscription_ends_at value; may be null or an invalid timestamp. */
  subscriptionEndsAt: string | null;
  /** changed_at of the newest cancellation marker row in subscription_history. */
  trialCanceledAt: string | null;
}

export function hasActiveBillingAccount(state: BillingAccountState): boolean {
  return (
    state.kind === 'enterprise' ||
    state.kind === 'paid' ||
    state.kind === 'trial_active' ||
    state.kind === 'trial_canceled'
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pure: classify the account for Billing presentation. A free tier with a
 * past end date is an expired trial the cron already downgraded; a free tier
 * with no end date never had Pro.
 */
export function deriveBillingAccountState(
  account: BillingAccountInput,
  now: Date,
): BillingAccountState {
  if (account.subscriptionTier === 'enterprise') {
    return { kind: 'enterprise' };
  }

  if (account.stripeSubscriptionId && account.subscriptionTier === 'pro') {
    return { kind: 'paid', stripeSubscriptionId: account.stripeSubscriptionId };
  }

  const endsAt = account.subscriptionEndsAt;
  const endsAtMs = endsAt ? Date.parse(endsAt) : Number.NaN;
  const hasFutureTrialDate = Number.isFinite(endsAtMs) && endsAtMs > now.getTime();

  if (account.subscriptionTier === 'pro' && hasFutureTrialDate) {
    const daysRemaining = Math.max(
      0,
      Math.ceil((endsAtMs - now.getTime()) / DAY_MS),
    );
    if (account.trialCanceledAt) {
      return { kind: 'trial_canceled', trialEndsAt: endsAt as string, daysRemaining };
    }
    return { kind: 'trial_active', trialEndsAt: endsAt as string, daysRemaining };
  }

  if (Number.isFinite(endsAtMs)) {
    return { kind: 'trial_expired', trialEndsAt: endsAt };
  }

  return { kind: 'never_pro' };
}
