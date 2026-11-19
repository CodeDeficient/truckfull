import { test, expect } from '@playwright/test';

/**
 * Regression test for mobile truck details modal
 *
 * This test was created after fixing a bug where the modal would not open
 * immediately when clicking a truck card on the Discover page. The issue
 * was caused by a stale closure - the TruckDetailsModal was rendered inside
 * a useCallback with missing dependencies.
 *
 * Bug symptoms (before fix):
 * - Modal didn't open on first click
 * - Modal only opened after clicking something else (e.g., Featured tab)
 * - Close button didn't work
 *
 * Root cause: TruckDetailsModal was inside renderMainContent useCallback
 * with stale detailTruck reference.
 *
 * Fix: Moved TruckDetailsModal outside the useCallback to main return.
 */

test.describe('Mobile Truck Details Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to mobile route
    await page.goto('/@mobile');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('opens immediately when clicking a truck card on Discover page', async ({ page }) => {
    // Click the Discover tab in bottom navigation
    await page.getByRole('button', { name: /discover/i }).click();

    // Wait for truck cards to load
    await page.waitForSelector('[class*="rounded-xl"][class*="cursor-pointer"]', {
      timeout: 10000,
    });

    // Click the first truck card
    const firstTruckCard = page.locator('[class*="rounded-xl"][class*="cursor-pointer"]').first();
    await firstTruckCard.click();

    // The modal should open IMMEDIATELY - this is the key assertion
    // If this fails with timeout, the stale closure bug has regressed
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 2000 });

    // Verify it shows truck details content
    await expect(modal.getByText(/about|hours|contact/i)).toBeVisible({ timeout: 2000 });
  });

  test('closes when clicking the X button', async ({ page }) => {
    // Click the Discover tab
    await page.getByRole('button', { name: /discover/i }).click();

    // Wait for and click first truck card
    await page.waitForSelector('[class*="rounded-xl"][class*="cursor-pointer"]', {
      timeout: 10000,
    });
    await page.locator('[class*="rounded-xl"][class*="cursor-pointer"]').first().click();

    // Wait for modal to open
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 2000 });

    // Click the close button (X icon)
    const closeButton = modal
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();
    await closeButton.click();

    // Modal should close IMMEDIATELY - if this fails, close callback has stale closure
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('modal state is independent of other navigation interactions', async ({ page }) => {
    // This test specifically checks the stale closure regression:
    // Before the fix, the modal would only render correctly after
    // navigating to another tab (e.g., Featured) because that forced
    // the useCallback to re-execute.

    // Click Discover tab
    await page.getByRole('button', { name: /discover/i }).click();
    await page.waitForSelector('[class*="rounded-xl"][class*="cursor-pointer"]', {
      timeout: 10000,
    });

    // Click a truck card
    await page.locator('[class*="rounded-xl"][class*="cursor-pointer"]').first().click();

    // Modal should open WITHOUT needing to click Featured or any other tab
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 2000 });

    // Verify the modal shows correct content (not stale/undefined data)
    const modalContent = await modal.textContent();
    expect(modalContent).not.toContain('undefined');
    expect(modalContent).not.toContain('null');
  });
});
