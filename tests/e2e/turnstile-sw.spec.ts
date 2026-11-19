import { test, expect, type Page } from '@playwright/test';

/**
 * Service-worker-active Turnstile E2E tests.
 *
 * Runs ONLY under playwright.sw.config.ts (which leaves the service worker
 * enabled). The main playwright.config.ts blocks the service worker because
 * the serwist worker intercepts cross-origin requests; that masking is
 * exactly what this suite exists to catch: the worker re-fetches the
 * Turnstile script from inside its own scope, where the page CSP's
 * connect-src applies. When connect-src omitted challenges.cloudflare.com,
 * the in-worker fetch threw, the page saw net::ERR_FAILED, window.turnstile
 * stayed undefined, and Create Account could never enable.
 *
 * Uses Cloudflare's official always-pass test credentials from .env.local;
 * never the production sitekey.
 */

const uniqueEmail = (): string => `e2e-sw-${Date.now()}-${Math.floor(Math.random() * 1e6)}@gmail.com`;

test.describe('Signup Turnstile with active service worker', () => {
  test('widget loads and solves on a SW-controlled reload (regression)', async ({ page }) => {
    const cfScriptFailures: string[] = [];
    page.on('requestfailed', (request) => {
      if (request.url().includes('challenges.cloudflare.com/turnstile/v0/api.js')) {
        cfScriptFailures.push(`${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`);
      }
    });

    // First visit: registers/activates the service worker (skipWaiting +
    // clientsClaim in app/sw.ts claim the page). ?auth=open opens the auth
    // modal in signin mode, mirroring the real-user path from the main spec.
    await page.goto('/?auth=open', { waitUntil: 'domcontentloaded' });

    // Wait until the worker has registered, activated, and claimed this
    // page, so the reload below is deterministically SW-controlled.
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker?.controller)), {
        timeout: 15000,
      })
      .toBe(true);

    // Second visit under SW control — the exact state that reproduced the
    // production failure, since the Turnstile script is injected dynamically
    // only once the signup modal is opened.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker?.controller)), {
        timeout: 15000,
      })
      .toBe(true);

    await openSignupModal(page);

    // The script loaded and the widget became usable. Before the CSP fix
    // this stayed undefined forever (the in-SW fetch failed with
    // net::ERR_FAILED and the library's onload callback never fired).
    await expect
      .poll(() => page.evaluate(() => typeof window.turnstile), { timeout: 20000 })
      .toBe('object');

    // The Turnstile script tag itself must not have failed to load. Scoped
    // to the api.js script URL so the widget's own in-iframe requests to
    // challenges.cloudflare.com (which don't flow through the page's SW
    // interception path anyway) can't flake this assertion.
    expect(cfScriptFailures).toEqual([]);

    // Widget solves (always-pass test key) → token present → button enables.
    await page.getByRole('textbox', { name: 'Email' }).fill(uniqueEmail());
    await page.getByRole('textbox', { name: 'Password' }).fill('StrongPass123!');
    await page.getByRole('checkbox', { name: /I agree to the/ }).check();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeEnabled({
      timeout: 20000,
    });
  });
});

async function openSignupModal(page: Page): Promise<void> {
  await page.getByRole('button', { name: "Don't have an account? Sign up" }).click();
}
