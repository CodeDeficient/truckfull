/**
 * Stripe Checkout Utilities
 *
 * Client-side and server-side functions for creating Stripe checkout sessions
 */

import { type SubscriptionTier } from '@/lib/auth/tierCheck';
import { STRIPE_CONFIG } from './config';
import { logError } from '@/lib/logging';

export interface StripePriceConfig {
  pro: {
    monthly: string;
    yearly: string;
    foundingMonthly: string;
    foundingYearly: string;
  };
}

export function getPriceIdForTier(
  tier: SubscriptionTier,
  interval: 'month' | 'year',
  isFounding: boolean,
  prices: StripePriceConfig,
): string | undefined {
  if (tier === 'starter') {
    tier = 'pro';
  }

  if (tier === 'free' || tier === 'enterprise') {
    return undefined;
  }

  if (tier === 'pro') {
    if (interval === 'year') {
      return isFounding ? prices.pro.foundingYearly : prices.pro.yearly;
    }
    return isFounding ? prices.pro.foundingMonthly : prices.pro.monthly;
  }

  return undefined;
}

/**
 * Checkout deduplication.
 *
 * The checkout route must refuse to open a second subscription for a user
 * whose existing Stripe subscription is still live: every checkout session
 * without an explicit customer creates a NEW Stripe customer, so a repeat
 * purchase would double-bill the user and strand the older subscription.
 * Dead subscription states (canceled / incomplete / incomplete_expired) may
 * re-checkout; the webhook re-binds the profile on completion.
 */

export type CheckoutDedupOutcome =
  | { allowed: true; customerId: string | null }
  | { allowed: false; reason: 'already_subscribed' | 'verification_unavailable' };

const LIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);
const DEAD_SUBSCRIPTION_STATUSES = new Set(['canceled', 'incomplete', 'incomplete_expired']);

/** Pure decision: is a Stripe subscription with this status a blocker? */
export function decideExistingSubscription(status: string): 'allow' | 'block' | 'unverifiable' {
  if (LIVE_SUBSCRIPTION_STATUSES.has(status)) return 'block';
  if (DEAD_SUBSCRIPTION_STATUSES.has(status)) return 'allow';
  return 'unverifiable';
}

/** Fetch the status of a Stripe subscription; a missing record reads as canceled. */
export async function getStripeSubscriptionStatus(subscriptionId: string): Promise<string> {
  const stripeModule = await import('stripe');
  const Stripe = stripeModule.default;
  const stripe = new Stripe(STRIPE_CONFIG.secretKey, {
    apiVersion: '2025-10-29.clover',
  });
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.status;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'resource_missing'
    ) {
      return 'canceled';
    }
    throw error;
  }
}

/**
 * Decide whether checkout may proceed for a user, given their recorded
 * billing state and a way to verify it against Stripe. Dependencies are
 * injected so the decision table is testable without mocks.
 */
export async function resolveCheckoutDedup(deps: {
  getBillingState: () => Promise<{
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }>;
  getSubscriptionStatus: (subscriptionId: string) => Promise<string>;
}): Promise<CheckoutDedupOutcome> {
  const { stripeCustomerId, stripeSubscriptionId } = await deps.getBillingState();

  if (!stripeSubscriptionId) {
    return { allowed: true, customerId: stripeCustomerId };
  }

  let status: string;
  try {
    status = await deps.getSubscriptionStatus(stripeSubscriptionId);
  } catch {
    return { allowed: false, reason: 'verification_unavailable' };
  }

  const decision = decideExistingSubscription(status);
  if (decision === 'allow') {
    return { allowed: true, customerId: stripeCustomerId };
  }
  return {
    allowed: false,
    reason: decision === 'block' ? 'already_subscribed' : 'verification_unavailable',
  };
}

/**
 * Create a Stripe checkout session (server-side only)
 */
export async function createCheckoutSession(params: {
  userId: string;
  userEmail: string;
  tier: SubscriptionTier;
  isFoundingMember?: boolean;
  interval?: 'month' | 'year';
  foundingReservationId?: string;
  foundingOffer?: 'founding_monthly' | 'founding_yearly';
  /** Existing Stripe customer id — reusing it prevents duplicate customers. */
  customerId?: string;
}): Promise<{ id: string; url: string } | { error: string }> {
  try {
    const stripeModule = await import('stripe');
    const Stripe = stripeModule.default;
    const stripe = new Stripe(STRIPE_CONFIG.secretKey, {
      apiVersion: '2025-10-29.clover',
    });

    const effectiveTier: 'pro' | 'free' | 'enterprise' =
      params.tier === 'starter' ? 'pro' : params.tier;

    if (effectiveTier === 'free' || effectiveTier === 'enterprise') {
      return { error: 'Checkout not available for this tier' };
    }

    const priceId = (() => {
      const interval = params.interval || 'month';
      const isFounding = params.isFoundingMember;

      if (interval === 'year') {
        return isFounding
          ? STRIPE_CONFIG.prices.pro.foundingYearly
          : STRIPE_CONFIG.prices.pro.yearly;
      }
      return isFounding
        ? STRIPE_CONFIG.prices.pro.foundingMonthly
        : STRIPE_CONFIG.prices.pro.monthly;
    })();

    if (!priceId) {
      return { error: 'Price not configured for this tier' };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: STRIPE_CONFIG.urls.success,
      cancel_url: STRIPE_CONFIG.urls.cancel,
      // Reuse the existing customer when known so repeat purchases attach to
      // the same Stripe customer instead of creating a duplicate one.
      ...(params.customerId
        ? { customer: params.customerId }
        : { customer_email: params.userEmail }),
      client_reference_id: params.userId,
      metadata: {
        userId: params.userId,
        tier: effectiveTier,
        isFoundingMember: params.isFoundingMember ? 'true' : 'false',
        ...(params.foundingReservationId
          ? {
              foundingReservationId: params.foundingReservationId,
              foundingOffer: params.foundingOffer,
              foundingPriceId: priceId,
            }
          : {}),
      },
      subscription_data: {
        metadata: {
          userId: params.userId,
          tier: effectiveTier,
        },
      },
    });

    return { id: session.id, url: session.url ?? '' };
  } catch (error) {
    logError('Error creating checkout session:', error);
    return { error: 'Failed to create checkout session' };
  }
}

export async function expireCheckoutSession(sessionId: string): Promise<boolean> {
  try {
    const stripeModule = await import('stripe');
    const Stripe = stripeModule.default;
    const stripe = new Stripe(STRIPE_CONFIG.secretKey, {
      apiVersion: '2025-10-29.clover',
    });
    await stripe.checkout.sessions.expire(sessionId);
    return true;
  } catch (error) {
    logError('Error expiring checkout session:', error);
    return false;
  }
}

/**
 * Client-side function to initiate checkout
 */
export async function initiateCheckout(params: {
  tier: SubscriptionTier;
  isFoundingMember?: boolean;
  interval?: 'month' | 'year';
}): Promise<{ success: boolean; error?: string; foundingUnavailable?: boolean }> {
  try {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tier: params.tier,
        isFoundingMember: params.isFoundingMember ?? false,
        interval: params.interval ?? 'month',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error ?? 'Failed to create checkout session',
        foundingUnavailable: response.status === 409 && data.code === 'founding_unavailable',
      };
    }

    if (!data.url) {
      return { success: false, error: 'No checkout URL returned' };
    }

    globalThis.location.href = data.url;
    return { success: true };
  } catch (error) {
    logError('Error initiating checkout:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create a Stripe customer portal session (for managing subscriptions)
 */
export async function createPortalSession(
  customerId: string,
): Promise<{ url: string } | { error: string }> {
  try {
    const stripeModule = await import('stripe');
    const Stripe = stripeModule.default;
    const stripe = new Stripe(STRIPE_CONFIG.secretKey, {
      apiVersion: '2025-10-29.clover',
    });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: STRIPE_CONFIG.urls.success,
    });

    return { url: session.url };
  } catch (error) {
    logError('Error creating portal session:', error);
    return { error: 'Failed to create portal session' };
  }
}
