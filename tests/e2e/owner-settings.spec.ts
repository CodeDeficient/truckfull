import { test, expect } from '@playwright/test';

test.describe('Owner Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should display account preferences page', async ({ page }) => {
    await page.goto('/owner-dashboard/settings');
    await expect(page.getByRole('heading', { name: /Account & Preferences/i })).toBeVisible();
  });

  test('should show profile information section', async ({ page }) => {
    await page.goto('/owner-dashboard/settings');
    await expect(page.getByText('Profile Information')).toBeVisible();
  });

  test('should show security settings section', async ({ page }) => {
    await page.goto('/owner-dashboard/settings');
    await expect(page.getByText('Security Settings')).toBeVisible();
  });

  test('should show Save Account Settings button', async ({ page }) => {
    await page.goto('/owner-dashboard/settings');
    await expect(page.getByRole('button', { name: 'Save Account Settings' })).toBeVisible();
  });

  test('should show Delete Account button', async ({ page }) => {
    await page.goto('/owner-dashboard/settings');
    await expect(page.getByRole('button', { name: 'Delete Account' })).toBeVisible();
  });
});
