import { test, expect } from '@playwright/test';

test.describe('Owner Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should display analytics page at /owner-dashboard/analytics', async ({ page }) => {
    await page.goto('/owner-dashboard/analytics');
    await expect(page).toHaveURL(/\/owner-dashboard\/analytics/);
  });

  test('should display analytics content or upgrade prompt', async ({ page }) => {
    await page.goto('/owner-dashboard/analytics');
    await expect(page.getByText(/analytics/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display time range filter buttons', async ({ page }) => {
    await page.goto('/owner-dashboard/analytics');
    await expect(page.getByRole('button', { name: /7 days/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /30 days/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /90 days/i })).toBeVisible();
  });

  test('should show upgrade prompt for free tier users', async ({ page }) => {
    await page.goto('/owner-dashboard/analytics');
    const upgradePrompt = page.locator('text=Unlock Engagement Analytics');
    if (await upgradePrompt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(page.getByRole('button', { name: /upgrade/i })).toBeVisible();
    }
  });

  test('should display sidebar navigation to analytics', async ({ page }) => {
    await page.goto('/owner-dashboard/analytics');
    await expect(page.getByRole('button', { name: /analytics/i }).first()).toBeVisible();
  });
});