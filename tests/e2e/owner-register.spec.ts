import { test, expect } from '@playwright/test';

test.describe('Owner Register', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('truckfull-welcome-dismissed', 'true'));
  });

  test('should display register page at /owner-dashboard/register', async ({ page }) => {
    await page.goto('/owner-dashboard/register');
    await expect(page).toHaveURL(/\/owner-dashboard\/register/);
  });

  test('should display owner registration card with title and description', async ({ page }) => {
    await page.goto('/owner-dashboard/register');
    await expect(page.getByText('Become a Food Truck Owner')).toBeVisible();
    await expect(page.getByText(/Create your account to start managing/i)).toBeVisible();
  });

  test('should display OAuth signup options', async ({ page }) => {
    await page.goto('/owner-dashboard/register');
    const googleButton = page.getByRole('button', { name: /google|sign up with google/i });
    const facebookButton = page.getByRole('button', { name: /facebook|sign up with facebook/i });
    const hasGoogle = await googleButton.isVisible().catch(() => false);
    const hasFacebook = await facebookButton.isVisible().catch(() => false);
    expect(hasGoogle || hasFacebook).toBeTruthy();
  });

  test('should display legal links', async ({ page }) => {
    await page.goto('/owner-dashboard/register');
    await expect(page.getByText('Terms of Service')).toBeVisible();
    await expect(page.getByText('Privacy Policy')).toBeVisible();
  });

  test('should display sign in link for existing users', async ({ page }) => {
    await page.goto('/owner-dashboard/register');
    await expect(page.getByText(/already have an account/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});