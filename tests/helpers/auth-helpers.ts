import type { Page } from '@playwright/test';

/**
 * Authenticate a user via the UI login flow.
 * Uses TEST_OWNER_EMAIL / TEST_OWNER_PASSWORD env vars by default.
 */
export async function authenticateUser(
  page: Page,
  email?: string,
  password?: string,
): Promise<void> {
  const loginEmail = email ?? process.env.TEST_OWNER_EMAIL;
  const loginPassword = password ?? process.env.TEST_OWNER_PASSWORD;

  if (!loginEmail || !loginPassword) {
    throw new Error(
      'TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD must be set (or pass email/password args)',
    );
  }

  // Dismiss welcome modal proactively
  await page.addInitScript(() => {
    localStorage.setItem('truckfull-welcome-dismissed', 'true');
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Check if already logged in
  const userAvatar = page.locator('button.rounded-full:has(.h-8.w-8)');
  if (await userAvatar.isVisible({ timeout: 3000 }).catch(() => false)) {
    return; // Already authenticated
  }

  // Perform login
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(loginEmail);
  await page.getByRole('textbox', { name: 'Password' }).fill(loginPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for successful login
  await page
    .getByRole('link', { name: 'Owner Dashboard' })
    .or(userAvatar)
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
}
