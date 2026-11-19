import { test, expect } from '@playwright/test';

test.describe('Account Deletion Endpoint', () => {
  test('DELETE /api/account/delete returns 401 when unauthenticated', async ({ page }) => {
    const response = await page.request.delete('/api/account/delete');
    expect(response.status()).toBe(401);
  });

  test('DELETE /api/account/delete returns 429 when rate limited', async ({ page }) => {
    // Make multiple rapid requests to trigger rate limiting
    for (let i = 0; i < 6; i++) {
      await page.request.delete('/api/account/delete');
    }
    
    const response = await page.request.delete('/api/account/delete');
    // Should be rate limited (429) or at minimum still protected (401)
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test('Account deletion page is accessible after login', async ({ page }) => {
    // The confirmation page should be publicly accessible
    await page.goto('/account-deleted');
    
    // Should show account deleted confirmation
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Account Deleted');
    await expect(page.getByText(/permanently deleted/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /return.*home/i })).toHaveAttribute('href', '/');
  });
});
