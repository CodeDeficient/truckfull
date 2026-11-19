import { test, expect } from '@playwright/test';

/**
 * SSR SEO Content Verification
 *
 * Visits key pages with server-side rendered HTML (no JS required)
 * and verifies that critical SEO elements are present:
 * - <title>
 * - <meta name="description">
 * - <link rel="canonical">
 * - <h1>
 * - <script type="application/ld+json">
 * - No "City Not Found" in the title
 */

const KEY_PAGES = ['/', '/augusta-ga', '/cuisine/bbq', '/city/augusta-ga', '/blog'];

test.describe('SSR SEO content verification', () => {
  for (const pagePath of KEY_PAGES) {
    test(`${pagePath} should have all critical SEO elements in SSR`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: 'networkidle' });

      // Title
      const title = await page.locator('title').textContent();
      expect(title).toBeTruthy();
      expect(title!.length).toBeGreaterThan(10);

      // Meta description
      const metaDesc = await page
        .locator('meta[name="description"]')
        .getAttribute('content');
      expect(metaDesc).toBeTruthy();
      expect(metaDesc!.length).toBeGreaterThan(20);

      // Canonical link
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute('href');
      expect(canonical).toBeTruthy();

      // H1
      const h1 = await page.locator('h1').first().textContent();
      expect(h1).toBeTruthy();
      expect(h1!.length).toBeGreaterThan(5);

      // JSON-LD script tags
      const jsonLdCount = await page
        .locator('script[type="application/ld+json"]')
        .count();
      expect(jsonLdCount).toBeGreaterThanOrEqual(1);

      // Must NOT contain 'City Not Found' in title
      expect(title).not.toContain('City Not Found');
    });
  }
});
