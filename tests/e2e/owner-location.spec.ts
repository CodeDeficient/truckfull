import { test, expect } from '@playwright/test';

test.describe('Owner Location', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should display location page at /owner-dashboard/location', async ({ page }) => {
    await page.goto('/owner-dashboard/location');
    await expect(page).toHaveURL(/\/owner-dashboard\/location/);
  });

  test('should display Update Truck Location heading', async ({ page }) => {
    await page.goto('/owner-dashboard/location');
    await expect(page.getByRole('heading', { name: /update truck location/i })).toBeVisible();
  });

  test('should display Facebook auto-update badge', async ({ page }) => {
    await page.goto('/owner-dashboard/location');
    await expect(page.getByText(/pro.*auto-updates.*facebook/i)).toBeVisible();
  });

  test('should display GPS location updater cards when trucks exist', async ({ page }) => {
    await page.goto('/owner-dashboard/location');
    await expect(page.getByText(/update location for/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display Get Current Location button', async ({ page }) => {
    await page.goto('/owner-dashboard/location');
    await expect(page.getByRole('button', { name: /get current location/i })).toBeVisible();
  });

  test('should display Clear Status button', async ({ page }) => {
    await page.goto('/owner-dashboard/location');
    await expect(page.getByRole('button', { name: /clear status/i })).toBeVisible();
  });

  test('should show no trucks message when user has no trucks', async ({ page }) => {
    await page.goto('/owner-dashboard/location');
    await expect(page.getByText(/no food trucks found/i)).toBeVisible({ timeout: 5000 });
  });
});