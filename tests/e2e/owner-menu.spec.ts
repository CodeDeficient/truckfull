import { test, expect } from '@playwright/test';

test.describe('Owner Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should display menu management page', async ({ page }) => {
    await page.goto('/owner-dashboard/menu');
    await expect(page.locator('h3:has-text("Menu Management")')).toBeVisible();
  });

  test('should show search input', async ({ page }) => {
    await page.goto('/owner-dashboard/menu');
    await expect(page.locator('input[placeholder="Search menu items..."]')).toBeVisible();
  });

  test('should display Add Item button', async ({ page }) => {
    await page.goto('/owner-dashboard/menu');
    await expect(page.getByRole('button', { name: /add new menu item/i })).toBeVisible();
  });

  test('should show Edit button for menu items', async ({ page }) => {
    await page.goto('/owner-dashboard/menu');
    await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible();
  });
});
