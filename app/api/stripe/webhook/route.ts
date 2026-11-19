import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { TRIAL_NOTE_PREFIX } from '@/lib/subscription/trialProvisioning';
import { STRIPE_CONFIG } from '@/lib/stripe/config';
import { claimLeaseUntil, decideWebhookClaim, isLeaseExpired } from '@/lib/stripe/webhookClaim';
import {
  computeSubscriptionProfileUpdate,
  type CanonicalSubscription,
} from '@/lib/stripe/subscriptionReconcile';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { logDebug, logError } from '@/lib/logging';
import type { Json } from '@/lib/database.remote.types';
import { getPosthogClient } from '@/lib/analytics/posthog';
import { buildSubscriptionActivated } from '@/lib/analytics/funnel';

export const runtime = 'nodejs';

type FoundingOffer = 'founding_monthly' | 'founding_yearly';

function isFoundingOffer(value: string | undefined): value is FoundingOffer {
  return value === 'founding_monthly' || value === 'founding_yearly';
}

function getLegacyFoundingPriceIds(offer: FoundingOffer): string[] {
  return offer === 'founding_yearly'
    ? [STRIPE_CONFIG.prices.pro.foundingYearly, ...STRIPE_CONFIG.prices.pro.foundingYearlyLegacy]
    : [STRIPE_CONFIG.prices.pro.foundingMonthly, ...STRIPE_CONFIG.prices.pro.foundingMonthlyLegacy];
}

async function reconcileFoundingMembership(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const reservationId = session.metadata?.foundingReservationId;
  const offer = session.metadata?.foundingOffer;
  if (!reservationId && !offer) return;
  if (session.payment_status !== 'paid') {
    throw new Error('Founding checkout is not paid');
  }
  if (!reservationId || !isFoundingOffer(offer)) {
    throw new Error('Incomplete founding reservation metadata');
  }

  const profileId = session.metadata?.userId;
  const customerId = typeof session.customer === 'string' ? session.customer : null;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
  if (!profileId || !customerId || !subscriptionId) {
    throw new Error('Founding checkout is missing subscription identity');
  }

  const expectedPriceIds = session.metadata?.foundingPriceId
    ? [session.metadata.foundingPriceId]
    : getLegacyFoundingPriceIds(offer);
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
  const hasExpectedPrice = lineItems.data.some((item) =>
    expectedPriceIds.includes(item.price?.id ?? ''),
  );
  if (!hasExpectedPrice) {
    throw new Error('Founding checkout price does not match its reserved offer');
  }

  const { data, error } = await getSupabaseAdmin().rpc('reconcile_verified_founding_membership', {
    p_reservation_id: reservationId,
    p_profile_id: profileId,
    p_checkout_session_id: session.id,
    p_offer: offer,
    p_customer_id: customerId,
    p_subscription_id: subscriptionId,
  });
  const result = data?.[0];
  if (error || !result) {
    throw new Error(error?.message ?? 'Founding membership reconciliation failed');
  }
  if (result.outcome === 'conflict') {
    // The price and identity checks above already passed, so the customer
    // paid the founding price. A conflict means a permanent entitlement
    // cannot be created for this profile, so fail the webhook and let
    // Stripe retry rather than acknowledging the checkout without one.
    throw new Error(`Founding membership reconciliation conflict: ${result.reason}`);
  }
}

async function expireFoundingReservation(session: Stripe.Checkout.Session): Promise<void> {
  const reservationId = session.metadata?.foundingReservationId;
  if (!reservationId) return;
  const { error } = await getSupabaseAdmin().rpc('expire_founding_reservation', {
    p_reservation_id: reservationId,
    p_checkout_session_id: session.id,
  });
  if (error) throw new Error(`Failed to expire founding reservation: ${error.message}`);
}

const TRIAL_DAYS = 30;

function toCanonicalSubscription(subscription: Stripe.Subscription): CanonicalSubscription {
  const firstItem = subscription.items.data[0];
  return {
    id: subscription.id,
    customerId:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd:
      typeof firstItem?.current_period_end === 'number'
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null,
    tier: subscription.metadata?.tier ?? 'pro',
  };
}

async function fetchBoundProfile(supabase: SupabaseClient, customerId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, subscription_tier, stripe_customer_id, stripe_subscription_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
  return profile;
}

async function fetchLatestTrialGrant(supabase: SupabaseClient, profileId: string) {
  const { data: trialGrantRow } = await supabase
    .from('subscription_history')
    .select('changed_at')
    .eq('user_id', profileId)
    .eq('to_tier', 'pro')
    .like('notes', `${TRIAL_NOTE_PREFIX}%`)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return trialGrantRow?.changed_at ?? null;
}

/**
 * Fetch the canonical subscription and derive the profile update from it.
 * Event payloads are unordered and may be stale; the canonical fetch makes
 * any delivery series converge on the same profile state. Returns null when
 * no profile is bound to the subscription's customer.
 */
async function deriveSubscriptionUpdate(stripe: Stripe, eventSubscription: Stripe.Subscription) {
  // The canonical subscription — not the event payload.
  const canonical = toCanonicalSubscription(
    await stripe.subscriptions.retrieve(eventSubscription.id),
  );

  const supabase = getSupabaseAdmin();
  const profile = await fetchBoundProfile(supabase, canonical.customerId);
  if (!profile) return null;

  // Reconciliation is per-subscription, not per-customer: an event for a
  // superseded subscription (e.g. a delayed cancel of the sub a user just
  // replaced) must not touch a profile bound to a different, live one.
  if (profile.stripe_subscription_id && profile.stripe_subscription_id !== canonical.id) {
    logDebug(
      `[Stripe Webhook] Event for superseded subscription ${canonical.id} (profile bound to ${profile.stripe_subscription_id}), ignoring`,
    );
    return null;
  }

  const update = computeSubscriptionProfileUpdate(
    canonical,
    {
      subscriptionTier: profile.subscription_tier ?? 'free',
      stripeCustomerId: profile.stripe_customer_id,
      stripeSubscriptionId: profile.stripe_subscription_id,
      trialGrant: await fetchLatestTrialGrant(supabase, profile.id),
    },
    new Date(),
    TRIAL_DAYS,
  );

  return {
    profileId: profile.id,
    fromTier: profile.subscription_tier ?? 'free',
    update,
  };
}

export async function POST(request: Request) {
  const startTime = Date.now();
  let eventId: string | undefined;

  try {
    const body = await request.text();
    const reqHeaders = await headers();
    const signature = reqHeaders.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // Use the default Stripe API version from the library
    const { Stripe: StripeClient } = await import('stripe');
    if (!STRIPE_CONFIG.secretKey) {
      throw new Error('STRIPE_RESTRICTED_KEY is not set');
    }

    const stripe = new StripeClient(STRIPE_CONFIG.secretKey);

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_CONFIG.webhookSecret ?? '');
    } catch (error) {
      logError('[Stripe Webhook] Signature verification failed:', error);
      // Webhook signature verification failed
      return NextResponse.json({ error: `Webhook signature verification failed` }, { status: 400 });
    }

    eventId = event.id;
    const supabase = getSupabaseAdmin();

    // ============================================================================
    // IDEMPOTENCY / CLAIM — lease-based event claiming
    // ============================================================================
    //
    // A 'processing' row is only an in-flight claim while its lease is fresh.
    // A crashed or restarted worker leaves the row stranded; the lease expiry
    // lets the next Stripe retry re-claim it instead of acknowledging a
    // never-processed event forever.

    const leaseUntil = claimLeaseUntil();
    const { data: existingEvent, error: fetchError } = await supabase
      .from('stripe_webhook_events')
      .select('id, status, lease_expires_at')
      .eq('id', event.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected for new events
      // Any other error is a real problem
      logError(`[Stripe Webhook] Failed to check event ${event.id}:`, fetchError);
      throw new Error(`Failed to check event status: ${fetchError.message}`);
    }

    const existingRow = existingEvent
      ? {
          status: existingEvent.status,
          leaseExpired: isLeaseExpired(existingEvent.lease_expires_at, new Date()),
        }
      : null;

    if (decideWebhookClaim(existingRow) === 'duplicate') {
      logDebug(`[Stripe Webhook] Event ${event.id} already ${existingRow?.status ?? 'claimed'}`);
      return NextResponse.json({
        received: true,
        status: 'duplicate',
        message: `Event already ${existingRow?.status ?? 'claimed'}`,
      });
    }

    let claimed = false;
    if (existingRow) {
      // Re-claim: failed events unconditionally, expired-lease processing
      // rows conditionally. The conditional update is the race-safe claim:
      // only one worker's update can match a claimable row.
      const reclaim = supabase
        .from('stripe_webhook_events')
        .update({ status: 'processing', lease_expires_at: leaseUntil.toISOString() })
        .eq('id', event.id);
      const guarded =
        existingRow.status === 'failed'
          ? reclaim.eq('status', 'failed')
          : reclaim
              .in('status', ['processing', 'pending'])
              .or(`lease_expires_at.is.null,lease_expires_at.lt.${new Date().toISOString()}`);
      const { data: reclaimed, error: reclaimError } = await guarded.select('id').single();

      if (reclaimError) {
        if (reclaimError.code === 'PGRST116') {
          // Another worker re-claimed first; nothing left to do here.
          logDebug(`[Stripe Webhook] Event ${event.id} re-claimed by another worker`);
          return NextResponse.json({ received: true, status: 'duplicate' });
        }
        logError(`[Stripe Webhook] Failed to re-claim event ${event.id}:`, reclaimError);
        return NextResponse.json(
          { received: true, status: 'error', message: 'Failed to claim event' },
          { status: 500 },
        );
      }
      claimed = reclaimed !== null;
    } else {
      // Record event as being processed — insert is the atomic claim.
      const { error: insertError } = await supabase.from('stripe_webhook_events').insert({
        id: event.id,
        type: event.type,
        data: event.data as unknown as Json, // Cast Stripe data to database Json type
        status: 'processing', // Atomically claim work to prevent race conditions
        lease_expires_at: leaseUntil.toISOString(),
        processing_duration_ms: 0, // Will update at the end
      });

      if (insertError) {
        // Check for Postgres duplicate-key error (23505)
        if (insertError.code === '23505') {
          logDebug(`[Stripe Webhook] Duplicate event detected for ${event.id}`);
          return NextResponse.json({ received: true, status: 'duplicate' });
        }

        // Other DB errors - log and let Stripe retry
        logError(`[Stripe Webhook] Failed to insert event ${event.id}:`, insertError);
        return NextResponse.json(
          { received: true, status: 'error', message: 'Failed to record event' },
          { status: 500 },
        );
      }
      claimed = true;
    }

    if (!claimed) {
      return NextResponse.json({ received: true, status: 'duplicate' });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        await reconcileFoundingMembership(stripe, session);

        if (userId && tier) {
          // Fetch current tier for accurate audit trail
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', userId)
            .single();

          const { error } = await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_started_at: new Date().toISOString(),
              subscription_ends_at: null,
            })
            .eq('id', userId);

          if (error) {
            logError('[Stripe Webhook] Failed to update subscription for user:', error);
            throw new Error(`Failed to update subscription: ${error.message}`);
          }

          const { error: historyError } = await supabase.from('subscription_history').insert({
            user_id: userId,
            from_tier: currentProfile?.subscription_tier ?? 'free',
            to_tier: tier,
            stripe_invoice_id: session.invoice as string,
            notes: 'Initial subscription via Stripe checkout',
          });

          if (historyError) {
            logError('[Stripe Webhook] Failed to log subscription_history:', historyError);
          }

          const { event: funnelEvent, properties } = buildSubscriptionActivated(
            tier,
            currentProfile?.subscription_tier ?? 'free',
            event.id,
          );
          await getPosthogClient()
            .track(funnelEvent, { ...properties, user_id: userId })
            .then(() => getPosthogClient().flush())
            .catch(() => {});
        }
        break;
      }

      case 'checkout.session.expired': {
        await expireFoundingReservation(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case 'customer.subscription.updated': {
        const eventSubscription = event.data.object as Stripe.Subscription;
        const reconciled = await deriveSubscriptionUpdate(stripe, eventSubscription);

        if (reconciled?.update) {
          const { error } = await supabase
            .from('profiles')
            .update(reconciled.update)
            .eq('id', reconciled.profileId);

          if (error) {
            logError('[Stripe Webhook] Failed to update subscription tier:', error);
            throw new Error(`Failed to update subscription tier: ${error.message}`);
          }

          // History rows record tier transitions only — converged replays
          // of the same state must not spam the audit trail.
          if (reconciled.update.subscription_tier !== reconciled.fromTier) {
            const { error: historyError } = await supabase.from('subscription_history').insert({
              user_id: reconciled.profileId,
              from_tier: reconciled.fromTier,
              to_tier: reconciled.update.subscription_tier,
              notes: 'Subscription reconciled from Stripe',
            });

            if (historyError) {
              logError('[Stripe Webhook] Failed to log subscription_history:', historyError);
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const eventSubscription = event.data.object as Stripe.Subscription;
        // Deleted subscriptions remain retrievable on Stripe with a terminal
        // status; the canonical fetch decides the fall-back tier (trial
        // survival included) instead of blindly writing free.
        const reconciled = await deriveSubscriptionUpdate(stripe, eventSubscription);

        if (reconciled?.update) {
          const { error } = await supabase
            .from('profiles')
            .update(reconciled.update)
            .eq('id', reconciled.profileId);

          if (error) {
            logError('[Stripe Webhook] Failed to cancel subscription:', error);
            throw new Error(`Failed to cancel subscription: ${error.message}`);
          }

          if (reconciled.update.subscription_tier !== reconciled.fromTier) {
            // Log cancellation
            const { error: historyError } = await supabase.from('subscription_history').insert({
              user_id: reconciled.profileId,
              from_tier: reconciled.fromTier,
              to_tier: reconciled.update.subscription_tier,
              notes: 'Subscription cancelled',
            });

            if (historyError) {
              logError('[Stripe Webhook] Failed to log subscription_history:', historyError);
            }
          }
        }
        break;
      }

      default:
      // Unhandled event type - no specific action needed
    }

    // ============================================================================
    // SUCCESS - Update processing metrics
    // ============================================================================

    const processingDuration = Date.now() - startTime;

    logDebug(
      `[Stripe Webhook] Successfully processed ${event.type} (${event.id}) in ${processingDuration}ms`,
    );

    // Update event status to processed
    const { error: finalizationError } = await supabase
      .from('stripe_webhook_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        processing_duration_ms: processingDuration,
        lease_expires_at: null,
        error_message: null,
      })
      .eq('id', event.id);

    if (finalizationError) {
      logError(`[Stripe Webhook] Failed to finalize event ${event.id}:`, finalizationError);
      return NextResponse.json(
        { received: true, status: 'error', message: 'Failed to finalize event' },
        { status: 500 },
      );
    }

    return NextResponse.json({ received: true, status: 'processed' });
  } catch (error) {
    // ============================================================================
    // FAILURE - Record error for debugging
    // ============================================================================

    const processingDuration = Date.now() - startTime;
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = 'Unknown error';
      }
    }

    logError(`[Stripe Webhook] Error processing event ${eventId}:`, error);

    // Update event status to failed
    if (eventId) {
      const supabase = getSupabaseAdmin();
      await supabase
        .from('stripe_webhook_events')
        .update({
          status: 'failed',
          error_message: errorMessage,
          processing_duration_ms: processingDuration,
          lease_expires_at: null,
        })
        .eq('id', eventId);
    }

    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
