/**
 * Canonical subscription reconciliation.
 *
 * Webhook subscription events do not apply the event payload directly —
 * event delivery is unordered and Stripe's own event payload can be stale
 * relative to a newer update that arrives first. Instead, the webhook fetches
 * the canonical subscription from Stripe and derives the profile update from
 * it, so any two deliveries of any subscription event series converge on the
 * same profile state regardless of arrival order.
 *
 * Tier policy (user-approved):
 * - Only the `active` Stripe status grants paid access. Later payment while
 *   past_due restores Pro because the canonical fetch sees `active` again.
 * - The local 30-day trial is independent of Stripe: revocation derives any
 *   remaining trial from the last trial-grant history row, so a paid
 *   subscription ending never shortens a trial that is still live.
 */

export interface CanonicalSubscription {
  id: string;
  customerId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  tier: string;
}

export interface ProfileBillingState {
  subscriptionTier: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** changed_at of the most recent trial-grant history row, if any. */
  trialGrant: string | null;
}

export type TrialSurvival = {
  survives: boolean;
  tier: 'pro' | 'free';
  endsAt: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Pure: with paid access revoked, does a local trial keep the user on pro? */
export function deriveTrialSurvival(
  trialGrantChangedAt: string | null,
  now: Date,
  trialDays: number,
): TrialSurvival {
  if (!trialGrantChangedAt) {
    return { survives: false, tier: 'free', endsAt: null };
  }
  const endsAtMs = new Date(trialGrantChangedAt).getTime() + trialDays * DAY_MS;
  if (endsAtMs <= now.getTime()) {
    return { survives: false, tier: 'free', endsAt: null };
  }
  return {
    survives: true,
    tier: 'pro',
    endsAt: new Date(endsAtMs).toISOString(),
  };
}

/**
 * Pure: derive the canonical profile update from the subscription Stripe
 * currently reports plus the profile's recorded state. The trial's durable
 * record is the subscription_history grant row — this update never erases
 * history; it writes tier, Stripe identity, and the trial end date only.
 * Idempotent: any delivery series converges on this same derived state.
 */
export function computeSubscriptionProfileUpdate(
  subscription: CanonicalSubscription,
  profileState: ProfileBillingState,
  now: Date,
  trialDays = 30,
): {
  subscription_tier: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_ends_at: string | null;
} {
  const grantsPaid = subscription.status === 'active';

  const trial = deriveTrialSurvival(profileState.trialGrant, now, trialDays);

  if (grantsPaid) {
    const tier = subscription.tier === 'free' ? 'free' : 'pro';
    // While active, the period end is visible only when the user has
    // scheduled cancellation (the UI surfaces subscription_ends_at).
    const endsAt =
      subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd
        ? subscription.currentPeriodEnd
        : null;
    return {
      subscription_tier: tier,
      stripe_customer_id: subscription.customerId,
      stripe_subscription_id: subscription.id,
      subscription_ends_at: endsAt,
    };
  }

  // No paid access from this subscription.
  if (subscription.status === 'canceled') {
    // The subscription object is gone for good: release the binding so the
    // user can start a fresh checkout, and fall back to trial/free.
    return {
      subscription_tier: trial.survives ? trial.tier : 'free',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_ends_at: trial.survives ? trial.endsAt : now.toISOString(),
    };
  }

  // Live-but-unpaid states (past_due, unpaid, paused, trialing…): access is
  // revoked immediately (policy), but the binding survives so a later
  // recovery event re-grants. A live local trial keeps the user on pro.
  return {
    subscription_tier: trial.survives ? trial.tier : 'free',
    stripe_customer_id: subscription.customerId,
    stripe_subscription_id: subscription.id,
    subscription_ends_at: trial.survives ? trial.endsAt : null,
  };
}
