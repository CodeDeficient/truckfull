/**
 * E2E Tests for Analytics Dashboard
 *
 * Tests the analytics tab functionality for food truck owners including:
 * - Pro users can view analytics data
 * - Charts/Coming Soon message displays correctly
 * - Time range filters work properly
 *
 * Prerequisites:
 * - Dev server running on localhost:3000
 * - TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD set in .env.local
 * - User has 'pro' or higher subscription tier
 *
 * Run tests:
 *   npm run test:e2e:playwright -- tests/e2e/analytics.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Grant geolocation permissions
    await page.context().grantPermissions(['geolocation']);

    // Dismiss welcome modal
    await page.addInitScript(() => {
      localStorage.setItem('truckfull-welcome-dismissed', 'true');
    });
  });

  test('Pro user sees correct analytics data', async ({ page }) => {
    test.skip(
      !process.env.TEST_OWNER_EMAIL || !process.env.TEST_OWNER_PASSWORD,
      'TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD required',
    );

    // 1. Navigate to owner dashboard
    await page.goto('/owner-dashboard');
    await expect(page).toHaveURL(/.*owner-dashboard/);

    // 2. Click on Analytics tab (tab navigation)
    const analyticsTab = page.getByRole('tab', { name: 'Analytics' });
    await analyticsTab.click();
    await expect(page).toHaveURL(/.*owner-dashboard/);

    // 3. Verify analytics page loads without upgrade prompt (Pro/Starter user)
    await expect(page.getByText('Unlock Engagement Analytics')).not.toBeVisible();
    await expect(page.getByText('Engagement Analytics')).toBeVisible();

    // 4. Wait for metrics to load (wait for loading spinner to disappear)
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 15000 });

    // 5. Verify metrics cards are present
    await expect(page.getByText('Views').first()).toBeVisible();
    await expect(page.getByText('Menu Clicks').first()).toBeVisible();
    await expect(page.getByText('Directions').first()).toBeVisible();
    await expect(page.getByText('Favorites').first()).toBeVisible();
    await expect(page.getByText('Website').first()).toBeVisible();
    await expect(page.getByText('Shares').first()).toBeVisible();

    // 6. Verify time range filter is visible (default 30 days)
    await expect(page.getByText('30 Days')).toBeVisible();
    await expect(page.getByText('7 Days')).toBeVisible();
    await expect(page.getByText('90 Days')).toBeVisible();

    // 7. Verify engagement summary card
    await expect(page.getByText('Engagement Summary')).toBeVisible();
    await expect(page.getByText('Top Actions')).toBeVisible();
    await expect(page.getByText('Conversion Insights')).toBeVisible();
  });

  test('Charts are visible (Coming Soon message)', async ({ page }) => {
    test.skip(
      !process.env.TEST_OWNER_EMAIL || !process.env.TEST_OWNER_PASSWORD,
      'TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD required',
    );

    // 1. Navigate to owner dashboard and open Analytics tab
    await page.goto('/owner-dashboard');
    await page.getByRole('tab', { name: 'Analytics' }).click();

    // 2. Wait for analytics to load
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 15000 });

    // 3. Verify "Coming Soon" message for charts
    await expect(page.getByText('Daily trends chart coming soon')).toBeVisible();
  });

  test('Time range filter works', async ({ page }) => {
    test.skip(
      !process.env.TEST_OWNER_EMAIL || !process.env.TEST_OWNER_PASSWORD,
      'TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD required',
    );

    // 1. Navigate to owner dashboard and open Analytics tab
    await page.goto('/owner-dashboard');
    await page.getByRole('tab', { name: 'Analytics' }).click();

    // 2. Wait for initial load (30 days is default)
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 15000 });

    // 3. Click on "7 Days" filter
    await page.getByText('7 Days').click();

    // 4. Verify API is called with days=7 parameter
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/analytics/summary')) {
        apiRequests.push(request.url());
      }
    });

    // 5. Click "90 Days" filter and verify API call
    await page.getByText('90 Days').click();

    // 6. Wait for API request and verify days parameter
    await page.waitForTimeout(1000);
    const lastRequest = apiRequests[apiRequests.length - 1];
    expect(lastRequest).toContain('days=90');

    // 7. Click back to "30 Days" filter
    await page.getByText('30 Days').click();
    await page.waitForTimeout(1000);

    const lastRequest30 = apiRequests[apiRequests.length - 1];
    expect(lastRequest30).toContain('days=30');
  });

  test('Free users see upgrade prompt', async ({ page }) => {
    test.skip(
      !process.env.TEST_OWNER_EMAIL || !process.env.TEST_OWNER_PASSWORD,
      'TEST_OWNER_EMAIL and TEST_OWNER_PASSWORD required',
    );

    // Note: This test requires a user with 'free' tier
    // You'll need to manually set a user's tier to 'free' before running this test

    // 1. Navigate to owner dashboard and open Analytics tab
    await page.goto('/owner-dashboard');
    await page.getByRole('tab', { name: 'Analytics' }).click();

    // 2. Verify upgrade prompt is shown for free users
    await expect(page.getByText('Unlock Engagement Analytics')).toBeVisible();
    await expect(page.getByText('Upgrade to Pro')).toBeVisible();
    await expect(page.getByText('Profile views')).toBeVisible();
    await expect(page.getByText('Menu clicks')).toBeVisible();
    await expect(page.getByText('Direction requests')).toBeVisible();
    await expect(page.getByText('Favorites')).toBeVisible();
  });
});
