import { test, expect, type APIRequestContext } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/lib/database.remote.types';
import { safeBuildEventSlug } from '@/lib/events/eventSlug';
import { getUpcomingEventFilters } from '@/lib/events/seoEventFilters';
import { slugifyCity } from '@/lib/utils/slugify';

const BASE_URL = 'http://localhost:3000';
const EVENT_DETAIL_SEGMENTS = 3;
const FIXTURE_CLUSTER_LIMIT = 100;
const FIXTURE_CANDIDATE_ID_LIMIT = 1000;

type ExternalEvent = Pick<
  Tables<'external_events'>,
  | 'id'
  | 'title'
  | 'city'
  | 'state'
  | 'event_start_date'
  | 'is_canonical'
  | 'is_food_truck_relevant'
  | 'is_hidden'
  | 'vetting_score'
>;

interface SeoFixture {
  readonly canonical: ExternalEvent;
  readonly nonCanonical: ExternalEvent;
  readonly canonicalUrl: string;
  readonly nonCanonicalUrl: string;
  readonly clusterKey: string;
}

interface SitemapUrls {
  readonly exact: string[];
  readonly normalized: string[];
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Phase 6 requires ${name}`);
  return value;
}

function assertNonProductionSupabase(): { url: string; serviceKey: string } {
  const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const environment = requiredEnv('PHASE6_SEO_ENVIRONMENT');
  if (environment !== 'local' && environment !== 'staging') {
    throw new Error('Phase 6 requires PHASE6_SEO_ENVIRONMENT to be local or staging');
  }
  const allowedRefs = (process.env.PHASE6_SEO_ALLOWED_SUPABASE_PROJECT_REFS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedBaseUrls = (process.env.PHASE6_SEO_ALLOWED_BASE_URLS ?? '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (allowedRefs.length === 0 && allowedBaseUrls.length === 0) {
    throw new Error(
      'Phase 6 requires an explicit non-production Supabase project-ref or base-URL allowlist',
    );
  }
  const parsed = new URL(url);
  const configuredProductionUrl = process.env.PROD_SUPABASE_URL?.trim().replace(/\/$/, '');
  if (configuredProductionUrl && configuredProductionUrl === url.replace(/\/$/, '')) {
    throw new Error('Phase 6 refuses to run against PROD_SUPABASE_URL');
  }
  const projectRef = parsed.hostname.split('.')[0];
  const matchesRef = allowedRefs.includes(projectRef);
  const matchesBaseUrl = allowedBaseUrls.includes(url.replace(/\/$/, ''));
  if (!matchesRef && !matchesBaseUrl) {
    throw new Error('Phase 6 database URL is not in the explicit non-production allowlist');
  }
  return { url, serviceKey };
}

function buildEventUrl(event: ExternalEvent): string {
  if (!event.title || !event.city || !event.state || !event.event_start_date) {
    throw new Error(`Fixture event ${event.id} is missing public slug fields`);
  }
  const eventSlug = safeBuildEventSlug(event.title, event.event_start_date);
  if (!eventSlug) throw new Error(`Fixture event ${event.id} has no valid event slug`);
  return `${BASE_URL}/events/${slugifyCity(event.city, event.state)}/${eventSlug}`;
}

function isEligibleCanonical(event: ExternalEvent): boolean {
  const filters = getUpcomingEventFilters();
  return (
    event.is_canonical === true &&
    event.is_food_truck_relevant === true &&
    event.is_hidden === false &&
    (event.vetting_score ?? 0) >= filters.minimumVettingScore &&
    event.event_start_date !== null &&
    event.event_start_date >= filters.today &&
    event.event_start_date <= filters.horizon
  );
}

function normalizeUrl(value: string): string {
  const url = new URL(value, BASE_URL);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  return `${url.origin}${pathname}`;
}

function normalizePath(value: string): string {
  return new URL(value, BASE_URL).pathname.replace(/\/+$/, '') || '/';
}

function extractSitemapUrls(xml: string): SitemapUrls {
  const exact = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  return { exact, normalized: exact.map((url) => normalizePath(url)) };
}

function duplicateValues(values: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function isEventDetailUrl(value: string): boolean {
  const pathname = new URL(value, BASE_URL).pathname;
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] === 'events' && segments.length === EVENT_DETAIL_SEGMENTS;
}

function getLocation(response: { headers(): Record<string, string> }): string {
  const location = response.headers().location;
  if (!location) throw new Error('Non-canonical event response did not include Location');
  return new URL(location, BASE_URL).toString();
}

async function fetchEventsByIds(
  ids: readonly string[],
  client: SupabaseClient<Database>,
): Promise<ExternalEvent[]> {
  const { data, error } = await client
    .from('external_events')
    .select(
      'id, title, city, state, event_start_date, is_canonical, is_food_truck_relevant, is_hidden, vetting_score',
    )
    .in('id', [...ids]);
  if (error) throw new Error(`Phase 6 fixture lookup failed: ${error.message}`);
  return data ?? [];
}

async function discoverFixture(): Promise<SeoFixture> {
  const { url, serviceKey } = assertNonProductionSupabase();
  const client = createClient(url, serviceKey);
  const { data: clusters, error: clusterError } = await client
    .from('dedup_review_queue')
    .select('cluster_key, candidate_row_ids, proposed_canonical_row_id')
    .order('created_at', { ascending: true })
    .limit(FIXTURE_CLUSTER_LIMIT);
  if (clusterError) throw new Error(`Phase 6 cluster lookup failed: ${clusterError.message}`);

  const clusterRows = clusters ?? [];
  const candidateIds = [...new Set(clusterRows.flatMap((cluster) => cluster.candidate_row_ids))];
  if (candidateIds.length > FIXTURE_CANDIDATE_ID_LIMIT) {
    throw new Error('Phase 6 fixture candidate linkage exceeds the read safety limit');
  }
  const fixtureRows = await fetchEventsByIds(candidateIds, client);
  const rowsById = new Map(fixtureRows.map((row) => [row.id, row]));
  for (const cluster of clusterRows) {
    const canonical = fixtureRows.find(
      (row) => row.id === cluster.proposed_canonical_row_id && isEligibleCanonical(row),
    );
    const nonCanonical = cluster.candidate_row_ids
      .map((id) => rowsById.get(id))
      .find((row) => row?.is_canonical === false);
    if (!canonical || !nonCanonical) continue;
    const canonicalUrl = buildEventUrl(canonical);
    const nonCanonicalUrl = buildEventUrl(nonCanonical);
    if (normalizeUrl(canonicalUrl) === normalizeUrl(nonCanonicalUrl)) continue;
    return {
      canonical,
      nonCanonical,
      canonicalUrl,
      nonCanonicalUrl,
      clusterKey: cluster.cluster_key,
    };
  }

  const canonicalId = requiredEnv('PHASE6_SEO_CANONICAL_EVENT_ID');
  const nonCanonicalId = requiredEnv('PHASE6_SEO_NON_CANONICAL_EVENT_ID');
  const fallbackRows = await fetchEventsByIds([canonicalId, nonCanonicalId], client);
  const canonical = fallbackRows.find((row) => row.id === canonicalId && isEligibleCanonical(row));
  const nonCanonical = fallbackRows.find(
    (row) => row.id === nonCanonicalId && row.is_canonical === false,
  );
  if (!canonical || !nonCanonical) {
    throw new Error('Phase 6 fallback fixture IDs do not identify an eligible canonical pair');
  }
  const canonicalUrl = buildEventUrl(canonical);
  const nonCanonicalUrl = buildEventUrl(nonCanonical);
  if (normalizeUrl(canonicalUrl) === normalizeUrl(nonCanonicalUrl)) {
    throw new Error('Phase 6 fixture rows must produce different public routes');
  }
  return {
    canonical,
    nonCanonical,
    canonicalUrl,
    nonCanonicalUrl,
    clusterKey: 'explicit-fixture',
  };
}

async function fetchSitemap(request: APIRequestContext): Promise<SitemapUrls> {
  const response = await request.get('/sitemap.xml');
  expect(response.ok()).toBe(true);
  return extractSitemapUrls(await response.text());
}

test.describe('event SEO dedup contract', () => {
  test('keeps sitemap event routes unique', async ({ request }) => {
    const sitemap = await fetchSitemap(request);
    expect(duplicateValues(sitemap.exact), 'Duplicate sitemap locations').toEqual([]);
    const eventUrls = sitemap.normalized.filter(isEventDetailUrl);
    expect(duplicateValues(eventUrls), 'Duplicate normalized event routes').toEqual([]);
  });

  test('redirects a persisted non-canonical fixture directly to its canonical route', async ({
    request,
  }) => {
    const fixture = await discoverFixture();
    const response = await request.get(fixture.nonCanonicalUrl, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(getLocation(response)).toBe(fixture.canonicalUrl);
  });

  test('redirects a trailing-slash non-canonical fixture directly to its canonical route', async ({
    request,
  }) => {
    const fixture = await discoverFixture();
    const response = await request.get(`${fixture.nonCanonicalUrl}/`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(getLocation(response)).toBe(fixture.canonicalUrl);
  });

  test('drops nonfunctional tracking parameters on static canonical redirects', async ({
    request,
  }) => {
    const fixture = await discoverFixture();
    const response = await request.get(
      `${fixture.nonCanonicalUrl}?utm_source=test&ref=event-index`,
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(308);
    expect(getLocation(response)).toBe(fixture.canonicalUrl);
  });

  test('exposes only the canonical fixture route as indexable', async ({ page, request }) => {
    const fixture = await discoverFixture();
    const sitemap = await fetchSitemap(request);
    const canonicalPath = normalizePath(fixture.canonicalUrl);
    const nonCanonicalPath = normalizePath(fixture.nonCanonicalUrl);
    expect(sitemap.normalized.filter((url) => url === canonicalPath)).toHaveLength(1);
    expect(sitemap.normalized).not.toContain(nonCanonicalPath);

    const response = await page.goto(fixture.canonicalUrl);
    expect(response?.ok()).toBe(true);
    const headerRobots = response?.headers()['x-robots-tag'] ?? '';
    expect(headerRobots.toLowerCase()).not.toContain('noindex');
    const metaRobots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(metaRobots?.toLowerCase() ?? '').not.toContain('noindex');
    const canonicalLinks = await page
      .locator('link[rel="canonical"]')
      .evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .filter((href): href is string => href !== null),
      );
    expect(canonicalLinks).toHaveLength(1);
    expect(normalizePath(canonicalLinks[0])).toBe(canonicalPath);
  });
});
