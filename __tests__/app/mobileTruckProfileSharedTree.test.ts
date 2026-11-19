import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('mobile truck profile uses the shared responsive tree', () => {
  it('re-exports the primary truck page so the mobile slot renders the same responsive profile', () => {
    const source = readSource('app/@mobile/[slug]/page.tsx');

    expect(source).toContain("export { default, generateMetadata } from '../../[slug]/page';");
    expect(source).not.toMatch(
      /MobileDefault|getPublicTruckBySlug|PUBLIC_TRUCK_SELECT_FIELDS|dangerouslySetInnerHTML|findMatchingTruckBySlug/,
    );
  });

  it('keeps the primary truck page as the single responsive renderer', () => {
    const source = readSource('app/[slug]/page.tsx');

    expect(source).toContain(
      "import TruckProfileShell from '@/components/truck-profile/TruckProfileShell'",
    );
  });
});
