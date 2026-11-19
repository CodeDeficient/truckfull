import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * The local runner script injects LOCAL_SUPABASE_* from `supabase status`.
 * These take precedence over .env.local (which targets staging) so the test
 * stack always runs against the LOCAL Supabase project.
 */
if (process.env.LOCAL_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.LOCAL_SUPABASE_URL;
}
if (process.env.LOCAL_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.LOCAL_SUPABASE_ANON_KEY;
}

/**
 * Truckless revenue-path E2E config: LOCAL Supabase stack (port 54321) with a
 * dedicated dev server on port 3001. No setup/auth-storageState dependency —
 * each spec signs in through the real login form, so accounts created via
 * the admin client are exercised end-to-end.
 *
 * The runner script (node scripts/run-truckless-e2e.cjs) injects
 * LOCAL_SUPABASE_* env vars from `npx supabase status -o json`; they are
 * never hardcoded in source.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /truckless-revenue-path\.e2e\.test\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['line']],
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        serviceWorkers: 'block',
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3001',
    url: 'http://127.0.0.1:3001',
    // Env object (not command-string prefix) so the Supabase URL cannot be
    // lost to shell-parsing differences. dotenv in next.config.mjs does not
    // override already-set vars, so these win over .env.local (staging).
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
  timeout: 5 * 60 * 1000,
  expect: { timeout: 30 * 1000 },
  outputDir: 'test-results/truckless/',
});