import { test, expect } from '@playwright/test';

/**
 * Signup Turnstile E2E tests.
 *
 * Uses Cloudflare's official test credentials (always-pass sitekey/secret)
 * configured in .env.local. The siteverify response for test credentials
 * carries hostname "example.com" and no action field, so
 * TURNSTILE_ALLOWED_HOSTNAMES must include "example.com" locally.
 *
 * The rate-limit test injects X-Forwarded-For as a local harness; on Vercel
 * the platform overwrites that header, so this test only runs against
 * localhost base URLs.
 */

const uniqueEmail = (): string => `e2e-signup-${Date.now()}-${Math.floor(Math.random() * 1e6)}@gmail.com`;

/**
 * The Turnstile challenge iframe is rendered inside a shadow DOM, so
 * frameLocator cannot see it. Detect it via page.frames() instead.
 */
async function hasTurnstileFrame(page: import('@playwright/test').Page): Promise<boolean> {
  return page.frames().some((f) => f.url().includes('challenges.cloudflare.com'));
}

/**
 * Open the auth modal and switch to signup mode. The modal opens in signin
 * mode by default; the `mode=signup` query param is not honored by the home
 * page (pre-existing), so the toggle is the real-user path.
 */
async function openSignupModal(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?auth=open', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: "Don't have an account? Sign up" }).click();
}

test.describe('Signup with Turnstile', () => {
  test('renders the Turnstile widget only in signup mode', async ({ page }) => {
    await openSignupModal(page);

    await expect
      .poll(() => hasTurnstileFrame(page), { timeout: 15000 })
      .toBe(true);
  });

  test('submit is disabled until a Turnstile token is present', async ({ page }) => {
    await openSignupModal(page);

    // Assert the disabled state before filling the form / waiting for the
    // widget: the always-pass test key solves within a second or two, and a
    // later assertion could race the token delivery and find the button
    // already enabled.
    const submit = page.getByRole('button', { name: 'Create Account' });
    await expect(submit).toBeDisabled();

    await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail());
    await page.getByRole('textbox', { name: 'Password' }).fill('StrongPass123!');
    await page.getByRole('checkbox', { name: /I agree to the/ }).check();

    // Wait for the widget to solve (test sitekey always passes) and the
    // token to propagate, then the button becomes enabled.
    await expect(submit).toBeEnabled({ timeout: 20000 });
  });

  test('confirmation-required signup succeeds and shows check-email message', async ({ page }) => {
    await openSignupModal(page);

    await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail());
    await page.getByRole('textbox', { name: 'Password' }).fill('StrongPass123!');
    await page.getByRole('checkbox', { name: /I agree to the/ }).check();

    const submit = page.getByRole('button', { name: 'Create Account' });
    await expect(submit).toBeEnabled({ timeout: 20000 });
    await submit.click();

    await expect(page.getByText(/Check your email to confirm your account/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test('sign-in flow is unaffected by Turnstile', async ({ page }) => {
    await page.goto('/?auth=open', { waitUntil: 'domcontentloaded' });

    expect(await hasTurnstileFrame(page)).toBe(false);

    await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail());
    await page.getByRole('textbox', { name: 'Password' }).fill('StrongPass123!');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });
});

test.describe('Signup rate limiting', () => {
  test('rejects signup attempts over the per-IP limit with 429', async ({ request }) => {
    // The injected X-Forwarded-For is a local harness only; Vercel overwrites
    // it in deployed environments, so this test is meaningless off localhost.
    const baseURL = test.info().project.use.baseURL ?? '';
    if (!baseURL.includes('localhost') && !baseURL.includes('127.0.0.1')) {
      test.skip(true, 'rate-limit test only runs against localhost');
    }

    // Rate limiting runs before body validation, so an invalid body (empty
    // token) is still counted against the per-IP budget. Using it avoids the
    // side effects of a passing submission: no siteverify call, no GoTrue
    // signUp, no account created, no confirmation email.
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    const max = Number(process.env.SIGNUP_RATE_LIMIT_MAX ?? 10);
    let lastStatus = 0;
    for (let i = 0; i < max + 1; i++) {
      const response = await request.post('/api/auth/signup', {
        headers: { 'X-Forwarded-For': ip },
        data: {
          email: uniqueEmail(),
          password: 'StrongPass123!',
          turnstileToken: '',
        },
      });
      lastStatus = response.status();
    }

    expect(lastStatus).toBe(429);
  });
});
