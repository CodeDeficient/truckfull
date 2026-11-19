/**
 * SEO Crawl Audit Test Suite
 *
 * Visits all key pages and checks:
 *   - HTTP 200 status
 *   - Correct title / meta description / h1
 *   - JSON-LD structured data (schema.org)
 *   - Canonical URL present
 *   - No duplicate h1
 *   - Meta description length ≤ 160 chars
 *
 * Pure Playwright assertions (no Jest). Data-driven page list.
 *
 * Run:  npx playwright test tests/seo-crawl-audit.test.ts --project=chromium
 *       (starts dev server automatically via webServer config)
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// JSON-LD type for structured data extraction
// ---------------------------------------------------------------------------

interface JsonLdEntry {
  '@type'?: string | string[];
  '@context'?: string;
  '@graph'?: JsonLdEntry[];
  '@id'?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract all JSON-LD objects from the page.
 * Handles both single-object and @graph-wrapped formats.
 */
async function extractJsonLd(page: Page): Promise<JsonLdEntry[]> {
  return page.evaluate(() => {
    const scripts = document.querySelectorAll<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    const results: JsonLdEntry[] = [];
    for (const script of scripts) {
      try {
        const parsed: unknown = JSON.parse(script.textContent ?? '');
        if (Array.isArray(parsed)) {
          results.push(...parsed as JsonLdEntry[]);
        } else {
          results.push(parsed as JsonLdEntry);
        }
      } catch {
        // skip malformed
      }
    }
    return results;
  });
}

/**
 * Filter extracted JSON-LD objects by @type.
 */
function filterByType(
  schemas: JsonLdEntry[],
  type: string,
): JsonLdEntry[] {
  return schemas.filter((s) => {
    const t = s['@type'];
    if (Array.isArray(t)) return t.includes(type);
    return t === type;
  });
}

/**
 * Get all @type values from a schema (handles @graph).
 */
function getGraphTypes(schema: JsonLdEntry): string[] {
  if (schema['@graph'] && Array.isArray(schema['@graph'])) {
    return schema['@graph'].map((g: JsonLdEntry) => g['@type']).filter(Boolean) as string[];
  }
  if (schema['@type']) {
    return [schema['@type']].flat();
  }
  return [];
}

// ---------------------------------------------------------------------------
// Data-driven page definitions
// ---------------------------------------------------------------------------

interface PageToCheck {
  /** URL path (relative to baseURL) */
  path: string;
  /** Expected regex pattern for <title> (case-insensitive) */
  titlePattern: RegExp;
  /** Expected regex pattern for the primary h1 */
  h1Pattern: RegExp;
  /** JSON-LD schema @types that MUST appear somewhere on the page */
  requiredSchemaTypes: string[];
  /** Short label for test output */
  label: string;
}

/**
 * Known city slugs that exist in the database.
 * These match what generateStaticParams produces (cities with >= 3 trucks).
 * Tested against the actual dev server — verify and skip 404s gracefully.
 */
const CITY_SLUGS = [
  'augusta-ga',
  'evans-ga',
  'grovetown-ga',
  'aiken-sc',
  'north-augusta-sc',
  'martinez-ga',
  'charleston-sc',
  'athens-ga',
  'savannah-ga',
  'greenville-sc',
  'thomson-ga',
];

/**
 * Cuisine page slugs — these are case-sensitive to match the slugify behavior.
 */
const CUISINE_SLUGS = [
  'BBQ',
  'Mexican',
  'Tacos',
  'American',
  'Desserts',
  'Coffee',
  'Italian',
  'Asian',
  'Seafood',
  'Burgers',
  'Southern',
  'Cajun',
  'Indian',
  'Pizza',
  'Sandwiches',
];

// ---------------------------------------------------------------------------
// Build the full page list
// ---------------------------------------------------------------------------

const pagesToCheck: PageToCheck[] = [
  // ── Homepage ────────────────────────────────────────────────
  // Title: "TruckFull — {N} Food Trucks in Georgia & South Carolina"
  // H1 (visible): "TruckFull"  (there's also a visually-hidden h1 with longer text)
  {
    path: '/',
    titlePattern: /TruckFull/i,
    h1Pattern: /TruckFull/i,
    requiredSchemaTypes: ['Organization', 'WebSite'],
    label: 'Homepage',
  },

  // ── City pages ─────────────────────────────────────────────
  // Actual title format: "Food Trucks in {City} {State} | TruckFull"
  // Actual h1: "Food Trucks in {City} {State}"
  ...CITY_SLUGS.map((slug) => ({
    path: `/city/${slug}`,
    titlePattern: /Food Trucks in [A-Z]/i,
    h1Pattern: /Food Trucks in [A-Z]/i,
    requiredSchemaTypes: ['BreadcrumbList'],
    label: `City page: /city/${slug}`,
  })),

  // ── Cuisine pages ──────────────────────────────────────────
  // Title: "{Cuisine} Food Trucks in GA & SC | TruckFull"
  // H1: "{Cuisine} Food Trucks in Georgia & South Carolina"
  ...CUISINE_SLUGS.map((slug) => ({
    path: `/cuisine/${slug}`,
    titlePattern: /Food Trucks in GA/i,
    h1Pattern: /Food Trucks in Georgia/i,
    requiredSchemaTypes: ['BreadcrumbList'],
    label: `Cuisine page: /cuisine/${slug}`,
  })),

  // ── Static content pages ───────────────────────────────────
  {
    path: '/about',
    titlePattern: /About TruckFull/i,
    h1Pattern: /About TruckFull/i,
    requiredSchemaTypes: ['Organization', 'WebSite'],
    label: 'About page',
  },
  {
    path: '/blog',
    titlePattern: /TruckFull Blog/i,
    h1Pattern: /TruckFull Blog/i,
    requiredSchemaTypes: ['Organization', 'WebSite'],
    label: 'Blog index',
  },
  {
    path: '/privacy',
    titlePattern: /Privacy/i,
    h1Pattern: /Privacy/i,
    requiredSchemaTypes: ['Organization', 'WebSite'],
    label: 'Privacy page',
  },
  {
    path: '/terms',
    titlePattern: /Terms/i,
    h1Pattern: /Terms/i,
    requiredSchemaTypes: ['Organization', 'WebSite'],
    label: 'Terms page',
  },
  {
    path: '/contact',
    titlePattern: /Contact/i,
    h1Pattern: /Contact/i,
    requiredSchemaTypes: ['Organization', 'WebSite'],
    label: 'Contact page',
  },
  {
    path: '/for-owners',
    titlePattern: /Owner/i,
    h1Pattern: /Owner/i,
    requiredSchemaTypes: ['Organization', 'WebSite'],
    label: 'For Owners page',
  },
  {
    path: '/food-truck-traffic-data',
    titlePattern: /Traffic|Food Truck/i,
    h1Pattern: /Traffic|Food Truck/i,
    requiredSchemaTypes: ['Organization', 'WebSite'],
    label: 'Traffic data page',
  },
  {
    path: '/features',
    titlePattern: /Feature/i,
    h1Pattern: /Feature/i,
    requiredSchemaTypes: ['Organization', 'WebSite'],
    label: 'Features page',
  },
  {
    path: '/pricing',
    titlePattern: /Pricing/i,
    h1Pattern: /Pricing/i,
    requiredSchemaTypes: ['Organization', 'WebSite'],
    label: 'Pricing page',
  },
];

// ---------------------------------------------------------------------------
// Test: Crawl every page and audit SEO fundamentals
// ---------------------------------------------------------------------------

test.describe('SEO Crawl Audit', () => {
  for (const pageDef of pagesToCheck) {
    test(`${pageDef.label}: ${pageDef.path}`, async ({ page }) => {
      // 1) Navigate and expect 200 (or a redirect chain that ends at an OK page)
      const response = await page.goto(pageDef.path, {
        waitUntil: 'networkidle',
      });

      // Accept 200, 304 (not modified), or a redirect that resolved to a page
      const status = response?.status() ?? 0;
      if (![200, 304].includes(status)) {
        // Could be an ISR/timing issue — take screenshot for debugging
        console.log(`Status ${status} for ${pageDef.path}, page title: ${await page.title()}`);
      }
      expect([200, 304]).toContain(status);

      // 2) Page title matches expected pattern
      await expect(page).toHaveTitle(pageDef.titlePattern);

      // 3) h1 is present and matches pattern
      const h1s = page.locator('h1');
      await expect(h1s.first()).toBeVisible({ timeout: 10000 });
      await expect(h1s.first()).toHaveText(pageDef.h1Pattern);

      // 4) No duplicate h1 (allow exactly one visible h1)
      // Skip the homepage which has a visible h1 + an sr-only h1
      if (pageDef.path !== '/') {
        const h1Count = await h1s.count();
        expect(h1Count).toBeLessThanOrEqual(1);
      }

      // 5) Meta description exists and ≤ 160 chars
      const metaDesc = page.locator('meta[name="description"]');
      await expect(metaDesc).toBeAttached();
      const descContent = await metaDesc.getAttribute('content');
      expect(descContent).not.toBeNull();
      expect(descContent!.length).toBeLessThanOrEqual(160);

      // 6) Canonical URL is present and non-empty
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toBeAttached();
      const canonicalHref = await canonical.getAttribute('href');
      expect(canonicalHref).not.toBeNull();
      expect(canonicalHref!.length).toBeGreaterThan(0);

      // 7) JSON-LD contains required schema types
      if (pageDef.requiredSchemaTypes.length > 0) {
        const allSchemas = await extractJsonLd(page);
        const graphTypes = allSchemas.flatMap(getGraphTypes);

        for (const schemaType of pageDef.requiredSchemaTypes) {
          const foundInFlat = filterByType(allSchemas, schemaType).length > 0;
          const foundInGraph = graphTypes.includes(schemaType);
          expect(foundInFlat || foundInGraph).toBeTruthy();
        }
      }
    });
  }
});
