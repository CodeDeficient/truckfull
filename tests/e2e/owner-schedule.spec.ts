import { test, expect } from '@playwright/test';

test.describe('Owner Schedule — persisted operating hours', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('shows truck selector for multi-truck owner', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    const selector = page.getByRole('combobox');
    await expect(selector).toBeVisible();
  });

  test('selecting TruckFull Test Truck shows Wednesday 8:00 AM – 1:00 PM', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    const selector = page.getByRole('combobox');
    await selector.click();

    await page.getByRole('option', { name: 'TruckFull Test Truck' }).click();

    const wedCell = page.locator('[data-testid="day-wednesday"]');
    await expect(wedCell).toBeVisible();
    await expect(wedCell).toContainText('8:00');
    await expect(wedCell).toContainText('1:00');
  });

  test('switching trucks changes displayed schedule data', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    const selector = page.getByRole('combobox');
    await selector.click();
    await page.getByRole('option', { name: 'TruckFull Test Truck' }).click();

    const wedCell = page.locator('[data-testid="day-wednesday"]');
    await expect(wedCell).toContainText('8:00');

    await selector.click();
    await page.getByRole('option', { name: 'Sunset Tacos Co' }).click();

    // Sunset Tacos has no Wednesday hours — cell should show Closed
    await expect(wedCell).toContainText('Closed');
  });

  test('hardcoded demo records do not appear', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    await expect(page.getByText('Regular Week Schedule')).not.toBeVisible();
    await expect(page.getByText('Waterfront Location')).not.toBeVisible();
    await expect(page.getByText('Weekend Market')).not.toBeVisible();
    await expect(page.getByText('Downtown')).not.toBeVisible();
    await expect(page.getByText('Central Park')).not.toBeVisible();
  });

  test('hours-only cards do not show a fallback address', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    const selector = page.getByRole('combobox');
    await selector.click();
    await page.getByRole('option', { name: 'TruckFull Test Truck' }).click();

    const wedCell = page.locator('[data-testid="day-wednesday"]');
    await expect(wedCell).toBeVisible();
    await expect(wedCell.getByText(/Main|Street|Ave|Blvd|Drive|Road|Waterfront|Park/i)).not.toBeVisible();
  });

  test('existing Add Recurring Schedule form remains visible', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    await expect(page.getByRole('button', { name: 'Add Schedule' })).toBeVisible();
  });

  test('Recurring and Special Events tabs remain visible', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    await expect(page.getByRole('tab', { name: 'Recurring' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Special Events' })).toBeVisible();
  });

  test('timezone selector is absent (removed intentionally)', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    await expect(page.getByText('Timezone:')).not.toBeVisible();
  });

  test('delete and close controls remain present', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    const selector = page.getByRole('combobox');
    await selector.click();
    await page.getByRole('option', { name: 'TruckFull Test Truck' }).click();

    const wedCell = page.locator('[data-testid="day-wednesday"]');
    await expect(wedCell.locator('[data-testid="delete-wednesday"]')).toBeVisible();
  });

  test('hard refresh retains persisted schedule values', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    const selector = page.getByRole('combobox');
    await selector.click();
    await page.getByRole('option', { name: 'TruckFull Test Truck' }).click();
    await expect(page.locator('[data-testid="day-wednesday"]')).toBeVisible();

    await page.reload();

    await expect(page.locator('[data-testid="day-wednesday"]')).toBeVisible();
  });

  test('RED: Add Schedule form (noop) must not change the calendar', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    const selector = page.getByRole('combobox');
    await selector.click();
    await page.getByRole('option', { name: 'TruckFull Test Truck' }).click();

    const wedCell = page.locator('[data-testid="day-wednesday"]');
    const originalText = await wedCell.textContent();

    // Open the collapsible and click Add Schedule
    await page.getByRole('button', { name: 'Add recurring schedule' }).click();
    const addButton = page.getByRole('button', { name: 'Add Schedule' });
    await expect(addButton).toBeVisible();
    await addButton.click();

    await expect(wedCell).toHaveText(originalText ?? '');
  });

  test('RED: Close dialog must not hide the day until confirmed and saved', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    const selector = page.getByRole('combobox');
    await selector.click();
    await page.getByRole('option', { name: 'TruckFull Test Truck' }).click();

    const wedCell = page.locator('[data-testid="day-wednesday"]');
    await expect(wedCell).toBeVisible();

    const closeButton = wedCell.locator('[data-testid="delete-wednesday"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    // Dialog is open but the day cell is still visible
    await expect(wedCell).toBeVisible();
    // Cancel the dialog — day should remain unchanged
    await page.locator('[data-testid="cancel-close-wednesday"]').click();
    await expect(wedCell).toBeVisible();
  });

  test('RED: Edit dialog must not save until confirmed', async ({ page }) => {
    await page.goto('/owner-dashboard/schedule');

    const selector = page.getByRole('combobox');
    await selector.click();
    await page.getByRole('option', { name: 'TruckFull Test Truck' }).click();

    const wedCell = page.locator('[data-testid="day-wednesday"]');
    await expect(wedCell).toBeVisible();

    const editButton = wedCell.locator('[data-testid="edit-wednesday"]');
    await expect(editButton).toBeVisible();
    await editButton.click();
    // Edit dialog is open, day cell still shows original data
    await expect(wedCell).toBeVisible();
    // Close dialog without saving
    await page.locator('[data-testid="cancel-edit-wednesday"]').click();
    await expect(wedCell).toBeVisible();
  });
});
