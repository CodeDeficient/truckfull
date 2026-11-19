import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config({ path: '.env.stripe-test.local', override: true });

const USER_ID = '3a661e13-2fa2-46fb-8c97-4d1db842027d';
const shouldRun = process.env.RUN_STRIPE_CHECKOUT_E2E === '1';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe('real founding checkout', () => {
  test.skip(!shouldRun, 'Set RUN_STRIPE_CHECKOUT_E2E=1 to run a real Stripe sandbox payment');

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Hosted checkout runs once in Chromium');
    await resetFixture();
  });

  test.afterEach(async () => {
    await cancelFixtureSubscription();
    await resetFixture();
  });

  test('reserves, binds, and activates founding pricing through Stripe Checkout', async ({
    page,
  }) => {
    const response = await page.request.post('/api/stripe/create-checkout', {
      data: { tier: 'pro', isFoundingMember: true, interval: 'month' },
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { url: string };

    await page.goto(body.url);
    await page.locator('#cardNumber').fill('4242424242424242');
    await page.locator('#cardExpiry').fill('1234');
    await page.locator('#cardCvc').fill('123');
    const billingName = page.locator('#billingName');
    if (await billingName.isVisible()) await billingName.fill('Checkout Test Owner');
    await page.getByRole('textbox', { name: 'ZIP' }).fill('10001');
    const linkSave = page.getByRole('checkbox', { name: /save my information/i });
    if (await linkSave.isVisible()) await linkSave.uncheck();
    await page.getByTestId('hosted-payment-submit-button').click();

    await expect.poll(async () => (await getFoundingMembership())?.status).toBe('active');
    await expect.poll(async () => (await getProfile())?.subscription_tier).toBe('pro');

    // Checkout dedup: while the subscription is live, a second checkout must
    // be refused (409 already_subscribed) rather than double-billing.
    const duplicate = await page.request.post('/api/stripe/create-checkout', {
      data: { tier: 'pro', isFoundingMember: false, interval: 'month' },
    });
    expect(duplicate.status()).toBe(409);
    const duplicateBody = (await duplicate.json()) as { code: string; error: string };
    expect(duplicateBody.code).toBe('already_subscribed');
    expect(duplicateBody.error).toMatch(/already have an active subscription/i);
  });
});

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Staging Supabase environment variables are required');
  }
  if (!supabaseUrl.includes('examplestagingref000')) {
    throw new Error('Real founding checkout test only runs against TruckFull staging');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getProfile() {
  const { data, error } = await getAdminClient()
    .from('profiles')
    .select('subscription_tier, stripe_subscription_id')
    .eq('id', USER_ID)
    .single();
  if (error) throw error;
  return data;
}

async function getFoundingMembership() {
  const { data, error } = await getAdminClient()
    .from('founding_members')
    .select('status, checkout_session_id, stripe_subscription_id')
    .eq('profile_id', USER_ID)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function cancelFixtureSubscription() {
  const profile = await getProfile();
  if (!profile.stripe_subscription_id || !process.env.STRIPE_RESTRICTED_KEY) return;
  const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY);
  await stripe.subscriptions.cancel(profile.stripe_subscription_id).catch(() => undefined);
}

async function resetFixture() {
  const supabase = getAdminClient();
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
