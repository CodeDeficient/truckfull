import { test, expect } from '@playwright/test';

/**
 * Autoconfirm signup E2E test.
 *
 * Runs against the LOCAL Supabase stack (enable_confirmations = false), so
 * signup returns an immediate session. Verifies the browser ends up
 * authenticated after the server-side signup + client refreshSession() sync.
 *
 * Requires: local Supabase running (npx supabase start), dev server on
 * port 3001 (started by playwright.autoconfirm.config.ts).
 */

const uniqueEmail = (): string =>
  `e2e-autoconfirm-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

test('signup with immediate session leaves the browser authenticated', async ({ page }) => {
  await page.goto('/?auth=open', { waitUntil: 'domcontentloaded' });

  // The modal opens in signin mode; the `mode=signup` query param is not
  // honored by the home page (pre-existing), so use the real-user toggle.
  await page.getByRole('button', { name: "Don't have an account? Sign up" }).click();

  await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail());
  await page.getByRole('textbox', { name: 'Password' }).fill('StrongPass123!');
  await page.getByRole('checkbox', { name: /I agree to the/ }).check();

  const submit = page.getByRole('button', { name: 'Create Account' });
  await expect(submit).toBeEnabled({ timeout: 20000 });
  await submit.click();

  // The modal closes and the avatar menu (signed-in state) appears.
  const userAvatar = page.locator('button.rounded-full:has(.h-8.w-8)');
  await expect(userAvatar).toBeVisible({ timeout: 15000 });

  // The server client wrote the auth session cookie onto the response; the
  // browser holding it proves the immediate-session signup left the client
  // authenticated (refreshSession sync worked).
  const cookies = await page.context().cookies();
  const hasAuthCookie = cookies.some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
  expect(hasAuthCookie).toBe(true);
});
