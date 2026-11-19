import { test, expect, Page } from '@playwright/test';
import { getSupabaseAdmin } from '../lib/supabase/client';

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

// Helper function to clean up test users
async function cleanupTestUsers() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Delete test users from auth.users table
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const testUsers = users?.users?.filter(
      (u) => u.email === TEST_USER.email || u.email === TEST_ADMIN.email,
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

test.describe('Authentication System', () => {
  // Setup and teardown
  test.beforeAll(async () => {
    console.log('Setting up test users...');
    await cleanupTestUsers();
    await createTestUser(TEST_USER.email, TEST_USER.password, TEST_USER.role);
    await createTestUser(TEST_ADMIN.email, TEST_ADMIN.password, TEST_ADMIN.role);
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

  test('should display login page with all required elements', async ({ page }) => {
    await page.goto('/login');

    // Check for login page elements
    await expect(page.locator('h1, h2').filter({ hasText: /Admin Login|Login/i })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in with Email")')).toBeVisible();

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
    expect(currentUrl).toMatch(/\/(user-dashboard|dashboard|home)/);

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
    await page.screenshot({ path: 'test-results/screenshots/admin-dashboard.png', fullPage: true });
  });

  test('should protect authenticated routes from unauthenticated access', async ({ page }) => {
    // Ensure user is not logged in
    const isLoggedIn = await isUserLoggedIn(page);
    expect(isLoggedIn).toBe(false);

    // Try to access protected routes
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/favorites');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should successfully sign out', async ({ page }) => {
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

// Export for use in other tests
export { TEST_USER, TEST_ADMIN, cleanupTestUsers, createTestUser, isUserLoggedIn, signOut };
