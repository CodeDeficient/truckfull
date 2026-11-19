import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env.local for tests
dotenv.config({ path: '.env.local' });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // signup-autoconfirm.spec.ts only runs under playwright.autoconfirm.config.ts
  // (local Supabase autoconfirm on port 3001). Exclude it from the default
  // run, which targets the staging-backed dev server on port 3000.
  //
  // turnstile-sw.spec.ts only runs under playwright.sw.config.ts (service
  // worker enabled). It is excluded here because the default config blocks
  // the service worker, so its SW-controlled assertions would never hold.
  testIgnore: /signup-autoconfirm\.spec\.ts|turnstile-sw\.spec\.ts/,
  /* Run tests in files in parallel */
  fullyParallel: false, // Disabled for E2E tests that modify shared state
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on failure */
    video: 'retain-on-failure',

    /* The serwist service worker intercepts cross-origin requests and breaks
     * the Turnstile script load (net::ERR_FAILED). Block it across every
     * project so the Turnstile E2E spec passes on mobile too. No existing
     * spec exercises PWA/service-worker behavior. */
    serviceWorkers: 'block',
  },

  /* Configure projects for major browsers */
  projects: [
    // API-only test project (no browser, no auth setup required)
    {
      name: 'api',
      testMatch: /.*\.api\.test\.ts/,
    },
    // Setup project to authenticate
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use the auth state saved by the setup project
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile viewport tests
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for server startup
  },

  /* Global test timeout */
  timeout: 5 * 60 * 1000, // 5 minutes for pipeline tests

  /* Expect timeout */
  expect: {
    timeout: 30 * 1000, // 30 seconds
  },

  /* Test output directory */
  outputDir: 'test-results/',
});
