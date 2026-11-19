import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * This test visits the home page and captures console warnings/errors.
 * It does not attempt to log in.
 */
test('collect console logs on home page', async ({ page }) => {
  const logs: { type: string; text: string }[] = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    // Always collect warnings and errors; ignore noisy debug logs
    if (type === 'warning' || type === 'error') {
      logs.push({ type, text });
      // Also echo to stdout so you see them in CI/terminal
      // Prefixed for easy grep
      // eslint-disable-next-line no-console
      console.log(`[console:${type}] ${text}`);
    }
  });

  const res = await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  expect(res?.ok()).toBeTruthy();

  // Give hydration/effects a moment to settle
  await page.waitForTimeout(1000);

  const warnings = logs.filter((l) => l.type === 'warning');
  const errors = logs.filter((l) => l.type === 'error');

  // eslint-disable-next-line no-console
  console.log(`Found ${warnings.length} warning(s) and ${errors.length} error(s)`);

  // Fail the test on console errors; allow warnings but report them
  expect(errors.length, `Console errors found: ${errors.map((e) => e.text).join(' | ')}`).toBe(0);
});
