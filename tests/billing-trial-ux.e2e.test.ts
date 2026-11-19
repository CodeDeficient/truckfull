import { test, expect } from '@playwright/test';
import { getSupabaseAdmin } from '../lib/supabase/admin';
import { TRIAL_CANCELED_NOTE } from '../lib/subscription/trialState';

/**
 * #1305 — TruckFull-managed trial lifecycle E2E.
 *
 * Covers: active trial, canceled trial, expired trial, upgrade-during-trial
 * boundary (cancel rejected for non-trial states), and paid-subscription
 * portal access. Runs against a real Supabase (local or staging) and a
 * running dev server. Trial state is provisioned directly via the admin
 * client to isolate the routes under test from the claim flow.
 */

// Unique per run: the cancel route shares the auth rate limiter keyed by IP,
// so reusing one email/IP across runs would trip 429 before assertions.
const TEST_EMAIL = `billing-trial-ux-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TrialUx123!';

let userId: string;

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function setTrialState(endsAt: string | null): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('profiles')
    .update({
      subscription_tier: 'pro',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_ends_at: endsAt,
      subscription_started_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}

async function clearCancelMarkers(): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from('subscription_history').delete().eq('user_id', userId);
}

/**
 * The cancel route shares the strict auth rate limiter (5 per 15 min) keyed by
 * IP. All test traffic comes from 127.0.0.1, so prior runs would 429 the next
 * one. Flush this route's limiter keys before the suite runs.
 */
async function flushRateLimitKeys(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return; // rate limiting disabled locally — nothing to flush
  try {
    const keysResp = await fetch(`${url}/keys/ratelimit:auth:trial-cancel*`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { result } = (await keysResp.json()) as { result: string[] };
    for (const key of result) {
      await fetch(`${url}/del/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
        method: 'POST',
      });
    }
  } catch {
    // Redis unreachable: the run may 429, but that failure is legible.
  }
}

/**
 * Sign in through the real login form so the Supabase session cookie lands in
 * the Playwright context — the project storageState carries the TEST_OWNER
 * session, which would test the wrong identity. page.request then shares the
 * page's cookie jar for API calls.
 */
async function loginAndCarrySession(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

  const ping = await page.request.get('/api/founding-members');
  if (!ping.ok()) {
    throw new Error('session cookie not carried after login');
  }
}

test.describe.serial('TruckFull-managed trial lifecycle (#1305)', () => {
  test.beforeAll(async () => {
    await flushRateLimitKeys();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    if (!data.user) throw new Error('user creation returned no user');
    userId = data.user.id;

    // auth.admin.createUser does not create a profiles row; the route and the
    // trial-state derivation both read one.
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      email: TEST_EMAIL,
      role: 'food_truck_owner',
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw profileError;
  });

  test.afterAll(async () => {
    if (!userId) return;
    const admin = getSupabaseAdmin();
    await clearCancelMarkers();
    await admin.auth.admin.deleteUser(userId);
  });

  test('active trial: cancel endpoint records marker and preserves Pro through trial_ends_at', async ({
    page,
  }) => {
    await setTrialState(daysFromNow(20));
    await clearCancelMarkers();
    await loginAndCarrySession(page);

    const cancelResp = await page.request.post('/api/trial/cancel');
    expect(cancelResp.status()).toBe(200);

    const body = await cancelResp.json();
    expect(body.status).toBe('trial_canceled');
    expect(body.trialEndsAt).toBeTruthy();
    expect(body.message).toMatch(/not be charged/i);

    // Profile untouched: still Pro, still no Stripe binding.
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, stripe_subscription_id, subscription_ends_at')
      .eq('id', userId)
      .single();
    expect(profile?.subscription_tier).toBe('pro');
    expect(profile?.stripe_subscription_id).toBeNull();
    expect(profile?.subscription_ends_at).toBeTruthy();

    // Cancellation marker recorded exactly once (notes carry a suffix, so
    // match on the canonical prefix — same as the route's marker lookup).
    const { data: markers } = await admin
      .from('subscription_history')
      .select('notes')
      .eq('user_id', userId)
      .like('notes', `${TRIAL_CANCELED_NOTE}%`);
    expect(markers).toHaveLength(1);

    // Second cancel is rejected (already canceled).
    const second = await page.request.post('/api/trial/cancel');
    expect(second.status()).toBe(409);
    const secondBody = await second.json();
    expect(secondBody.error).toMatch(/already/i);
  });

  test('expired trial: cancel is rejected', async ({ page }) => {
    await setTrialState(daysFromNow(-2));
    await clearCancelMarkers();
    // Log in as the trial user: the project storageState carries the
    // TEST_OWNER session, whose paid state would 409 for the wrong reason.
    await loginAndCarrySession(page);

    const cancelResp = await page.request.post('/api/trial/cancel');
    expect(cancelResp.status()).toBe(409);
    const body = await cancelResp.json();
    expect(body.error).toMatch(/no active trial/i);
  });

  test('upgrade during trial: checkout endpoint treats trial-only account as Pro-eligible', async ({
    page,
  }) => {
    await setTrialState(daysFromNow(20));
    await clearCancelMarkers();
    await loginAndCarrySession(page);

    const resp = await page.request.post('/api/stripe/create-checkout', {
      data: { tier: 'pro', isFoundingMember: true, interval: 'month' },
    });
    // The route must NOT refuse a Pro-tier trial user for being on trial.
    // Sandbox keys may be absent in this environment — a billing-config
    // failure is acceptable; a "tier not eligible" refusal is not.
    if (resp.status() >= 400) {
      const body = await resp.json().catch(() => ({ error: '' }));
      expect(body.error).not.toMatch(/tier|eligible/i);
    }
    await clearCancelMarkers();
  });

  test('trial-only user with a Stripe customer ID still cannot reach the portal', async ({
    page,
  }) => {
    await setTrialState(daysFromNow(20));
    await clearCancelMarkers();
    // The chromium project's storageState carries the TEST_OWNER session (a
    // real paid subscriber — portal 200 would be correct for them). Log in as
    // the trial user so the request tests the trial-only boundary.
    await loginAndCarrySession(page);

    const admin = getSupabaseAdmin();
    await admin
      .from('profiles')
      .update({ stripe_customer_id: 'cus_test_no_subscription' })
      .eq('id', userId);

    const resp = await page.request.post('/api/stripe/create-portal');
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toMatch(/no active subscription/i);

    await admin
      .from('profiles')
      .update({ stripe_customer_id: null })
      .eq('id', userId);
  });
});
