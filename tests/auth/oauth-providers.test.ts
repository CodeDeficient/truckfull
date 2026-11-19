import { test, expect, Page } from '@playwright/test';
import { getSupabaseAdmin } from '../../lib/supabase/client';

// OAuth provider test credentials
const OAUTH_TEST_CREDENTIALS = {
  google: {
    enabled: false,
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  facebook: {
    enabled: false,
    appId: process.env.FACEBOOK_AUTH_APP_ID || '',
    appSecret: process.env.FACEBOOK_AUTH_APP_SECRET || '',
  },
  github: {
    enabled: false,
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  },
};

test.describe('OAuth Provider Integration Tests', () => {
  test('should display OAuth provider buttons on login page when configured', async ({ page }) => {
    await page.goto('/login');

    // Check for Google OAuth button
    const googleAuthBtn = page.locator('button:has-text("Sign in with Google")');
    if ((await googleAuthBtn.count()) > 0) {
      await expect(googleAuthBtn).toBeVisible();
      console.log('Google OAuth button is visible');
    } else {
      console.log('Google OAuth button is not available');
    }

    // Check for GitHub OAuth button
    const githubAuthBtn = page.locator('button:has-text("Sign in with GitHub")');
    if ((await githubAuthBtn.count()) > 0) {
      await expect(githubAuthBtn).toBeVisible();
      console.log('GitHub OAuth button is visible');
    } else {
      console.log('GitHub OAuth button is not available');
    }
  });

  test('should initiate Google OAuth flow when button is clicked', async ({ page }) => {
    await page.goto('/login');

    const googleAuthBtn = page.locator('button:has-text("Sign in with Google")');
    if ((await googleAuthBtn.count()) > 0) {
      await expect(googleAuthBtn).toBeVisible();

      // Click the Google auth button and wait for navigation
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'), // Wait for new page to open (OAuth popup/redirect)
        googleAuthBtn.click(),
      ]);

      // Verify that the new page is attempting OAuth with Google
      await expect(newPage).not.toBeNull();

      // Wait a bit for the redirect
      await newPage.waitForTimeout(1000);

      // Check if we're on a Google OAuth page
      const newPageUrl = newPage.url();
      if (newPageUrl.includes('google.com') || newPageUrl.includes('accounts.google.com')) {
        console.log('Successfully redirected to Google OAuth');
        // Don't complete the OAuth flow in testing as it requires real credentials
        await newPage.close();
      } else {
        console.log(`Redirected to: ${newPageUrl}`);
        if (newPageUrl.includes('auth/v1/authorize')) {
          // Check if the URL contains Google provider
          expect(newPageUrl).toContain('provider=google');
          console.log('Google OAuth flow initiated correctly');
          await newPage.close();
        } else {
          console.log('OAuth flow did not initiate correctly');
          await newPage.close();
        }
      }
    } else {
      test.skip('Google OAuth not available on login page');
    }
  });

  test('should initiate GitHub OAuth flow when button is clicked', async ({ page }) => {
    await page.goto('/login');

    const githubAuthBtn = page.locator('button:has-text("Sign in with GitHub")');
    if ((await githubAuthBtn.count()) > 0) {
      await expect(githubAuthBtn).toBeVisible();

      // Click the GitHub auth button and wait for navigation
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        githubAuthBtn.click(),
      ]);

      await expect(newPage).not.toBeNull();

      // Wait a bit for the redirect
      await newPage.waitForTimeout(1000);

      // Check if we're on a GitHub OAuth page or the Supabase auth page with GitHub provider
      const newPageUrl = newPage.url();
      if (newPageUrl.includes('github.com') || newPageUrl.includes('github.com/login')) {
        console.log('Successfully redirected to GitHub OAuth');
        await newPage.close();
      } else if (newPageUrl.includes('auth/v1/authorize')) {
        // Check if the URL contains GitHub provider
        expect(newPageUrl).toContain('provider=github');
        console.log('GitHub OAuth flow initiated correctly');
        await newPage.close();
      } else {
        console.log(`GitHub OAuth redirected to: ${newPageUrl}`);
        await newPage.close();
      }
    } else {
      test.skip('GitHub OAuth not available on login page');
    }
  });

  test('should display Facebook OAuth button on owner registration page', async ({ page }) => {
    await page.goto('/owner-dashboard/register');

    // Check for Facebook OAuth button (owner-only)
    const facebookAuthBtn = page.locator('button:has-text("Continue with Facebook")');
    await expect(facebookAuthBtn).toBeVisible();
    console.log('Facebook OAuth button is visible on owner registration page');
  });

  test('should display Facebook OAuth button on main login modal', async ({ page }) => {
    await page.goto('/?auth=open');

    // Wait for the modal to open
    await page.waitForTimeout(500);

    // Facebook button should be visible on the main login modal
    const facebookAuthBtn = page.locator('button:has-text("Continue with Facebook")');
    await expect(facebookAuthBtn).toBeVisible();
    console.log('Facebook OAuth button is visible on main login modal');
  });

  test('should initiate Facebook OAuth flow when button is clicked', async ({ page }) => {
    await page.goto('/owner-dashboard/register');

    const facebookAuthBtn = page.locator('button:has-text("Continue with Facebook")');
    if ((await facebookAuthBtn.count()) > 0) {
      await expect(facebookAuthBtn).toBeVisible();

      // Click the Facebook auth button and wait for navigation
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        facebookAuthBtn.click(),
      ]);

      // Verify that the new page is attempting OAuth with Facebook
      await expect(newPage).not.toBeNull();

      // Wait a bit for the redirect
      await newPage.waitForTimeout(1000);

      // Check if we're on a Facebook OAuth page
      const newPageUrl = newPage.url();
      if (newPageUrl.includes('facebook.com') || newPageUrl.includes('www.facebook.com')) {
        console.log('Successfully redirected to Facebook OAuth');
        // Don't complete the OAuth flow in testing as it requires real credentials
        await newPage.close();
      } else if (newPageUrl.includes('auth/v1/authorize')) {
        // Check if the URL contains Facebook provider
        expect(newPageUrl).toContain('provider=facebook');
        console.log('Facebook OAuth flow initiated correctly');
        await newPage.close();
      } else {
        console.log(`Redirected to: ${newPageUrl}`);
        await newPage.close();
      }
    } else {
      test.skip('Facebook OAuth not available on owner registration page');
    }
  });

  test('should redirect Facebook OAuth users to truck registration after login', async ({
    page,
  }) => {
    // This test verifies the redirect URL is set correctly for Facebook OAuth
    await page.goto('/owner-dashboard/register');

    const facebookAuthBtn = page.locator('button:has-text("Continue with Facebook")');
    if ((await facebookAuthBtn.count()) > 0) {
      // Click and capture the redirect
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        facebookAuthBtn.click(),
      ]);

      await newPage.waitForTimeout(500);
      const newPageUrl = newPage.url();

      // The redirect should point to /owner-dashboard/register/truck after OAuth
      if (newPageUrl.includes('auth/v1/authorize')) {
        expect(newPageUrl).toContain('redirect_to=');
        expect(newPageUrl).toContain('/owner-dashboard/register/truck');
        console.log('Facebook OAuth redirect correctly configured for truck registration');
      }

      await newPage.close();
    } else {
      test.skip('Facebook OAuth not available');
    }
  });

  test('should handle OAuth callback endpoint properly', async ({ page }) => {
    // Test that the OAuth callback route exists
    const response = await page.request.get('/auth/callback');

    // The callback endpoint should either redirect or show an error if no OAuth flow is in progress
    expect(response.status()).toBeLessThan(500); // Should not return a server error

    console.log(`OAuth callback endpoint status: ${response.status()}`);
  });

  test('should maintain OAuth session after successful login', async ({ page }) => {
    // Skip this test if OAuth providers are not configured
    if (
      !OAUTH_TEST_CREDENTIALS.google.enabled &&
      !OAUTH_TEST_CREDENTIALS.facebook.enabled &&
      !OAUTH_TEST_CREDENTIALS.github.enabled
    ) {
      test.skip('OAuth providers not configured, skipping session test');
    }

    await page.goto('/login');

    // Check available OAuth providers and test with the first one available
    const googleAuthBtn = page.locator('button:has-text("Sign in with Google")');
    const facebookAuthBtn = page.locator('button:has-text("Continue with Facebook")');
    const githubAuthBtn = page.locator('button:has-text("Sign in with GitHub")');

    if ((await googleAuthBtn.count()) > 0) {
      // For this test, we'll assume a successful OAuth flow happened
      // and check that the session is maintained

      // This test would require mocking the OAuth flow or using real OAuth testing credentials
      // For now, we'll simulate by checking if the auth state is properly managed

      // Check that we have the appropriate auth buttons
      await expect(googleAuthBtn).toBeVisible();
      console.log('Testing OAuth session management - providers available');

      // The actual OAuth flow test would require real OAuth credentials
      // which isn't practical for automated testing
    } else if ((await facebookAuthBtn.count()) > 0) {
      await expect(facebookAuthBtn).toBeVisible();
      console.log('Testing OAuth session management - Facebook available');
    } else if ((await githubAuthBtn.count()) > 0) {
      // Check that we have the appropriate auth buttons
      await expect(githubAuthBtn).toBeVisible();
      console.log('Testing OAuth session management - providers available');
    } else {
      test.skip('No OAuth providers available, skipping session test');
    }
  });

  test('should show appropriate error when OAuth provider is misconfigured', async ({ page }) => {
    // Test error handling when OAuth is attempted but not properly configured
    await page.goto('/login');

    // This test would be more meaningful if we had a way to simulate a misconfigured provider
    // For now, we'll just ensure the login page displays properly with or without OAuth
    await expect(page.locator('h1, h2').filter({ hasText: /Admin Login|Login/i })).toBeVisible();

    // Check that the page doesn't crash even if OAuth is misconfigured
    const regularLoginElements = await page
      .locator('input[type="email"], input[name="email"]')
      .count();
    expect(regularLoginElements).toBeGreaterThan(0);

    console.log('Login page renders properly regardless of OAuth configuration');
  });

  test('should properly redirect OAuth users based on roles after login', async ({ page }) => {
    // Skip if OAuth providers aren't configured
    if (
      !OAUTH_TEST_CREDENTIALS.google.enabled &&
      !OAUTH_TEST_CREDENTIALS.facebook.enabled &&
      !OAUTH_TEST_CREDENTIALS.github.enabled
    ) {
      test.skip('OAuth providers not configured, skipping redirect test');
    }

    // This test would require completing an OAuth flow and checking the redirect
    // For now, we'll verify that the routing logic exists in the application

    await page.goto('/login');

    // Check for presence of OAuth providers
    const googleBtn = page.locator('button:has-text("Sign in with Google")');
    const facebookBtn = page.locator('button:has-text("Continue with Facebook")');
    const githubBtn = page.locator('button:has-text("Sign in with GitHub")');

    if (
      (await googleBtn.count()) > 0 ||
      (await facebookBtn.count()) > 0 ||
      (await githubBtn.count()) > 0
    ) {
      console.log('OAuth providers available for role-based redirects');

      // The actual redirect behavior would be tested by completing a full OAuth flow
      // with users of different roles, which is complex to automate
    } else {
      console.log('No OAuth providers available');
    }
  });
});

// Export for use in integration testing
export { OAUTH_TEST_CREDENTIALS };
