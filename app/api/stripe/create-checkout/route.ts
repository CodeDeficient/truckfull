import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  createCheckoutSession,
  expireCheckoutSession,
  getStripeSubscriptionStatus,
  resolveCheckoutDedup,
} from '@/lib/stripe/checkout';
import { compensateFailedFoundingBind } from '@/lib/stripe/foundingCheckoutCleanup';
import { type SubscriptionTier } from '@/lib/auth/tierCheck';
import { logError } from '@/lib/logging';
import { BILLING_CONFIG } from '@/lib/config/billing';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getPosthogClient } from '@/lib/analytics/posthog';
import { buildCheckoutStarted, shouldEmitCheckoutStarted } from '@/lib/analytics/funnel';

export const runtime = 'nodejs';

type FoundingOffer = 'founding_monthly' | 'founding_yearly';

interface ReservationResult {
  readonly outcome: 'active' | 'reserved' | 'unavailable' | 'offer_mismatch';
  readonly reservation_id: string | null;
  readonly offer: FoundingOffer | null;
  readonly remaining: number;
  readonly total: number;
  readonly active: number;
  readonly reserved: number;
}

async function reserveFoundingSlot(
  profileId: string,
  offer: FoundingOffer,
): Promise<ReservationResult> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('reserve_founding_member_slot', {
    p_profile_id: profileId,
    p_offer: offer,
  });
  if (error || !data?.[0]) {
    throw new Error(error?.message ?? 'Founding reservation returned no result');
  }
  return data[0] as ReservationResult;
}

async function expireReservation(reservationId: string, checkoutSessionId?: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc('expire_founding_reservation', {
    p_reservation_id: reservationId,
    p_checkout_session_id: checkoutSessionId,
  });
  if (error) logError('Failed to expire founding reservation:', error);
}

async function hasActiveFoundingEntitlement(profileId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('founding_members')
    .select('profile_id')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

export async function POST(request: Request) {
  if (BILLING_CONFIG.PAUSED) {
    return NextResponse.json({ error: BILLING_CONFIG.PAUSED_MESSAGE }, { status: 403 });
  }

  try {
    // Get current user from cookies (server-side)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logError('Auth error in create-checkout:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { tier, isFoundingMember, interval } = body as {
      tier: SubscriptionTier;
      isFoundingMember?: boolean;
      interval?: 'month' | 'year';
    };

    if (!tier || tier !== 'pro') {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (interval && !['month', 'year'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
    }

    const intervalValue = interval ?? 'month';

    // Dedup guard: a user whose Stripe subscription is still live must not
    // open a second one — a new session without their customer id would
    // create a duplicate Stripe customer and double-bill them. Runs before
    // any founding reservation so blocked users never reserve a slot.
    const { data: billingState, error: billingError } = await getSupabaseAdmin()
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .maybeSingle();
    if (billingError) throw new Error(billingError.message);

    const dedup = await resolveCheckoutDedup({
      getBillingState: async () => ({
        stripeCustomerId: billingState?.stripe_customer_id ?? null,
        stripeSubscriptionId: billingState?.stripe_subscription_id ?? null,
      }),
      getSubscriptionStatus: getStripeSubscriptionStatus,
    });
    if (!dedup.allowed) {
      return NextResponse.json(
        {
          error:
            dedup.reason === 'already_subscribed'
              ? 'You already have an active subscription. Manage it from the billing portal.'
              : 'We could not verify your subscription status. Please try again in a moment.',
          code: dedup.reason,
        },
        { status: 409 },
      );
    }

    const requestedOffer: FoundingOffer =
      intervalValue === 'year' ? 'founding_yearly' : 'founding_monthly';
    const useFoundingPrice =
      (isFoundingMember ?? false) || (await hasActiveFoundingEntitlement(user.id));
    const reservation = useFoundingPrice
      ? await reserveFoundingSlot(user.id, requestedOffer)
      : null;

    if (reservation?.outcome === 'unavailable') {
      return NextResponse.json(
        {
          error: 'Founding member pricing is no longer available. Standard pricing is shown now.',
          code: 'founding_unavailable',
          foundingData: {
            taken: reservation.active + reservation.reserved,
            remaining: reservation.remaining,
            total: reservation.total,
          },
        },
        { status: 409 },
      );
    }

    if (reservation?.outcome === 'offer_mismatch') {
      return NextResponse.json(
        {
          error:
            'A different billing interval is already reserved for this founding spot. Complete that checkout or wait for it to expire.',
          code: 'founding_offer_mismatch',
          foundingData: {
            taken: reservation.active + reservation.reserved,
            remaining: reservation.remaining,
            total: reservation.total,
            reservedOffer: reservation.offer,
          },
        },
        { status: 409 },
      );
    }

    // The reservation owns the billing interval: pricing and metadata must
    // both come from the returned offer so they always agree with what was
    // reserved, even if the request asked for a different interval.
    const reservedOffer = reservation?.offer ?? null;
    const reservationInterval: 'month' | 'year' =
      reservedOffer === 'founding_yearly' ? 'year' : 'month';
    const checkoutInterval =
      reservation?.outcome === 'reserved' ? reservationInterval : intervalValue;
    const reservationId = reservation?.reservation_id ?? undefined;
    const foundingOffer = reservation?.offer ?? undefined;
    const result = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email ?? '',
      tier,
      isFoundingMember: useFoundingPrice,
      interval: checkoutInterval,
      foundingReservationId: reservationId,
      foundingOffer: reservationId ? foundingOffer : undefined,
      customerId: dedup.customerId ?? undefined,
    });

    if ('error' in result) {
      if (reservationId) await expireReservation(reservationId);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (reservationId) {
      const { data: bound, error: bindError } = await getSupabaseAdmin().rpc(
        'bind_founding_reservation',
        {
          p_reservation_id: reservationId,
          p_checkout_session_id: result.id,
        },
      );
      if (bindError) {
        const cleanup = await compensateFailedFoundingBind({
          reservationId,
          checkoutSessionId: result.id,
          expireCheckoutSession,
          releaseReservation: expireReservation,
        });
        if (cleanup === 'checkout_expiration_unconfirmed') {
          logError(
            `Retaining founding reservation ${reservationId}: Stripe session ${result.id} may remain chargeable`,
          );
        }
        throw new Error(bindError.message ?? 'Failed to bind founding reservation');
      }
      if (!bound) {
        const cleanup = await compensateFailedFoundingBind({
          reservationId,
          checkoutSessionId: result.id,
          expireCheckoutSession,
          releaseReservation: expireReservation,
        });
        if (cleanup === 'checkout_expiration_unconfirmed') {
          logError(
            `Retaining founding reservation ${reservationId}: Stripe session ${result.id} may remain chargeable`,
          );
        }
        throw new Error('Failed to bind founding reservation');
      }
    }

    if (shouldEmitCheckoutStarted(result.url)) {
      const { event: funnelEvent, properties } = buildCheckoutStarted(
        tier,
        checkoutInterval,
        useFoundingPrice,
      );
      const posthog = getPosthogClient();
      await posthog.track(funnelEvent, { ...properties, user_id: user.id }).catch(() => {});
      await posthog.flush().catch(() => {});
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    logError('Error in create-checkout route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
