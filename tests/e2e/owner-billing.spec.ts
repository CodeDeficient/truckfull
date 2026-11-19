import { test, expect } from '@playwright/test';

test.describe('Owner Billing', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should display billing page at /owner-dashboard/billing', async ({ page }) => {
    await page.goto('/owner-dashboard/billing');
    await expect(page).toHaveURL(/\/owner-dashboard\/billing/);
  });

  test('should display Current Plan card with plan name', async ({ page }) => {
    await page.goto('/owner-dashboard/billing');
    await expect(page.getByText('Current Plan')).toBeVisible();
    await expect(page.getByText(/Plan/i)).toBeVisible();
  });

  test('should display Payment Method card', async ({ page }) => {
    await page.goto('/owner-dashboard/billing');
    await expect(page.getByText('Payment Method')).toBeVisible();
  });

  test('should display Upgrade to Pro button for free tier', async ({ page }) => {
    await page.goto('/owner-dashboard/billing');
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible();
  });

  test('should display plan features list', async ({ page }) => {
    await page.goto('/owner-dashboard/billing');
    await expect(page.getByText(/Basic Profile Management/i)).toBeVisible();
  });

  test('should open upgrade modal when clicking upgrade button', async ({ page }) => {
    await page.goto('/owner-dashboard/billing');
    await page.getByRole('button', { name: /upgrade to pro/i }).click();
    await expect(page.getByText(/upgrade|plans|pricing/i)).toBeVisible({ timeout: 3000 });
  });
});