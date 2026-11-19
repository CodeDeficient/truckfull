import { test, expect } from '@playwright/test';

test.describe('Owner Field Guide', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should display field guide page', async ({ page }) => {
    await page.goto('/owner-dashboard/field-guide');
    await expect(page.getByRole('heading', { name: 'Field Guide' })).toBeVisible();
  });

  test('should display location page', async ({ page }) => {
    await page.goto('/owner-dashboard/location');
    await expect(page.getByRole('heading', { name: /Update Truck Location/i })).toBeVisible();
  });

  test('should show Get Current Location button', async ({ page }) => {
    await page.goto('/owner-dashboard/location');
    await expect(page.getByRole('button', { name: 'Get Current Location' })).toBeVisible();
  });

  test('should show Clear Status button', async ({ page }) => {
    await page.goto('/owner-dashboard/location');
    await expect(page.getByRole('button', { name: 'Clear Status' })).toBeVisible();
  });
});
