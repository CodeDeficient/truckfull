import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

const FIRST_VISIT_PAGES = [
  'app/city/[slug]/page.tsx',
  'app/cuisine/[slug]/page.tsx',
  'app/best/[slug]/page.tsx',
  'app/blog/[slug]/page.tsx',
];

describe('truck data is not read at build time', () => {
  it.each(FIRST_VISIT_PAGES)('%s renders on first visit instead of at build', (file) => {
    const source = readSource(file);
    expect(source).toMatch(
      /export function generateStaticParams\(\): \{ slug: string \}\[\] \{\s*return \[\];\s*\}/,
    );
    expect(source).not.toMatch(/export const dynamicParams = false/);
  });

  it('renders the home page per visit with a cached server-key truck list', () => {
    expect(readSource('app/page.tsx')).toContain("export const dynamic = 'force-dynamic';");
    expect(readSource('app/@mobile/(home)/page.tsx')).toContain(
      "export const dynamic = 'force-dynamic';",
    );
    const loader = readSource('lib/server/homeInitialTrucks.ts');
    expect(loader).toContain('searchNearbyTrucks(');
    expect(loader).not.toContain('getSupabaseBuild');
    const search = readSource('lib/api/trucks/cachedNearbySearch.ts');
    expect(search).toContain('unstable_cache(');
    expect(search).toContain('getSupabasePublicReader()');
  });

  it('loads the public truck catalog with the server key', () => {
    const source = readSource('lib/services/publicTruckData.server.ts');
    const pageFetch = source.slice(
      source.indexOf('async function fetchPublicTruckCatalogPage'),
      source.indexOf('export async function getPublicTruckCatalog'),
    );
    expect(pageFetch).toContain('getSupabasePublicReader()');
    expect(pageFetch).not.toContain('getSupabaseBuild');
  });

  it('reads every public truck RPC with the server key', () => {
    const source = readSource('lib/services/publicTruckData.server.ts');
    expect(source).not.toContain('getSupabaseBuild');
    expect(source).toMatch(/getSupabasePublicReader\(\)\s*\.rpc\('get_public_truck_by_identifier'/);
    expect(source).toMatch(/getSupabasePublicReader\(\)\s*\.rpc\('get_public_truck_count'/);
  });

  it.each(['lib/services/publicTruckPage.ts', 'lib/content/metrics.ts'])(
    '%s reads trucks with the server key',
    (file) => {
      const source = readSource(file);
      expect(source).not.toContain('getSupabaseBuild');
      expect(source).toContain('getSupabasePublicReader()');
    },
  );

  it('looks up the tracked truck with the server key', () => {
    expect(readSource('app/api/analytics/track/route.ts')).toMatch(
      /await getSupabaseAdmin\(\)\s*\.from\('food_trucks'\)/,
    );
  });

  it('reads single trucks in the server truck service with the server key', () => {
    const source = readSource('lib/supabase/services/foodTruckService.ts');
    expect(source).toContain('fetchTruckByIdWithMenu(id, getSupabaseAdmin)');
    expect(source).toMatch(/fetchTruckByIdWithEventsBase\(\s*getSupabaseAdmin\(\)/);
    expect(source).not.toMatch(/getSupabase\(\)\s*\.from\('food_trucks'\)/);
    expect(source).not.toMatch(/getSupabase\(\)\s*\.rpc\('get_data_quality_stats'/);
  });

  it('lists public trucks for the trucks API with the server key', () => {
    const source = readSource('lib/supabase/services/foodTruckService.helpers.ts');
    const publicList = source.slice(
      source.indexOf('export async function _getPublicTrucks'),
      source.indexOf('export async function enrichWithSubscriptionTiers'),
    );
    expect(publicList).toMatch(/await getSupabaseAdmin\(\)\s*\.from\('food_trucks'\)/);
    expect(publicList).not.toContain('getSupabase()');
  });

  it('lists trucks for the admin truck page with the server key', () => {
    const source = readSource('lib/supabase/services/foodTruckService.helpers.ts');
    const adminList = source.slice(
      source.indexOf('export async function fetchTrucksWithMenu'),
      source.indexOf('export async function fetchDomainTrucksWithMenu'),
    );
    expect(adminList).toContain('const supabase = getSupabaseAdmin();');
    expect(adminList).toContain('_getRawTrucks(limit, offset, supabase)');
    expect(adminList).not.toContain('getSupabase()');
  });

  it.each([
    'app/about/page.tsx',
    'app/partnerships/page.tsx',
    'app/features/page.tsx',
    'app/for-organizers/page.tsx',
  ])('%s renders truck metrics per request in the container', (file) => {
    expect(readSource(file)).toContain(
      "if (process.env.NEXT_OUTPUT_STANDALONE === 'true') await connection();",
    );
  });
});
