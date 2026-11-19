import { getEffectiveTier } from '@/lib/auth/tierCheck';

/**
 * Input required to evaluate an owner-tools entitlement. The tier is the raw
 * stored value from profiles.subscription_tier — not a normalized one, because
 * comped enterprise accounts have no Stripe identifiers or trial dates and
 * must remain active.
 */
export interface EntitlementInput {
  subscriptionTier: 'free' | 'pro' | 'enterprise' | 'starter' | string;
  stripeSubscriptionId: string | null;
  /** Raw profiles.subscription_ends_at value; may be null or an invalid timestamp. */
  subscriptionEndsAt: string | null;
}

export type OwnerAccessDecision =
  | { allowed: true; reason: 'owner_role' | 'admin' | 'entitlement' }
  | { allowed: false; reason: 'no_access' };

/**
 * Pure: whether the profile grants active paid/trial/comped access.
 *
 * Enterprise is checked against the raw stored tier before any normalization
 * — getEffectiveTier collapses enterprise to 'pro', so a normalized
 * comparison could never reach the enterprise branch. A local trial requires
 * a valid future subscription_ends_at; a paid subscription requires a Stripe
 * subscription id (the customer id alone confers nothing).
 */
export function computeEntitlementActive(
  account: EntitlementInput,
  now: Date,
): boolean {
  if (account.subscriptionTier === 'enterprise') {
    return true;
  }

  if (getEffectiveTier(account.subscriptionTier as 'free' | 'pro' | 'enterprise' | 'starter') !== 'pro') {
    return false;
  }

  if (account.stripeSubscriptionId) {
    return true;
  }

  if (!account.subscriptionEndsAt) {
    return false;
  }

  const endsAtMs = Date.parse(account.subscriptionEndsAt);
  return Number.isFinite(endsAtMs) && endsAtMs > now.getTime();
}

/**
 * Pure: dashboard capability decision from a role plus an entitlement flag.
 * Roles and entitlements stay distinct — entitlement never masquerades as a
 * role, and ownership checks elsewhere remain authoritative for trucks.
 */
export function decideOwnerAccess(
  role: string | null | undefined,
  entitlementActive: boolean,
): OwnerAccessDecision {
  if (role === 'admin') return { allowed: true, reason: 'admin' };
  if (role === 'food_truck_owner') return { allowed: true, reason: 'owner_role' };
  if (entitlementActive) return { allowed: true, reason: 'entitlement' };
  return { allowed: false, reason: 'no_access' };
}