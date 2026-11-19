import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config({ path: '.env.stripe-test.local', override: true });

const USER_ID = '3a661e13-2fa2-46fb-8c97-4d1db842027d';
const STAGING_PROJECT_REF = 'examplestagingref000';
const CHECKOUT_EVENT =
  'tests/fixtures/stripe-events/1788367115-checkout.session.completed-evt_0000000000000000checkout.json';
const CANCELLATION_EVENT =
  'tests/fixtures/stripe-events/1788367498-customer.subscription.updated-evt_000000000000subupdated.json';
const FOUNDING_ACTIVATION_EVENT_ID = 'evt_founding_lifecycle_staging_test';
const FOUNDING_MISMATCH_EVENT_ID = 'evt_founding_price_mismatch_staging_test';
const FOUNDING_EXPIRY_EVENT_ID = 'evt_founding_expiry_staging_test';
const FOUNDING_CONFLICT_EVENT_ID = 'evt_founding_conflict_staging_test';
const EVENT_IDS = [
  'evt_0000000000000000checkout',
  'evt_000000000000subupdated',
  FOUNDING_ACTIVATION_EVENT_ID,
  FOUNDING_MISMATCH_EVENT_ID,
  FOUNDING_EXPIRY_EVENT_ID,
  FOUNDING_CONFLICT_EVENT_ID,
] as const;

const shouldRun = process.env.RUN_STRIPE_STAGING_E2E === '1';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

test.describe('real Stripe subscription lifecycle', () => {
  test.skip(!shouldRun, 'Set RUN_STRIPE_STAGING_E2E=1 to mutate the dedicated staging fixture');

  test.beforeEach(async () => {
    await resetStagingFixture();
  });

  test.afterEach(async () => {
    await resetStagingFixture();
  });

  async function resetStagingFixture() {
    if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
      throw new Error('Staging Supabase and Stripe webhook environment variables are required');
    }

    const supabase = getAdminClient();
    const { error: eventError } = await supabase
      .from('stripe_webhook_events')
      .delete()
      .in('id', EVENT_IDS);
    if (eventError) throw eventError;

    const { error: foundingError } = await supabase
      .from('founding_members')
      .delete()
      .eq('profile_id', USER_ID);
    if (foundingError) throw foundingError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_started_at: null,
        subscription_ends_at: null,
      })
      .eq('id', USER_ID);
    if (profileError) throw profileError;
  }

  test('preserves Pro access and records no end when cancellation is not at period end', async ({
    request,
  }) => {
    const checkout = await postRealEvent(request, CHECKOUT_EVENT);
    expect(checkout.status()).toBe(200);

    const afterCheckout = await getProfile();
    expect(afterCheckout).toMatchObject({
      subscription_tier: 'pro',
      stripe_customer_id: 'cus_ExampleCust01',
      stripe_subscription_id: 'sub_0000000000000000000sub1',
      subscription_ends_at: null,
    });

    const cancellation = await postRealEvent(request, CANCELLATION_EVENT);
    expect(cancellation.status()).toBe(200);

    const afterCancellation = await getProfile();
    expect(afterCancellation.subscription_tier).toBe('pro');
    // The fixture has cancel_at_period_end: false, so the webhook records no
    // end date (subscription_ends_at is only set for period-end cancellations).
    expect(afterCancellation.subscription_ends_at).toBeNull();
  });

  test('activates a bound founding reservation only after verifying its Stripe price', async ({
    request,
  }) => {
    const { supabase, reservationId, source, session } =
      await createBoundReservation('founding_monthly');
    const event = withFoundingMetadata(
      source,
      session,
      FOUNDING_ACTIVATION_EVENT_ID,
      reservationId,
      'founding_monthly',
    );
    const response = await postPayload(request, JSON.stringify(event));
    expect(response.status()).toBe(200);

    const { data: founding, error: foundingError } = await supabase
      .from('founding_members')
      .select('status, checkout_session_id, stripe_customer_id, stripe_subscription_id')
      .eq('profile_id', USER_ID)
      .single();
    if (foundingError) throw foundingError;
    expect(founding).toMatchObject({
      status: 'active',
      checkout_session_id: session.id,
      stripe_customer_id: 'cus_ExampleCust01',
      stripe_subscription_id: 'sub_0000000000000000000sub1',
    });
  });

  test('rejects activation when the Stripe price does not match the reserved offer', async ({
    request,
  }) => {
    const { supabase, reservationId, source, session } =
      await createBoundReservation('founding_yearly');
    const event = withFoundingMetadata(
      source,
      session,
      FOUNDING_MISMATCH_EVENT_ID,
      reservationId,
      'founding_yearly',
    );

    const response = await postPayload(request, JSON.stringify(event));
    expect(response.status()).toBe(500);

    const { data, error } = await supabase
      .from('founding_members')
      .select('status')
      .eq('profile_id', USER_ID)
      .single();
    if (error) throw error;
    expect(data.status).toBe('reserved');
  });

  test('expires a reservation when Stripe expires its Checkout Session', async ({ request }) => {
    const { supabase, reservationId, source, session } =
      await createBoundReservation('founding_monthly');
    const event = withFoundingMetadata(
      source,
      session,
      FOUNDING_EXPIRY_EVENT_ID,
      reservationId,
      'founding_monthly',
      'checkout.session.expired',
    );

    const response = await postPayload(request, JSON.stringify(event));
    expect(response.status()).toBe(200);

    const { data, error } = await supabase
      .from('founding_members')
      .select('status')
      .eq('profile_id', USER_ID)
      .single();
    if (error) throw error;
    expect(data.status).toBe('expired');
  });

  test('grants the paid tier even when the reservation already expired', async ({ request }) => {
    const { supabase, reservationId, source, session } =
      await createBoundReservation('founding_monthly');
    const { error: expireError } = await supabase.rpc('expire_founding_reservation', {
      p_reservation_id: reservationId,
      p_checkout_session_id: session.id,
    });
    if (expireError) throw expireError;

    const event = withFoundingMetadata(
      source,
      session,
      FOUNDING_CONFLICT_EVENT_ID,
      reservationId,
      'founding_monthly',
    );

    const response = await postPayload(request, JSON.stringify(event));
    expect(response.status()).toBe(200);

    const profile = await getProfile();
    expect(profile.subscription_tier).toBe('pro');
  });
});

async function createBoundReservation(offer: 'founding_monthly' | 'founding_yearly') {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc('reserve_founding_member_slot', {
    p_profile_id: USER_ID,
    p_offer: offer,
  });
  if (error || !data?.[0]?.reservation_id) {
    throw error ?? new Error('Reservation was not created');
  }

  const source = JSON.parse(await readFile(CHECKOUT_EVENT, 'utf8')) as Stripe.Event;
  const session = source.data.object as Stripe.Checkout.Session;
  const reservationId = data[0].reservation_id;
  const { data: bound, error: bindError } = await supabase.rpc('bind_founding_reservation', {
    p_reservation_id: reservationId,
    p_checkout_session_id: session.id,
  });
  if (bindError || !bound) throw bindError ?? new Error('Reservation was not bound');
  return { supabase, reservationId, source, session };
}

function withFoundingMetadata(
  source: Stripe.Event,
  session: Stripe.Checkout.Session,
  eventId: string,
  reservationId: string,
  offer: 'founding_monthly' | 'founding_yearly',
  type: Stripe.Event.Type = 'checkout.session.completed',
) {
  return {
    ...source,
    id: eventId,
    type,
    data: {
      ...source.data,
      object: {
        ...session,
        metadata: {
          ...session.metadata,
          foundingReservationId: reservationId,
          foundingOffer: offer,
        },
      },
    },
  };
}

async function postRealEvent(request: APIRequestContext, path: string) {
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is required');
  const payload = await readFile(path, 'utf8');
  return postPayload(request, payload);
}

async function postPayload(request: APIRequestContext, payload: string) {
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is required');
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  return request.post('/api/stripe/webhook', {
    data: payload,
    headers: { 'content-type': 'application/json', 'stripe-signature': signature },
  });
}

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey)
    throw new Error('Supabase environment variables are required');
  if (!supabaseUrl.includes(STAGING_PROJECT_REF)) {
    throw new Error(
      `Staging lifecycle tests only run against the staging project (${STAGING_PROJECT_REF}); refusing to mutate ${supabaseUrl}`,
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getProfile() {
  if (!supabaseUrl || !serviceRoleKey)
    throw new Error('Supabase environment variables are required');
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_customer_id, stripe_subscription_id, subscription_ends_at')
    .eq('id', USER_ID)
    .single();
  if (error) throw error;
  return data;
}
