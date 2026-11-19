/**
 * TruckFull-managed trial state derivation.
 *
 * Pure functions that classify an account's billing state from its profile
 * row plus the newest trial-cancellation marker in subscription_history.
 * The UI and the cancel-trial route branch on these results.
 *
 * Terminology (#1305): "TruckFull-managed trial" = trial provisioned and
 * tracked entirely in TruckFull's database, independent of Stripe.
 */

export type TrialAccountState =
  | { kind: 'free' }
  | { kind: 'trial_active'; trialEndsAt: string | null; daysRemaining: number }
  | { kind: 'trial_canceled'; trialEndsAt: string | null; daysRemaining: number }
  | { kind: 'trial_expired'; trialEndsAt: string | null }
  | { kind: 'paid'; stripeSubscriptionId: string };

export interface TrialAccountInput {
  /** profiles.subscription_tier */
  tier: string;
  /** profiles.stripe_customer_id — does NOT by itself confer paid access. */
  stripeCustomerId: string | null;
  /** profiles.stripe_subscription_id — the paid-access signal. */
  stripeSubscriptionId: string | null;
  /** profiles.subscription_ends_at — the trial's original end timestamp. */
  subscriptionEndsAt: string | null;
  /** changed_at of the newest cancellation marker row in subscription_history. */
  trialCanceledAt: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function deriveTrialAccountState(
  account: TrialAccountInput,
  now: Date,
): TrialAccountState {
  if (account.stripeSubscriptionId) {
    return { kind: 'paid', stripeSubscriptionId: account.stripeSubscriptionId };
  }

  if (account.tier !== 'pro') {
    return { kind: 'free' };
  }

  // Pro with no Stripe subscription: a TruckFull-managed trial. The profile
  // may lag the cron downgrade, so an endsAt in the past is expired.
  const endsAt = account.subscriptionEndsAt;
  if (!endsAt || new Date(endsAt).getTime() <= now.getTime()) {
    return { kind: 'trial_expired', trialEndsAt: endsAt };
  }

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(endsAt).getTime() - now.getTime()) / DAY_MS),
  );

  if (account.trialCanceledAt) {
    return { kind: 'trial_canceled', trialEndsAt: endsAt, daysRemaining };
  }

  return { kind: 'trial_active', trialEndsAt: endsAt, daysRemaining };
}

/** Pure: portal eligibility. A Stripe customer ID alone is insufficient. */
export function isPortalEligible(account: {
  tier: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}): boolean {
  return account.tier === 'pro' && account.stripeSubscriptionId !== null;
}

/** The subscription_history note marking a canceled TruckFull-managed trial. */
export const TRIAL_CANCELED_NOTE = 'TruckFull-managed trial canceled by user';

export const CANCEL_TRIAL_ERRORS = {
  NOT_ACTIVE: 'No active trial to cancel',
  ALREADY_CANCELED: 'Your trial cancellation is already scheduled',
} as const;

export type TrialCancellationDecision =
  | { allowed: true; trialEndsAt: string; userMessage: string }
  | { allowed: false; error: string };

/** Shared date format for trial-end display — UTC-explicit so the server
 * (cancel confirmation) and the client (status panel) always agree. */
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
};

export function formatTrialEndDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', DATE_FORMAT_OPTIONS);
}

/**
 * Pure: decide whether a cancel-trial request may proceed, and what the user
 * should be told. Per #1305's documented decision, cancellation schedules the
 * trial's end at the original trial_ends_at: the user retains Pro access until
 * that timestamp, is never charged, then returns to Free.
 */
export function evaluateTrialCancellation(
  state: TrialAccountState,
): TrialCancellationDecision {
  if (state.kind === 'trial_canceled') {
    return { allowed: false, error: CANCEL_TRIAL_ERRORS.ALREADY_CANCELED };
  }
  if (state.kind !== 'trial_active') {
    return { allowed: false, error: CANCEL_TRIAL_ERRORS.NOT_ACTIVE };
  }
  // The derivation never returns trial_active with a null endsAt (that shape
  // is trial_expired), so the guard below is a type-level assertion only.
  if (!state.trialEndsAt) {
    return { allowed: false, error: CANCEL_TRIAL_ERRORS.NOT_ACTIVE };
  }
  const endsAtText = formatTrialEndDate(state.trialEndsAt);
  return {
    allowed: true,
    trialEndsAt: state.trialEndsAt,
    userMessage:
      `Your trial cancellation is scheduled. You keep Pro access until ${endsAtText}, ` +
      'and you will not be charged. After that date your account returns to the Free plan.',
  };
}

/** Pure: the subscription_history marker recording cancellation intent. */
export function buildTrialCancelMarkerInsert(userId: string, trialEndsAt: string) {
  return {
    user_id: userId,
    from_tier: 'pro',
    to_tier: 'pro',
    notes: `${TRIAL_CANCELED_NOTE} — Pro preserved through trial end (${trialEndsAt})`,
  };
}

/**
 * Honest billing-history copy (#1302): TruckFull does not yet fetch Stripe
 * invoices, so the Billing tab never renders invoice rows — paid subscribers
 * are pointed at the Stripe portal (Manage Billing) for official invoices.
 */
export const BILLING_HISTORY_NOTE =
  "In-app invoice history isn't available yet. Your official Stripe invoices " +
  'are in the billing portal — open Manage Billing to view and download them.';

/** Pure: whether the Billing tab renders its billing-history card. Only a
 * derived paid state shows it; loading (null) and the permissive 'error'
 * degrade show nothing, so no account type is ever shown billing history it
 * has not been derived to have (#1302: trial-only and Free users must never
 * be shown UI implying Stripe billing history exists). */
export function shouldShowBillingHistory(
  view: BillingTabView | 'error' | null,
): boolean {
  return view !== null && view !== 'error' && view.showBillingHistory;
}

/** Pure: which UI affordances the Billing tab renders for an account state. */
export interface BillingTabView {
  showTrialStatus: boolean;
  trialStatusText: string | null;
  showCancelTrial: boolean;
  showManageBilling: boolean;
  showBillingHistory: boolean;
}

export function buildBillingTabView(state: TrialAccountState): BillingTabView {
  if (state.kind === 'paid') {
    return {
      showTrialStatus: false,
      trialStatusText: null,
      showCancelTrial: false,
      showManageBilling: true,
      showBillingHistory: true,
    };
  }

  if (state.kind === 'free') {
    return {
      showTrialStatus: false,
      trialStatusText: null,
      showCancelTrial: false,
      showManageBilling: false,
      showBillingHistory: false,
    };
  }

  // Remaining cases: trial_active | trial_canceled | trial_expired.
  const trial = state;

  if (trial.kind === 'trial_expired') {
    return {
      showTrialStatus: true,
      trialStatusText: 'Your free trial has ended. Upgrade to keep Pro features.',
      showCancelTrial: false,
      showManageBilling: false,
      showBillingHistory: false,
    };
  }

  const endsAtText = trial.trialEndsAt
    ? formatTrialEndDate(trial.trialEndsAt)
    : 'an unknown date';

  if (trial.kind === 'trial_canceled') {
    return {
      showTrialStatus: true,
      trialStatusText: `Trial canceled — you keep Pro access until ${endsAtText}, then your account returns to Free. You will not be charged.`,
      showCancelTrial: false,
      showManageBilling: false,
      showBillingHistory: false,
    };
  }

  return {
    showTrialStatus: true,
    trialStatusText: `Free trial — ${trial.daysRemaining} ${
      trial.daysRemaining === 1 ? 'day' : 'days'
    } remaining (ends ${endsAtText}). You will not be charged.`,
    showCancelTrial: true,
    showManageBilling: false,
    showBillingHistory: false,
  };
}
