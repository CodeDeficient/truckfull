import { test, expect } from '@playwright/test';

test.describe('SEO redirect and 404 behavior', () => {
  test('/best/bbq redirects to /cuisine/bbq', async ({ page }) => {
    const response = await page.goto('/best/bbq', { waitUntil: 'networkidle' });
    expect(page.url()).toMatch(/\/cuisine\/bbq$/);
  });

  for (const path of ['/city', '/city/']) {
    test(`${path} permanently redirects to the /trucks city hub`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(new URL(response.headers()['location'] ?? '').pathname).toBe('/trucks');
    });
  }

  test('/best/augusta-ga permanently redirects to its city page', async ({ request }) => {
    const response = await request.get('/best/augusta-ga', { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(new URL(response.headers()['location'] ?? '', 'http://x').pathname).toBe(
      '/city/augusta-ga',
    );
  });

  test('unknown blog slug returns 404 page', async ({ page }) => {
    const response = await page.goto('/blog/this-post-does-not-exist', { waitUntil: 'networkidle' });
    // Should show the 404 page, not the blog index
    await expect(page.locator('h1')).toContainText('404');
  });

  test('unknown /best/ slug shows 404', async ({ page }) => {
    const response = await page.goto('/best/this-is-not-a-real-slug', { waitUntil: 'networkidle' });
    // Should show 404 page
    await expect(page.locator('h1')).toContainText('404');
  });

  test('/best/bbq has proper meta description', async ({ page }) => {
    const response = await page.goto('/best/bbq', { waitUntil: 'networkidle' });
    // After redirect, should be on /cuisine/bbq with proper metadata
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc?.length).toBeGreaterThan(70);
    expect(desc?.length).toBeLessThan(180);
  });
});
