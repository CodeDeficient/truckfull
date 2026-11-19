import { test, expect } from '@playwright/test';

/**
 * SEO Schema Validator — Structured Data Validation Pipeline
 *
 * Crawls key pages, extracts JSON-LD from <script type="application/ld+json"> tags,
 * and validates that required schema types and fields are present.
 *
 * Pure validation — no mocks, no external API calls.
 */

interface SchemaEntry {
  '@type': string;
  [key: string]: unknown;
}

const KEY_PAGES: { path: string; expected: string[] }[] = [
  { path: '/', expected: ['WebSite', 'Organization'] },
  { path: '/city/augusta-ga', expected: ['City', 'FoodEstablishment', 'ItemList', 'BreadcrumbList', 'FAQPage'] },
  { path: '/cuisine/bbq', expected: ['BreadcrumbList', 'FAQPage'] },
  { path: '/blog', expected: ['BlogPosting'] },
];

/**
 * Checks that a required field exists and is not null/undefined.
 */
function hasRequiredField(entry: Record<string, unknown>, field: string): boolean {
  return entry[field] !== undefined && entry[field] !== null;
}

/**
 * Extracts and normalizes all JSON-LD entries from <script type="application/ld+json"> tags.
 * Handles @graph, arrays, and single objects.
 */
async function extractJsonLd(page: import('@playwright/test').Page): Promise<SchemaEntry[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').all();
  const entries: SchemaEntry[] = [];

  for (const script of scripts) {
    const text = await script.textContent();
    if (!text) continue;

    try {
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed)) {
        entries.push(...(parsed as SchemaEntry[]));
      } else if (parsed['@graph']) {
        entries.push(...(parsed['@graph'] as SchemaEntry[]));
      } else {
        entries.push(parsed as SchemaEntry);
      }
    } catch {
      // Skip invalid JSON
      continue;
    }
  }

  return entries;
}

/**
 * Required field definitions per schema @type.
 * Each entry maps a schema type to a list of fields that MUST be present.
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  WebSite: ['@type', 'name', 'url'],
  Organization: ['@type', 'name', 'url'],
  City: ['@type', 'name', 'containedInPlace'],
  FoodEstablishment: ['@type', 'name', 'description', 'url'],
  ItemList: ['@type', 'name', 'numberOfItems'],
  BreadcrumbList: ['@type', 'itemListElement'],
  FAQPage: ['@type', 'mainEntity'],
  BlogPosting: ['@type', 'headline'],
};

// ---------------------------------------------------------------------------
// Schema type presence tests
// ---------------------------------------------------------------------------

for (const { path, expected } of KEY_PAGES) {
  test(`page ${path} should contain expected JSON-LD schema types`, async ({ page }) => {
    await page.goto(path);
    const entries = await extractJsonLd(page);
    const types = entries.map((e) => e['@type']);

    for (const expectedType of expected) {
      expect(types, `Expected @type "${expectedType}" on page ${path}`).toContain(expectedType);
    }
  });
}

// ---------------------------------------------------------------------------
// Required field validation tests
// ---------------------------------------------------------------------------

for (const { path, expected } of KEY_PAGES) {
  test(`page ${path} should have required fields on each schema type`, async ({ page }) => {
    await page.goto(path);
    const entries = await extractJsonLd(page);

    for (const expectedType of expected) {
      const matchingEntries = entries.filter((e) => e['@type'] === expectedType);
      expect(
        matchingEntries.length,
        `Expected at least one @type "${expectedType}" on page ${path}`,
      ).toBeGreaterThanOrEqual(1);

      const requiredFields = REQUIRED_FIELDS[expectedType];
      if (!requiredFields) continue;

      // Validate each matching entry has required fields
      for (const entry of matchingEntries) {
        for (const field of requiredFields) {
          expect(
            hasRequiredField(entry as Record<string, unknown>, field),
            `@type "${expectedType}" on page ${path} is missing required field "${field}"`,
          ).toBe(true);
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// JSON-LD structural integrity tests
// ---------------------------------------------------------------------------

test('all pages should have parseable JSON-LD (no malformed scripts)', async ({ page }) => {
  for (const { path } of KEY_PAGES) {
    await page.goto(path);
    const scripts = await page.locator('script[type="application/ld+json"]').all();

    for (const script of scripts) {
      const text = await script.textContent();
      if (!text) continue;

      // Verify it's valid JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Will be caught by the expect below
      }

      expect(
        parsed,
        `Page ${path} has malformed JSON-LD: ${text?.substring(0, 100)}`,
      ).toBeDefined();
    }
  }
});
