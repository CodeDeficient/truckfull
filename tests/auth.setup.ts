import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 1. Check for required environment variables
  const email = process.env.TEST_OWNER_EMAIL;
  const password = process.env.TEST_OWNER_PASSWORD;

  if (!email || !password) {
    if (process.env.CI) {
      throw new Error('TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD are required for E2E tests in CI');
    }
    console.warn('TEST_OWNER_EMAIL or TEST_OWNER_PASSWORD not set. Skipping auth setup.');
    return;
  }

  // 2. Perform login
  // Grant geolocation permissions to avoid location access prompts during tests
  await page.context().grantPermissions(['geolocation']);

  // Log page errors for debugging but don't fail the test
  page.on('pageerror', (error) => {
    console.log('Page error (logged):', error.message);
  });

  // Optimization: Bypass Welcome Modal by proactively setting dismissed flag
  await page.addInitScript(() => {
    localStorage.setItem('truckfull-welcome-dismissed', 'true');
  });

  console.log('Navigating to home page...');
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Wait for Auth Loading Skeleton to disappear (ensure UI is ready)
  console.log('Waiting for auth state to resolve...');
  await expect(page.locator('.animate-pulse, .skeleton'))
    .not.toBeVisible({ timeout: 10000 })
    .catch(() => {
      console.log('Warning: Auth skeleton check timed out or not found.');
    });

  // Handle Welcome Modal (Wait briefly for it to appear)
  console.log('Checking for Welcome Modal...');
  try {
    const welcomeButton = page.getByRole('button', { name: 'Start Exploring' });
    if (await welcomeButton.isVisible({ timeout: 2000 })) {
      console.log('Dismissing Welcome Modal...');
      await welcomeButton.click();
      // Wait for modal to disappear
      await expect(welcomeButton).not.toBeVisible();
    }
  } catch {
    // Modal didn't appear, proceed
    console.log('Welcome Modal did not appear.');
  }

  // Optimize: Check if already logged in (Avatar visible)
  const userAvatar = page.locator('button.rounded-full:has(.h-8.w-8)');
  if (await userAvatar.isVisible()) {
    console.log('User is already logged in (Avatar detected). Skipping auth.');
    await page.context().storageState({ path: authFile });
    return;
  }

  console.log('Initiating valid login flow...');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Fill Email
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(email);

  // Fill Password
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(password);

  console.log('Submitting form...');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for success by verifying we can see the "Owner Dashboard" link or Avatar
  // Use .first() to handle strict mode since both may be visible
  await expect(
    page.getByRole('link', { name: 'Owner Dashboard' }).or(userAvatar).first(),
  ).toBeVisible({ timeout: 15000 });

  console.log('Login successful!');

  // 4. Save storage state (cookies, localStorage)
  console.log('Saving storage state...');
  await page.context().storageState({ path: authFile });
  console.log('Auth setup complete.');
});
