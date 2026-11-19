import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PUBLIC_PAGE_FILES = [
  'app/page.tsx',
  'app/@mobile/events/page.tsx',
  'app/[slug]/page.tsx',
  'app/best/[slug]/page.tsx',
  'app/blog/page.tsx',
  'app/blog/[slug]/page.tsx',
  'app/city/[slug]/page.tsx',
  'app/cuisine/[slug]/page.tsx',
  'app/events/page.tsx',
  'app/events/[city-slug]/page.tsx',
] as const;

const PUBLIC_DATA_CACHE_FILES = [
  'lib/seo/getTruckCount.ts',
  'lib/services/publicTruckPage.ts',
] as const;

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('public application-data cache policy', () => {
  it.each(PUBLIC_PAGE_FILES)('%s does not use hourly route revalidation', (relativePath) => {
    expect(readSource(relativePath)).not.toMatch(/export const revalidate\s*=\s*3600\b/);
  });

  it.each(PUBLIC_DATA_CACHE_FILES)('%s does not use hourly Next data caching', (relativePath) => {
    expect(readSource(relativePath)).not.toMatch(
      /(?:revalidate|REVALIDATE_SECONDS|CACHE_TTL)\s*=\s*3600\b/,
    );
  });
});
