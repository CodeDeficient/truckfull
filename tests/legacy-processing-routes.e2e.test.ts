/**
 * Legacy post-processing routes E2E (issue #1094).
 *
 * The legacy writer entry points must be unreachable in normal Production
 * operation: both routes reject with 403 while
 * ENABLE_LEGACY_POST_PROCESSING is unset (the default), and the admin UI
 * no longer exposes a trigger for them.
 *
 * These are API-route tests and therefore Playwright per the project rules — the
 * gate flag semantics themselves are unit-tested in
 * __tests__/lib/webhooks/legacyProcessingGate.test.ts. The flag-enabled
 * route path is not covered here (it requires a server started with
 * ENABLE_LEGACY_POST_PROCESSING=true; no separate Playwright project
 * exists for it) — the gate-open wiring is currently untested at the
 * route level.
 *
 * The admin-UI test creates a throwaway admin-role user via the
 * service-role client (pattern from tests/dedup-review.api.test.ts) and
 * signs in through the real auth modal, so the /admin layout renders the
 * actual integration page instead of its 404 fallback for non-admins.
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// crypto.randomUUID() keeps parallel Playwright workers from colliding on
// the same millisecond timestamp (Date.now() alone can).
const TEST_ADMIN_EMAIL = `legacy-gate-admin-${Date.now()}-${crypto.randomUUID()}@test.com`;
const TEST_ADMIN_PASSWORD = 'test-password-123!';

let testAdminUserId: string | undefined;

test.beforeAll(async () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  const authClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await authClient.auth.admin.createUser({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test admin user: ${error?.message}`);
  }
  testAdminUserId = data.user.id;

  const { error: profileError } = await authClient
    .from('profiles')
    .upsert({ id: testAdminUserId, role: 'admin' }, { onConflict: 'id' });
  if (profileError) {
    throw new Error(`Failed to set admin role: ${profileError.message}`);
  }
});

test.afterAll(async () => {
  if (testAdminUserId) {
    const authClient = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await authClient.auth.admin.deleteUser(testAdminUserId);
    if (error) {
      // Fail loudly: a leftover admin-role test user must not go unnoticed.
      throw new Error(`Failed to delete test admin user: ${error.message}`);
    }
  }
});

test('worker route rejects by default when legacy processing is disabled', async ({ request }) => {
  const response = await request.post('/api/worker/process-posts', {
    headers: { authorization: 'Bearer invalid-secret' },
  });
  // Gate fires before auth: 403 (disabled), not 401 (bad secret).
  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ error: 'Legacy post processing is disabled' });
});

test('admin UI no longer exposes the legacy processing trigger', async ({ browser }, testInfo) => {
  // The ?auth=open auto-open only exists in the desktop FoodTruckFinder;
  // the mobile slot never opens the modal, so this browser-flow test runs
  // on the chromium project only (pattern from
  // tests/e2e/schedule-override-mutation.spec.ts).
  test.skip(testInfo.project.name !== 'chromium', 'Admin UI flow runs only on Chromium.');

  // Fresh, unauthenticated context; sign in through the real auth modal
  // (?auth=open auto-opens it) as the throwaway admin user.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const page = await context.newPage();
    await page.goto('/?auth=open');

    await page.getByRole('textbox', { name: 'Email' }).fill(TEST_ADMIN_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(TEST_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(
      page
        .getByRole('link', { name: 'Owner Dashboard' })
        .or(page.locator('button.rounded-full'))
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto('/admin/facebook-integration');
    await expect(page.getByRole('heading', { name: 'Facebook Integration' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Process Pending Posts' })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

