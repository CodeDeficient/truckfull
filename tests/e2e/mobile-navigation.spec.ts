import { test, expect } from '@playwright/test';

/**
 * Mobile Navigation E2E Tests
 *
 * Tests that all mobile routes are accessible and navigation links work.
 * Uses mobile viewport (Pixel 5) to match real mobile experience.
 * Note: Routes are NOT prefixed with @mobile - that folder is a route group for organization.
 */

const MOBILE_ROUTES = [
  '/discover_food_trucks',
  '/food_truck_list',
  '/favorites',
  '/user_profile',
  '/search_and_filter',
  '/events_and_specials',
  '/events_and_specials/list',
  '/contact_support',
  '/app_settings',
  '/terms_of_service',
  '/privacy_policy',
  '/login',
  '/profile_&_menu_editor',
  '/submit_new_food_truck',
  '/inventory_management_(owner)',
  '/owner_profile_settings',
] as const;

test.describe('Mobile Navigation', () => {
  test.describe.configure({ mode: 'serial' });

  for (const route of MOBILE_ROUTES) {
    test(`route ${route} loads without errors`, async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', (err) => {
        errors.push(err.message);
      });

      const response = await page.goto(route, { waitUntil: 'networkidle' });

      expect(response?.status()).toBeLessThan(400);

      const criticalErrors = errors.filter(
        (e) => !e.includes('Warning') && !e.includes('Download the React DevTools'),
      );

      expect(criticalErrors).toHaveLength(0);
    });
  }

  test('bottom navigation links work in Footer', async ({ page }) => {
    await page.goto('/events_and_specials', { waitUntil: 'networkidle' });

    const mapLink = page.locator('a[href="/discover_food_trucks"]').first();
    await mapLink.click();

    await expect(page).toHaveURL(/\/discover_food_trucks/);
  });

  test('settings bottom navigation links work', async ({ page }) => {
    await page.goto('/app_settings', { waitUntil: 'networkidle' });

    const trucksLink = page.locator('a[href="/food_truck_list"]').first();
    await trucksLink.click();

    await expect(page).toHaveURL(/\/food_truck_list/);
  });
});
