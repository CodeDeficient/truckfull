import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env.local for tests
dotenv.config({ path: '.env.local' });

/**
 * Service-worker-enabled Playwright config for the Turnstile signup widget.
 *
 * The main playwright.config.ts sets serviceWorkers: 'block' everywhere
 * because the serwist worker intercepts cross-origin requests and, when the
 * page CSP's connect-src omitted challenges.cloudflare.com, broke the
 * Turnstile script load with net::ERR_FAILED. This config intentionally
 * LEAVES the service worker enabled so that path is exercised: the SW must
 * control the page (second visit/reload) and the widget must still load and
 * solve. It runs only tests/e2e/turnstile-sw.spec.ts.
 *
 * Uses Cloudflare's official always-pass test credentials from .env.local,
 * never the production sitekey.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /turnstile-sw\.spec\.ts/,
  testIgnore: /signup-autoconfirm\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'test-results/turnstile-sw-html' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Intentionally NOT set: the service worker must be active for this
        // suite to exercise the SW-intercepted Turnstile script path.
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  timeout: 5 * 60 * 1000,
  expect: { timeout: 30 * 1000 },
  outputDir: 'test-results/turnstile-sw/',
});
