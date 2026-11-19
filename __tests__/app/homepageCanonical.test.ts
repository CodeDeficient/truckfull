import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HOMEPAGE_CANONICAL = 'https://www.truckfull.food/';

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

/**
 * Regression coverage for the homepage canonical fix (GSC "Duplicate without
 * user-selected canonical" on /?truck=… and /?city=… states).
 *
 * Next.js merges segment metadata shallowly: a page's own `alternates`
 * overrides the layout's, but a page WITHOUT `alternates` INHERITS the
 * layout's canonical. Therefore:
 *  - the homepage canonical must live on app/page.tsx (the '/' page segment),
 *  - the root layout must not declare any canonical, or every metadata-less
 *    non-homepage route (pricing, privacy, terms, about, contact, takedown,
 *    account-deleted, organizer, claim-your-truck, not-found, …) would
 *    canonicalize to '/',
 *  - routes that define their own canonical must keep it.
 */
describe('homepage canonical scoping', () => {
  it('canonicalizes /, /?truck=…, and /?city=… to the homepage via the page segment', () => {
    // app/page.tsx is the matched page for '/', '/?truck=…', and '/?city=…'
    // (query parameters never change segment resolution), so a static
    // canonical on that segment applies to all three states. Next.js's
    // resolver renders a canonical of 'https://www.truckfull.food/' for the
    // '/' pathname as the bare origin (resolveAbsoluteUrlWithPathname returns
    // result.origin when the resolved pathname is '/'), which is the same
    // resource for crawlers and distinct from every non-homepage route.
    const source = readSource('app/page.tsx');

    expect(source).toContain("canonical: 'https://www.truckfull.food/'");
  });

  it('never leaks the homepage canonical through the root layout', () => {
    const source = readSource('app/layout.tsx');

    expect(source).not.toContain('alternates');
  });

  describe('non-homepage routes never inherit the homepage canonical', () => {
    // Pages that export Metadata WITHOUT alternates. The layout no longer
    // declares one, so these render no canonical — asserted by absence of the
    // homepage canonical in every metadata definition in the repo.
    const METADATA_WITHOUT_CANONICAL = [
      'app/pricing/page.tsx',
      'app/privacy/page.tsx',
      'app/terms/page.tsx',
      'app/about/page.tsx',
      'app/contact/page.tsx',
      'app/takedown/page.tsx',
      'app/account-deleted/page.tsx',
      'app/not-found.tsx',
      'app/organizer/layout.tsx',
      'app/claim-your-truck/layout.tsx',
      'app/admin/menu-enrichment/page.tsx',
    ];

    for (const file of METADATA_WITHOUT_CANONICAL) {
      it(`${file} does not canonicalize to the homepage`, () => {
        expect(readSource(file)).not.toContain(HOMEPAGE_CANONICAL);
      });
    }
  });

  describe('routes with their own canonical retain it', () => {
    const SELF_CANONICAL_ROUTES: ReadonlyArray<readonly [string, string]> = [
      ['app/events/page.tsx', '`${BASE_URL}/events`'],
      ['app/blog/page.tsx', "'https://www.truckfull.food/blog'"],
      ['app/for-owners/page.tsx', 'CANONICAL_URL'],
      ['app/for-organizers/page.tsx', 'CANONICAL_URL'],
      ['app/features/page.tsx', 'CANONICAL_URL'],
      ['app/food-truck-event-research/page.tsx', 'CANONICAL_URL'],
      ['app/food-truck-live-location/page.tsx', 'CANONICAL_URL'],
      ['app/food-truck-traffic-data/page.tsx', 'CANONICAL_URL'],
    ];

    for (const [file, expected] of SELF_CANONICAL_ROUTES) {
      it(`${file} keeps its self canonical`, () => {
        expect(readSource(file)).toContain(`canonical: ${expected}`);
      });
    }
  });

  describe('dynamic routes resolve canonicals through builders that set alternates', () => {
    const BUILDER_ROUTES: ReadonlyArray<readonly [string, string]> = [
      ['app/[slug]/page.tsx', 'lib/seo/truckMetadata.ts'],
      ['app/blog/[slug]/page.tsx', 'lib/seo/blogMetadata.ts'],
      ['app/events/[city-slug]/[event-slug]/page.tsx', 'lib/seo/eventMetadata.ts'],
      ['app/events/[city-slug]/page.tsx', 'lib/seo/eventMetadata.ts'],
      ['app/city/[slug]/page.tsx', 'lib/seo/cityMetadata.ts'],
      ['app/cuisine/[slug]/page.tsx', 'app/cuisine/[slug]/page.tsx'],
    ];

    for (const [route, builder] of BUILDER_ROUTES) {
      it(`${route} delegates to a builder that emits alternates`, () => {
        expect(readSource(builder)).toContain('alternates');
      });
    }
  });
});
