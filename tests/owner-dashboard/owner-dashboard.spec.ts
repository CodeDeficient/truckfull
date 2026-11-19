import { test, expect } from '@playwright/test';

test.describe('Owner Dashboard Access', () => {
  test('should load dashboard for authenticated owner', async ({ page }) => {
    // 1. Navigate to dashboard
    await page.goto('/owner-dashboard');

    // 2. Verify URL stays on dashboard (no redirect to login)
    await expect(page).toHaveURL(/.*?owner-dashboard/);
    await expect(page).not.toHaveURL(/.*?auth=open/);

    // 3. Verify Dashboard Header is present
    // Based on header.tsx: <h1 className="text-xl font-semibold">Dashboard</h1>
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();

    // 4. Verify specific owner content is loaded
    // "My Trucks" is a key part of the TrucksTable component
    await expect(page.locator('text=My Food Trucks')).toBeVisible();
  });
});
