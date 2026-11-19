import { test, expect } from '@playwright/test';

test.describe('claim-your-truck listing submission form', () => {
  test('the List tab no longer uses a mailto link', async ({ page }) => {
    await page.goto('/claim-your-truck');
    await page.getByRole('tab', { name: /List/ }).click();

    const listTab = page.getByRole('tabpanel');
    await expect(listTab.getByRole('heading', { name: /Don't See Your Truck Listed/i })).toBeVisible();

    const mailtoLinks = listTab.locator('a[href^="mailto:"]');
    expect(await mailtoLinks.count()).toBe(0);
  });

  test('submitting the form shows the success confirmation', async ({ page }) => {
    await page.route('**/api/claim-your-truck/submit', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });

    await page.goto('/claim-your-truck');
    await page.getByRole('tab', { name: /List/ }).click();

    const listTab = page.getByRole('tabpanel');
    await listTab.getByLabel(/Truck Name/i).fill('E2E Test Truck');
    await listTab.getByLabel(/Your Email/i).fill('e2e-form@example.com');

    await listTab.getByRole('button', { name: /Submit Truck Listing Request/i }).click();

    await expect(
      listTab.getByText('Your truck information was submitted successfully.'),
    ).toBeVisible();
  });

  test('shows a clear error when the server rejects the submission', async ({ page }) => {
    await page.route('**/api/claim-your-truck/submit', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: '{"error":"Too many submissions. Please try again later."}',
      });
    });

    await page.goto('/claim-your-truck');
    await page.getByRole('tab', { name: /List/ }).click();

    const listTab = page.getByRole('tabpanel');
    await listTab.getByLabel(/Truck Name/i).fill('E2E Test Truck');
    await listTab.getByLabel(/Your Email/i).fill('e2e-form@example.com');

    await listTab.getByRole('button', { name: /Submit Truck Listing Request/i }).click();

    await expect(
      listTab.getByText('Too many submissions. Please try again later.'),
    ).toBeVisible();
  });
});
