import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PUBLIC_READ_MODULES = [
  'lib/services/publicTruckPage.ts',
  'lib/services/publicTruckData.server.ts',
  'lib/api/trucks/cachedNearbySearch.ts',
  'lib/content/metrics.ts',
  'lib/events/eventPageData.ts',
  'lib/events/nearbyCities.ts',
  'lib/events/findCanonicalCitySlug.ts',
  'lib/events/eventCanonicalization.ts',
  'app/events/[city-slug]/page.tsx',
];

describe('public page database reads', () => {
  it.each(PUBLIC_READ_MODULES)('%s uses the time-limited reader', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8')
      .replaceAll(/\/\*[\s\S]*?\*\//g, '')
      .replaceAll(/^\s*\/\/.*$/gm, '');
    expect(source).toContain('getSupabasePublicReader()');
    expect(source).not.toContain('getSupabaseAdmin');
  });
});
