import { test, expect } from '@playwright/test';

test.describe('Mobile search-to-detail flow', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.mobile-layout')).toBeVisible({ timeout: 15000 });
  });

  test('tapping a truck in search results opens bottom sheet with detail tabs and claim section', async ({
    page,
  }) => {
    // Step 1: Type in the search input to trigger LiveSearchList
    const searchInput = page.getByPlaceholder('Search...');
    await searchInput.fill('taco');

    // Step 2: Wait for search results to appear (LiveSearchList renders rows with data-row-key)
    const searchResults = page.locator('[data-row-key]').filter({ has: page.locator('button') });
    await expect(searchResults.first()).toBeVisible({ timeout: 10000 });

    // Step 3: Click the first result
    await searchResults.first().click();

    // Step 4: Verify the bottom sheet opens with MobileTruckDetails tabs
    const hoursTab = page.getByRole('button', { name: /hours/i });
    const contactTab = page.getByRole('button', { name: /contact/i });

    await expect(hoursTab).toBeVisible({ timeout: 5000 });
    await expect(contactTab).toBeVisible({ timeout: 5000 });

    // Step 5: Click Contact tab and verify the claim banner appears
    await contactTab.click();
    const claimBanner = page.getByText(/is this your truck/i);
    await expect(claimBanner).toBeVisible({ timeout: 5000 });

    // Step 6: Click "Claim it now" to verify the ClaimTruckModal opens
    const claimButton = page.getByRole('button', { name: /claim it now/i });
    await expect(claimButton).toBeVisible({ timeout: 3000 });
    await claimButton.click();

    const claimModal = page.getByRole('dialog');
    await expect(claimModal).toBeVisible({ timeout: 3000 });
  });
});
