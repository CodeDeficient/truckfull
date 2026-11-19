import { test, expect } from '@playwright/test';

test.describe('Owner Facebook Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should display facebook page at /owner-dashboard/facebook', async ({ page }) => {
    await page.goto('/owner-dashboard/facebook');
    await expect(page).toHaveURL(/\/owner-dashboard\/facebook/);
  });

  test('should display Automatic Updates card with title', async ({ page }) => {
    await page.goto('/owner-dashboard/facebook');
    await expect(page.getByText('Automatic Updates')).toBeVisible();
    await expect(page.getByText(/connect your facebook page/i)).toBeVisible();
  });

  test('should show truck selector dropdown', async ({ page }) => {
    await page.goto('/owner-dashboard/facebook');
    const truckSelect = page.locator('#truck-select');
    await expect(truckSelect).toBeVisible();
  });

  test('should display Connect Facebook Page button when not connected', async ({ page }) => {
    await page.goto('/owner-dashboard/facebook');
    await expect(page.getByRole('button', { name: /connect facebook page/i })).toBeVisible();
  });

  test('should toggle webhook sync switch', async ({ page }) => {
    await page.goto('/owner-dashboard/facebook');
    const webhookSwitch = page.locator('[aria-label="Enable webhook sync"]');
    if (await webhookSwitch.isVisible()) {
      await webhookSwitch.click();
    }
  });
});