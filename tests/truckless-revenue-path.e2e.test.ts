import { test, expect } from '@playwright/test';
import { getSupabaseAdmin } from '../lib/supabase/admin';

/**
 * Decoupled Pro access E2E — truckless revenue path (PR: decouple Pro from
 * truck ownership).
 *
 * Covers the five required flows:
 *   1. trial without a truck → dashboard access
 *   2. trial-ineligible user → charged-at-checkout CTA on /pricing
 *   3. authenticated free user → Billing owner-tools offer (not error copy)
 *   4. expired truckless user → Billing expiration state
 *   5. email authentication → return to /pricing (returnTo)
 *
 * Runs against the LOCAL Supabase stack (port 54321) and a dev server with
 * the same local env (dev server on port 3001 per the runner script).
 * Accounts are created via the admin client and cleaned up after the run.
 */

const RUN_ID = Date.now();
const TEST_PASSWORD = 'TrucklessE2e123!';

/**
 * The trial-start route shares the strict auth limiter (5 per 15 min) keyed
 * by IP. All test traffic comes from 127.0.0.1, so prior runs 429 the next
 * one. Flush this route's limiter keys before the suite runs (same pattern
 * as billing-trial-ux.e2e.test.ts).
 */
async function flushRateLimitKeys(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return; // rate limiting disabled locally — nothing to flush
  try {
    const keysResp = await fetch(`${url}/keys/ratelimit:auth:trial-start*`, {
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

const trialUser = {
  email: `truckless-trial-${RUN_ID}@example.com`,
  password: TEST_PASSWORD,
};
const ineligibleUser = {
  email: `truckless-cooldown-${RUN_ID}@example.com`,
  password: TEST_PASSWORD,
};
const freeUser = {
  email: `truckless-free-${RUN_ID}@example.com`,
  password: TEST_PASSWORD,
};
const expiredUser = {
  email: `truckless-expired-${RUN_ID}@example.com`,
  password: TEST_PASSWORD,
};
const returnToUser = {
  email: `truckless-return-${RUN_ID}@example.com`,
  password: TEST_PASSWORD,
};
const starterUser = {
  email: `truckless-starter-${RUN_ID}@example.com`,
  password: TEST_PASSWORD,
};

let trialUserId = '';
let ineligibleUserId = '';
let freeUserId = '';
let expiredUserId = '';
let returnToUserId = '';
let starterUserId = '';

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function createUserWithProfile(
  email: string,
  password: string,
  billing: {
    subscriptionTier: string;
    subscriptionEndsAt: string | null;
    stripeSubscriptionId?: string;
    insertTrialHistory?: boolean;
  },
): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error('user creation returned no user');

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    email,
    role: 'customer',
    subscription_tier: billing.subscriptionTier,
    subscription_ends_at: billing.subscriptionEndsAt,
    stripe_subscription_id: billing.stripeSubscriptionId ?? null,
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  if (billing.insertTrialHistory) {
    const { error: historyError } = await admin.from('subscription_history').insert({
      user_id: userId,
      from_tier: 'free',
      to_tier: 'pro',
      notes: '30-day free trial provisioned on truck claim',
      changed_at: new Date().toISOString(),
    });
    if (historyError) throw historyError;
  }

  return userId;
}

async function deleteUser(userId: string): Promise<void> {
  if (!userId) return;
  const admin = getSupabaseAdmin();
  await admin.from('subscription_history').delete().eq('user_id', userId);
  await admin.auth.admin.deleteUser(userId);
}

/**
 * Sign in through the real login form so the session cookie lands in the
 * Playwright context. Returns after the auth modal is gone.
 */
async function login(page: import('@playwright/test').Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 20000 });
  // The @supabase/ssr browser client writes the session cookie asynchronously
  // after the auth state change; server-rendered pages read that cookie, so
  // wait for it before any server-side request.
  await page.waitForFunction(
    () => document.cookie.includes('sb-'),
    undefined,
    { timeout: 15000 },
  );
}

test.describe.serial('Truckless Pro revenue path', () => {
  test.beforeAll(async () => {
    await flushRateLimitKeys();
    trialUserId = await createUserWithProfile(trialUser.email, trialUser.password, {
      subscriptionTier: 'free',
      subscriptionEndsAt: null,
    });
    ineligibleUserId = await createUserWithProfile(ineligibleUser.email, ineligibleUser.password, {
      subscriptionTier: 'free',
      subscriptionEndsAt: null,
      insertTrialHistory: true,
    });
    freeUserId = await createUserWithProfile(freeUser.email, freeUser.password, {
      subscriptionTier: 'free',
      subscriptionEndsAt: null,
    });
    expiredUserId = await createUserWithProfile(expiredUser.email, expiredUser.password, {
      subscriptionTier: 'pro',
      subscriptionEndsAt: daysFromNow(-2),
    });
    returnToUserId = await createUserWithProfile(returnToUser.email, returnToUser.password, {
      subscriptionTier: 'free',
      subscriptionEndsAt: null,
    });
    starterUserId = await createUserWithProfile(starterUser.email, starterUser.password, {
      subscriptionTier: 'starter',
      subscriptionEndsAt: null,
    });
  });

  test.afterAll(async () => {
    await deleteUser(trialUserId);
    await deleteUser(ineligibleUserId);
    await deleteUser(freeUserId);
    await deleteUser(expiredUserId);
    await deleteUser(returnToUserId);
    await deleteUser(starterUserId);
  });

  test('trial without a truck: pricing CTA → trial start → dashboard access', async ({ page }) => {
    await login(page, trialUser.email, trialUser.password);
    await page.request.get('/api/founding-members');

    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });

    // Eligible truckless free user sees exactly the trial CTA.
    const proCard = page.locator('div.glass-strong.border-2, div.glass-strong[class*="border-primary"]').first();
    const cta = proCard.getByRole('link', { name: /Start Free Trial/i }).or(
      proCard.locator('button', { hasText: /Start Free Trial/i }),
    ).or(
      page.getByText('Start Free Trial', { exact: true }).first(),
    );
    await expect(cta.first()).toBeVisible({ timeout: 30000 });

    // Start the trial through the API (the page handler does the same POST).
    const startResp = await page.request.post('/api/trial/start');
    expect(startResp.status()).toBe(200);
    const body = await startResp.json();
    expect(body.status).toBe('trial_started');
    expect(body.trialEndsAt).toBeTruthy();

    // Dashboard entry succeeds with zero trucks.
    const dashResp = await page.request.get('/owner-dashboard');
    expect(dashResp.status()).toBe(200);

    // Truck-independent Pro surface: events discovery accepts entitled
    // truckless users (this endpoint previously required the owner role).
    const eventsResp = await page.request.get('/api/events?status=published&period=future&limit=5');
    expect(eventsResp.status()).toBe(200);

    const savedLeadsResp = await page.request.get(
      '/api/events/saved-leads?truck_id=00000000-0000-4000-8000-000000000001',
    );
    expect(savedLeadsResp.status()).toBe(404);

    const vettingResp = await page.request.get(
      '/api/events/00000000-0000-4000-8000-000000000001/vetting?source=external',
    );
    expect(vettingResp.status()).toBe(200);

    // Analytics returns valid zeroed data rather than 403.
    const analyticsResp = await page.request.get('/api/analytics/summary');
    expect(analyticsResp.status()).toBe(200);
    const analyticsBody = await analyticsResp.json();
    expect(analyticsBody.truckCount).toBe(0);

    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('span:visible').filter({ hasText: 'Current Plan' }).first()).toBeVisible();
    await expect(page.getByText('Upgrade today — charged at checkout')).toHaveCount(0);
  });

  test('trial-ineligible user sees charged-at-checkout CTA before clicking', async ({ page }) => {
    await login(page, ineligibleUser.email, ineligibleUser.password);
    await page.request.get('/api/founding-members');

    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });

    // The immediate-charge CTA is the visible label — NOT the trial label.
    const upgradeLabel = page.getByText('Upgrade today — charged at checkout').first();
    await expect(upgradeLabel).toBeVisible({ timeout: 30000 });

    const trialLabelCount = await page.getByText('Start Free Trial', { exact: true }).count();
    expect(trialLabelCount).toBe(0);

    // The cooldown must be honored server-side too.
    const startResp = await page.request.post('/api/trial/start');
    expect(startResp.status()).toBe(409);
    const startBody = await startResp.json();
    expect(startBody.reason).toBe('cooldown');
    expect(startBody.status).toBe('trial_unavailable');
  });

  test('deprecated starter tier sees upgrade CTA, never a trial promise', async ({ page }) => {
    await login(page, starterUser.email, starterUser.password);
    await page.request.get('/api/founding-members');

    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });

    const upgradeLabel = page.getByText('Upgrade today — charged at checkout').first();
    await expect(upgradeLabel).toBeVisible({ timeout: 30000 });
    expect(await page.getByText('Start Free Trial', { exact: true }).count()).toBe(0);

    // The start endpoint refuses with explicit unsupported-tier guidance
    // instead of the misleading already_pro owner-dashboard redirect.
    const startResp = await page.request.post('/api/trial/start');
    expect(startResp.status()).toBe(409);
    const startBody = await startResp.json();
    expect(startBody.reason).toBe('unsupported_tier');
    expect(startBody.status).toBe('trial_unavailable');
    expect(startBody.redirect).toBe('/owner-dashboard/billing');
  });

  test('authenticated free user lands on Billing owner-tools offer', async ({ page }) => {
    await login(page, freeUser.email, freeUser.password);
    await page.request.get('/api/founding-members');

    const resp = await page.goto('/owner-dashboard', { waitUntil: 'domcontentloaded' });

    // Guard redirects the free truckless customer to Billing.
    await page.waitForURL(/owner-dashboard\/billing/, { timeout: 30000 });
    expect(resp?.url() ?? page.url()).toContain('/owner-dashboard/billing');

    // Billing renders the upgrade offer — no error or expired-trial copy.
    const pageText = await page.textContent('body');
    expect(pageText).not.toMatch(/has ended|expired|Access Denied/i);
    expect(pageText).toMatch(/Pro|pricing|Upgrade|Plan/i);
  });

  test('expired truckless user sees Billing expiration state', async ({ page }) => {
    const admin = getSupabaseAdmin();
    const { data: expiredPro, error: expiredProError } = await admin
      .from('profiles')
      .select('id, subscription_tier, subscription_ends_at')
      .eq('id', expiredUserId)
      .single();
    expect(expiredProError).toBeNull();
    expect(expiredPro).toMatchObject({
      id: expiredUserId,
      subscription_tier: 'pro',
    });
    const originalEndsAt = expiredPro?.subscription_ends_at ?? '';
    expect(Date.parse(originalEndsAt)).toBeLessThan(Date.now());

    const firstExpiration = await admin.rpc('expire_free_trials');
    expect(firstExpiration.error).toBeNull();
    const secondExpiration = await admin.rpc('expire_free_trials');
    expect(secondExpiration.error).toBeNull();

    const { data: expiredProfile, error: expiredProfileError } = await admin
      .from('profiles')
      .select('subscription_tier, subscription_ends_at')
      .eq('id', expiredUserId)
      .single();
    expect(expiredProfileError).toBeNull();
    expect(expiredProfile).toMatchObject({
      subscription_tier: 'free',
      subscription_ends_at: originalEndsAt,
    });
    const { count: expirationHistoryCount, error: expirationHistoryError } = await admin
      .from('subscription_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', expiredUserId)
      .eq('notes', 'Automated downgrade: non-Stripe Pro subscription expired');
    expect(expirationHistoryError).toBeNull();
    expect(expirationHistoryCount).toBe(1);

    await login(page, expiredUser.email, expiredUser.password);
    await page.request.get('/api/founding-members');
    const analyticsResponse = await page.request.get('/api/analytics/summary');
    expect(analyticsResponse.status()).toBe(403);

    // Entitlement is inactive: dashboard routes redirect to Billing...
    const response = await page.goto('/owner-dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/owner-dashboard\/billing/, { timeout: 30000 });
    expect(response?.status()).toBe(200);

    // ...and Billing itself stays reachable (no loop), showing the expired
    // copy once the client-side billing derivation hydrates.
    await expect(
      page.getByText(/has ended|Upgrade to keep Pro features/i).first(),
    ).toBeVisible({ timeout: 30000 });
  });

  test('email authentication returns to /pricing via returnTo', async ({ page }) => {
    // Anonymous pricing visitor hits the exact auth entry URL.
    await page.goto('/?auth=open&returnTo=%2Fpricing', { waitUntil: 'domcontentloaded' });

    // The auth modal opens on the auth parameter.
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 30000 });

    // Sign in through the modal (session lands via Supabase client).
    await emailInput.fill(returnToUser.email);
    await page.locator('input[type="password"]').first().fill(returnToUser.password);
    await page.locator('button[type="submit"]').first().click();

    // Post-auth navigation honors returnTo=/pricing.
    await page.waitForURL(/\/pricing/, { timeout: 30000 });
    expect(new URL(page.url()).pathname).toBe('/pricing');
  });
});
