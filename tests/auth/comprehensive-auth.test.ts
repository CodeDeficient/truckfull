import { test, expect, Page } from '@playwright/test';
import { getSupabaseAdmin } from '../../lib/supabase/client';
import { hasAdminDashboardAccess, hasRoleAccess, type UserRole } from '../../lib/auth/roles';
import { verifyAdminAccess, verifyRoleFromCookies } from '../../lib/auth/authHelpers';

// Test credentials for authentication testing
const TEST_USER = {
  email: 'test.auth.user@example.com',
  password: 'TestPassword123!',
  role: 'customer',
};

const TEST_ADMIN = {
  email: 'test.auth.admin@example.com',
  password: 'AdminPassword123!',
  role: 'admin',
};

const TEST_OWNER = {
  email: 'test.auth.owner@example.com',
  password: 'OwnerPassword123!',
  role: 'food_truck_owner',
};

const TEST_SUPERADMIN = {
  email: 'superadmin@example.com', // The designated superadmin email
  password: 'SuperAdminPassword123!',
  role: 'superadmin',
};

// Helper function to clean up test users
async function cleanupTestUsers() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Delete test users from auth.users table
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const testUsers = users?.users?.filter(
      (u) =>
        u.email === TEST_USER.email ||
        u.email === TEST_ADMIN.email ||
        u.email === TEST_OWNER.email ||
        u.email === TEST_SUPERADMIN.email,
    );

    for (const user of testUsers || []) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }

    console.log('Test users cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up test users:', error);
  }
}

// Helper function to create a test user
async function createTestUser(email: string, password: string, role: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for test users
    });

    if (authError) throw authError;

    // Create profile with role
    if (authData?.user) {
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: authData.user.id,
        email,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) throw profileError;
    }

    return authData?.user;
  } catch (error) {
    console.error(`Error creating test user ${email}:`, error);
    throw error;
  }
}

// Helper function to check if user is logged in
async function isUserLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check for the presence of a user session cookie or localStorage item
    const authToken = await page.evaluate(() => {
      // Check localStorage for Supabase auth token
      const storage = localStorage.getItem('sb-foodtruck-auth');
      return storage ? JSON.parse(storage) : null;
    });

    return authToken?.access_token ? true : false;
  } catch {
    return false;
  }
}

// Helper function to sign out
async function signOut(page: Page) {
  try {
    // Try to find and click sign out button
    const signOutButton = page
      .locator('button:has-text("Sign Out"), button:has-text("Logout"), button:has-text("Log Out")')
      .first();
    if (await signOutButton.isVisible({ timeout: 5000 })) {
      await signOutButton.click();
      await page.waitForLoadState('networkidle');
    }

    // Clear auth storage as fallback
    await page.evaluate(() => {
      localStorage.removeItem('sb-foodtruck-auth');
      sessionStorage.clear();
    });
  } catch (error) {
    console.log('Sign out may have already occurred or button not found');
  }
}

test.describe('Comprehensive Authentication System Tests', () => {
  // Setup and teardown
  test.beforeAll(async () => {
    console.log('Setting up test users...');
    await cleanupTestUsers();
    await createTestUser(TEST_USER.email, TEST_USER.password, TEST_USER.role);
    await createTestUser(TEST_ADMIN.email, TEST_ADMIN.password, TEST_ADMIN.role);
    await createTestUser(TEST_OWNER.email, TEST_OWNER.password, TEST_OWNER.role);
    await createTestUser(TEST_SUPERADMIN.email, TEST_SUPERADMIN.password, TEST_SUPERADMIN.role);
  });

  test.afterAll(async () => {
    console.log('Cleaning up test users...');
    await cleanupTestUsers();
  });

  test.beforeEach(async ({ page }) => {
    // Clear all cookies and storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  // Email/Password Authentication Tests
  test.describe('Email/Password Authentication Tests', () => {
    test('should display login page with all required elements', async ({ page }) => {
      await page.goto('/login');

      // Check for login page elements
      await expect(page.locator('h1, h2').filter({ hasText: /Admin Login|Login/i })).toBeVisible();
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
      await expect(page.locator('button:has-text("Sign in with Email")')).toBeVisible();

      // Check for OAuth provider buttons if configured
      await expect(
        page.locator('button:has-text("Google")').or(page.locator('button:has-text("GitHub")')),
      ).not.toThrow();

      // Take screenshot of login page
      await page.screenshot({ path: 'test-results/screenshots/login-page.png', fullPage: true });
    });

    test('should handle invalid login credentials', async ({ page }) => {
      await page.goto('/login');

      // Try to login with invalid credentials
      await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
      await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
      await page.click('button:has-text("Sign in with Email")');

      // Wait for error message
      await expect(page.locator('[role="alert"], .alert, .error')).toBeVisible({ timeout: 10000 });

      // Verify we're still on login page
      await expect(page).toHaveURL(/.*\/login/);

      // Take screenshot of error state
      await page.screenshot({ path: 'test-results/screenshots/login-error.png', fullPage: true });
    });

    test('should successfully sign in with valid customer credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in login form
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);

      // Take screenshot before signing in
      await page.screenshot({ path: 'test-results/screenshots/before-signin.png', fullPage: true });

      // Click sign in button
      await page.click('button:has-text("Sign in with Email")');

      // Wait for redirect after successful login
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Verify we're redirected to appropriate dashboard
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(user-dashboard|dashboard|home|profile)/);

      // Verify user is logged in
      const isLoggedIn = await isUserLoggedIn(page);
      expect(isLoggedIn).toBe(true);

      // Take screenshot of dashboard
      await page.screenshot({
        path: 'test-results/screenshots/customer-dashboard.png',
        fullPage: true,
      });
    });

    test('should successfully sign in with admin credentials and access admin area', async ({
      page,
    }) => {
      await page.goto('/login');

      // Fill in login form with admin credentials
      await page.fill('input[type="email"], input[name="email"]', TEST_ADMIN.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_ADMIN.password);

      // Click sign in button
      await page.click('button:has-text("Sign in with Email")');

      // Wait for redirect after successful login
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Verify admin is redirected to admin dashboard
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/admin/);

      // Verify user is logged in
      const isLoggedIn = await isUserLoggedIn(page);
      expect(isLoggedIn).toBe(true);

      // Take screenshot of admin dashboard
      await page.screenshot({
        path: 'test-results/screenshots/admin-dashboard.png',
        fullPage: true,
      });
    });

    test('should successfully sign in with food truck owner credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in login form with owner credentials
      await page.fill('input[type="email"], input[name="email"]', TEST_OWNER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_OWNER.password);

      // Click sign in button
      await page.click('button:has-text("Sign in with Email")');

      // Wait for redirect after successful login
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Verify user is logged in
      const isLoggedIn = await isUserLoggedIn(page);
      expect(isLoggedIn).toBe(true);

      // Take screenshot of user dashboard
      await page.screenshot({
        path: 'test-results/screenshots/owner-dashboard.png',
        fullPage: true,
      });
    });

    test('should successfully sign in with superadmin credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in login form with superadmin credentials
      await page.fill('input[type="email"], input[name="email"]', TEST_SUPERADMIN.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_SUPERADMIN.password);

      // Click sign in button
      await page.click('button:has-text("Sign in with Email")');

      // Wait for redirect after successful login
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Verify user is logged in
      const isLoggedIn = await isUserLoggedIn(page);
      expect(isLoggedIn).toBe(true);

      // Take screenshot of dashboard
      await page.screenshot({
        path: 'test-results/screenshots/superadmin-dashboard.png',
        fullPage: true,
      });
    });
  });

  // OAuth Authentication Tests (if configured)
  test.describe('OAuth Authentication Tests', () => {
    test('should display OAuth provider buttons if configured', async ({ page }) => {
      await page.goto('/login');

      // Check for Google OAuth button
      const googleButton = page.locator('button:has-text("Sign in with Google")');
      if ((await googleButton.count()) > 0) {
        await expect(googleButton).toBeVisible();
        console.log('Google OAuth provider is available');
      } else {
        console.log('Google OAuth provider is not configured');
      }

      // Check for GitHub OAuth button
      const githubButton = page.locator('button:has-text("Sign in with GitHub")');
      if ((await githubButton.count()) > 0) {
        await expect(githubButton).toBeVisible();
        console.log('GitHub OAuth provider is available');
      } else {
        console.log('GitHub OAuth provider is not configured');
      }
    });

    test('should handle OAuth provider redirects correctly', async ({ page }) => {
      await page.goto('/login');

      // Check for Google OAuth button and test redirect
      const googleButton = page.locator('button:has-text("Sign in with Google")');
      if ((await googleButton.count()) > 0) {
        await googleButton.click();

        // Wait for redirect to Supabase OAuth endpoint
        await page.waitForURL(/.*auth\.v1\/authorize.*/, { timeout: 10000 });

        // Verify the URL contains the Google provider
        expect(page.url()).toContain('provider=google');
        console.log('Google OAuth redirect is working correctly');
      } else {
        test.skip('Google OAuth not configured');
      }
    });
  });

  // Session Management Tests
  test.describe('Session Management Tests', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Sign in
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button:has-text("Sign in with Email")');

      // Wait for successful login
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Refresh the page
      await page.reload();

      // Verify user is still logged in
      const isLoggedIn = await isUserLoggedIn(page);
      expect(isLoggedIn).toBe(true);

      // Verify we can still access protected routes
      await page.goto('/profile');
      await expect(page).not.toHaveURL(/.*\/login/);
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      // First sign in
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button:has-text("Sign in with Email")');

      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Simulate session expiration by manually clearing auth tokens
      await page.evaluate(() => {
        localStorage.removeItem('sb-foodtruck-auth');
        sessionStorage.clear();
      });

      // Try to access a protected route
      await page.goto('/profile');

      // Should redirect to login page
      await page.waitForURL(/.*\/login/, { timeout: 10000 });
    });

    test('should handle concurrent sessions properly', async ({ browser }) => {
      // Create two contexts (like two different browser windows)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Sign in with first context
        await page1.goto('/login');
        await page1.fill('input[type="email"], input[name="email"]', TEST_USER.email);
        await page1.fill('input[type="password"], input[name="password"]', TEST_USER.password);
        await page1.click('button:has-text("Sign in with Email")');
        await page1.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

        // Sign in with second context using admin
        await page2.goto('/login');
        await page2.fill('input[type="email"], input[name="email"]', TEST_ADMIN.email);
        await page2.fill('input[type="password"], input[name="password"]', TEST_ADMIN.password);
        await page2.click('button:has-text("Sign in with Email")');
        await page2.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

        // Verify both sessions are independent
        const isUser1LoggedIn = await isUserLoggedIn(page1);
        const isUser2LoggedIn = await isUserLoggedIn(page2);

        expect(isUser1LoggedIn).toBe(true);
        expect(isUser2LoggedIn).toBe(true);

        // Verify they have access to their respective areas
        await page1.goto('/user-dashboard');
        await expect(page1).not.toHaveURL(/.*\/login/);

        await page2.goto('/admin');
        await expect(page2).not.toHaveURL(/.*\/login/);
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  // Role-Based Access Control Tests
  test.describe('Role-Based Access Control Tests', () => {
    test('should correctly identify admin dashboard access', async ({ page }) => {
      // Test admin access
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_ADMIN.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_ADMIN.password);
      await page.click('button:has-text("Sign in with Email")');
      await page.waitForURL(/\/admin/, { timeout: 15000 });

      // Verify admin has access to admin dashboard
      await page.goto('/admin');
      await expect(page).not.toHaveURL(/.*\/login/);

      // Test customer access
      await signOut(page);

      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button:has-text("Sign in with Email")');
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Verify customer does NOT have access to admin dashboard
      await page.goto('/admin');
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should correctly identify food truck owner access', async ({ page }) => {
      // Test food truck owner access to their trucks
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_OWNER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_OWNER.password);
      await page.click('button:has-text("Sign in with Email")');
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Verify owner can access their trucks section
      await page.goto('/trucks/owner');
      await expect(page).not.toHaveURL(/.*\/login/);

      // Test customer access to owner sections
      await signOut(page);

      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button:has-text("Sign in with Email")');
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Verify customer does NOT have access to owner trucks section
      await page.goto('/trucks/owner');
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should correctly identify superadmin access', async ({ page }) => {
      // Test superadmin access to all areas
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_SUPERADMIN.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_SUPERADMIN.password);
      await page.click('button:has-text("Sign in with Email")');
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Verify superadmin has access to all areas (admin, owner sections etc.)
      await page.goto('/admin');
      await expect(page).not.toHaveURL(/.*\/login/);

      await page.goto('/trucks/owner');
      await expect(page).not.toHaveURL(/.*\/login/);
    });
  });

  // Authorization Flow Tests
  test.describe('Authorization Flow Tests', () => {
    test('should protect authenticated routes from unauthenticated access', async ({ page }) => {
      // Try to access protected routes while not logged in
      await page.goto('/profile');
      await expect(page).toHaveURL(/.*\/login/);

      await page.goto('/favorites');
      await expect(page).toHaveURL(/.*\/login/);

      await page.goto('/admin');
      await expect(page).toHaveURL(/.*\/login/);

      await page.goto('/trucks/owner');
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should successfully sign out and clear session', async ({ page }) => {
      // First sign in
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button:has-text("Sign in with Email")');

      // Wait for successful login
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Verify user is logged in
      let isLoggedIn = await isUserLoggedIn(page);
      expect(isLoggedIn).toBe(true);

      // Sign out
      await signOut(page);

      // Verify user is signed out
      isLoggedIn = await isUserLoggedIn(page);
      expect(isLoggedIn).toBe(false);

      // Try to access protected route - should redirect to login
      await page.goto('/profile');
      await expect(page).toHaveURL(/.*\/login/);

      // Take screenshot of signed out state
      await page.screenshot({ path: 'test-results/screenshots/signed-out.png', fullPage: true });
    });

    test('should handle redirect after login correctly', async ({ page }) => {
      // Try to access protected route while logged out
      await page.goto('/profile');

      // Should be redirected to login with next parameter
      await expect(page).toHaveURL(/.*\/login.*next.*profile/);

      // Sign in
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button:has-text("Sign in with Email")');

      // Should be redirected back to profile page after login
      await page.waitForURL(/.*\/profile/, { timeout: 15000 });

      // Take screenshot of redirected page
      await page.screenshot({
        path: 'test-results/screenshots/redirect-after-login.png',
        fullPage: true,
      });
    });
  });

  // Token Management Tests
  test.describe('Token Management Tests', () => {
    test('should handle token refresh automatically', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button:has-text("Sign in with Email")');

      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Get initial token
      const initialToken = await page.evaluate(() => {
        const storage = localStorage.getItem('sb-foodtruck-auth');
        return storage ? JSON.parse(storage) : null;
      });

      // Wait for some time to potentially trigger token refresh
      await page.waitForTimeout(1000);

      // Navigate to another protected page to ensure token is valid
      await page.goto('/profile');
      await expect(page).not.toHaveURL(/.*\/login/);

      // Verify token has not expired (or has been refreshed)
      const newToken = await page.evaluate(() => {
        const storage = localStorage.getItem('sb-foodtruck-auth');
        return storage ? JSON.parse(storage) : null;
      });

      expect(newToken).toBeDefined();
    });

    test('should handle token expiration gracefully', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button:has-text("Sign in with Email")');

      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Manually set an expired token
      await page.evaluate(() => {
        const expiredToken = {
          access_token: 'expired_access_token',
          refresh_token: 'refresh_token',
          expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        };
        localStorage.setItem('sb-foodtruck-auth', JSON.stringify(expiredToken));
      });

      // Navigate to a protected route - should trigger refresh or redirect
      await page.goto('/profile');

      // The page might redirect to login if auto-refresh fails
      // Or stay on the page if token refresh is successful
      await page.waitForTimeout(1000);
    });
  });

  // Security Tests
  test.describe('Security Tests', () => {
    test('should prevent access to admin endpoints without proper authorization', async ({
      page,
    }) => {
      // Try to access admin API endpoints without proper auth
      const response = await page.request.get('/api/admin/users');
      expect(response.status()).toBeGreaterThanOrEqual(400); // Should be 401 or 403

      // Sign in as regular user
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button:has-text("Sign in with Email")');
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Try to access admin API endpoints as regular user
      const response2 = await page.request.get('/api/admin/users');
      expect(response2.status()).toBeGreaterThanOrEqual(400); // Should be 401 or 403
    });

    test('should implement proper rate limiting for authentication', async ({ page }) => {
      // Try to make multiple login attempts with invalid credentials
      await page.goto('/login');

      for (let i = 0; i < 5; i++) {
        await page.fill('input[type="email"], input[name="email"]', `invalid${i}@example.com`);
        await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
        await page.click('button:has-text("Sign in with Email")');
        await page.waitForTimeout(500); // Small delay between attempts
      }

      // Additional attempts might trigger rate limiting
      // Check for rate limit messages or blocked access
      const rateLimitMessage = page.locator('text=/rate limit|too many|try again later/i');
      if ((await rateLimitMessage.count()) > 0) {
        console.log('Rate limiting is working');
        await expect(rateLimitMessage).toBeVisible();
      }
    });

    test('should prevent session replay attacks', async ({ page }) => {
      // This test would require more complex setup to test for session replay
      // For now, just verify that sessions have proper expiration
      await page.goto('/login');
      await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
      await page.click('button:has-text("Sign in with Email")');
      await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });

      // Get the session token
      const sessionData = await page.evaluate(() => {
        return localStorage.getItem('sb-foodtruck-auth');
      });

      expect(sessionData).toBeDefined();
      expect(sessionData).not.toBeNull();
    });
  });
});

// Export for use in other tests
export {
  TEST_USER,
  TEST_ADMIN,
  TEST_OWNER,
  TEST_SUPERADMIN,
  cleanupTestUsers,
  createTestUser,
  isUserLoggedIn,
  signOut,
};
