import { test, expect } from '@playwright/test';

test.describe('Owner Events', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should display events page', async ({ page }) => {
    await page.goto('/owner-dashboard/events');
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
  });

  test('should show Discover tab', async ({ page }) => {
    await page.goto('/owner-dashboard/events');
    await expect(page.getByRole('tab', { name: 'Discover' })).toBeVisible();
  });

  test('should show My Applications tab', async ({ page }) => {
    await page.goto('/owner-dashboard/events');
    await expect(page.getByRole('tab', { name: 'My Applications' })).toBeVisible();
  });

  test('should show Calendar tab', async ({ page }) => {
    await page.goto('/owner-dashboard/events');
    await expect(page.getByRole('tab', { name: 'Calendar' })).toBeVisible();
  });
});
