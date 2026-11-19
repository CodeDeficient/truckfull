import { test, expect } from '@playwright/test';

test.describe('Event Map Radius Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should show radius slider on the event map', async ({ page }) => {
    await page.goto('/owner-dashboard/events');

    await page.getByRole('tab', { name: 'Discover' }).click();

    await expect(
      page.getByTestId('radius-slider'),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('should display event count after loading', async ({ page }) => {
    await page.goto('/owner-dashboard/events');

    await page.getByRole('tab', { name: 'Discover' }).click();

    await expect(
      page.getByText(/\d+ events/),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('should update event count when radius slider is adjusted', async ({ page }) => {
    await page.goto('/owner-dashboard/events');

    await page.getByRole('tab', { name: 'Discover' }).click();

    const countEl = page.getByText(/\d+ events/);
    await countEl.toBeVisible({ timeout: 15_000 });

    const initialCount = await countEl.textContent();
    expect(initialCount).toBeTruthy();

    const slider = page.getByTestId('radius-slider');
    await slider.fill('5');

    const filteredCount = await countEl.textContent();
    expect(filteredCount).toBeTruthy();

    expect(Number(filteredCount)).toBeLessThanOrEqual(Number(initialCount));
  });

  test('should show radius value label', async ({ page }) => {
    await page.goto('/owner-dashboard/events');

    await page.getByRole('tab', { name: 'Discover' }).click();

    await page.getByText(/50 mi/).toBeVisible({ timeout: 15_000 });
  });

  test('should render the map container', async ({ page }) => {
    await page.goto('/owner-dashboard/events');

    await page.getByRole('tab', { name: 'Discover' }).click();

    await expect(
      page.getByTestId('mapbox-map'),
    ).toBeVisible({ timeout: 15_000 });
  });
});
