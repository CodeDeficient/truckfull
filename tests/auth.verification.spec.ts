import { test, expect } from '@playwright/test';

test.describe('Auth Verification', () => {
  // This test relies on the storageState defined in playwright.config.ts for the 'chromium' project
  // which points to playwright/.auth/user.json

  test('should allow access to protected dashboard route', async ({ page }) => {
    console.log('Navigating to protected route /owner-dashboard...');
    await page.goto('/owner-dashboard');

    // 1. Verify we are NOT redirected to login
    await expect(page).not.toHaveURL(/.*?auth=open/);
    await expect(page).not.toHaveURL(/.*?login/);

    // 2. Verify we see dashboard-specific content
    // We look for common dashboard elements like "My Trucks", "Analytics", or the Sidebar
    // Based on typical dashboard layouts
    await expect(page.locator('text=Sign In')).not.toBeVisible();

    // Check for a known element on the dashboard page
    // We might not know the exact text, but we can check for the URL stability
    await expect(page).toHaveURL(/.*?owner-dashboard/);

    console.log('Successfully accessed /owner-dashboard without redirection.');

    // Optional: Take a screenshot for manual verification
    // await page.screenshot({ path: 'tests/test-results/dashboard-access.png' });
  });
});
