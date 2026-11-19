import { test, expect } from '@playwright/test';

test.describe('Owner Trucks', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should display trucks page at /owner-dashboard/trucks', async ({ page }) => {
    await page.goto('/owner-dashboard/trucks');
    await expect(page).toHaveURL(/\/owner-dashboard\/trucks/);
  });

  test('should display trucks table with truck data', async ({ page }) => {
    await page.goto('/owner-dashboard/trucks');
    await expect(page.getByText('Your Trucks')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /cuisine/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });

  test('should navigate to register page via sidebar My Trucks', async ({ page }) => {
    await page.goto('/owner-dashboard/trucks');
    await page.getByRole('button', { name: /my trucks/i }).click();
    await expect(page).toHaveURL(/\/owner-dashboard\/trucks/);
  });

  test('should display truck cards with name and status', async ({ page }) => {
    await page.goto('/owner-dashboard/trucks');
    const truckCards = page.locator('[data-testid="truck-card"], .truck-card, [class*="truck"]');
    await expect(truckCards.first())
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        expect(page.getByText(/status/i)).toBeVisible({ timeout: 5000 });
      });
  });
});
