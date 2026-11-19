import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env.local first, then override Supabase env vars to point at the
// LOCAL Supabase stack (port 54321) with the local anon key, so signup
// completes with an immediate session (autoconfirm).
//
// LOCAL_SUPABASE_URL / LOCAL_SUPABASE_ANON_KEY are injected by
// scripts/run-autoconfirm-e2e.cjs (fetched from `npx supabase status -o json`
// at runtime) — never hardcoded in source.
dotenv.config({ path: '.env.local' });

const LOCAL_SUPABASE_URL = process.env.LOCAL_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY = process.env.LOCAL_SUPABASE_ANON_KEY ?? '';

export default defineConfig({
  testDir: './tests',
  testMatch: /signup-autoconfirm\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'test-results/autoconfirm-html' }]],
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The serwist service worker intercepts cross-origin requests and
        // breaks the Turnstile script load (net::ERR_FAILED). Block it.
        serviceWorkers: 'block',
      },
    },
  ],
  webServer: {
    command:
      'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=' +
      LOCAL_ANON_KEY +
      ' npm run dev -- --hostname 127.0.0.1 --port 3001',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  timeout: 5 * 60 * 1000,
  expect: { timeout: 30 * 1000 },
  outputDir: 'test-results/autoconfirm/',
});
