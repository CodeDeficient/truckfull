import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import { slugifyCity, slugifyCuisine, isAllowedTruckSlug, isCitySlugPattern } from '@/lib/utils/slugify';
import { safeBuildEventSlug } from '@/lib/events/eventSlug';
import { floorDate, horizonDate } from '@/lib/events/eventHorizon';
import { CUISINE_SLUG_REDIRECTS } from '@/redirects/cuisine-redirects.mjs';

const SITE_URL = 'https://www.truckfull.food';

export const dynamic = 'force-dynamic';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

interface TruckSitemapRow {
  slug: string | null;
  updated_at?: string | null;
  city: string | null;
  state: string | null;
  cuisine_type: string[] | null;
}

interface CuisineSitemapRow {
  cuisine_type: string[] | null;
}

interface BlogSitemapRow {
  slug: string;
  published_at: string | null;
  updated_at: string | null;
}

interface EventSitemapRow {
  id: string;
  title: string;
  city: string;
  state: string;
  event_start_date: string | null;
  vetting_score: number | null;
  vetted_at: string | null;
}

const STATIC_URLS: SitemapUrl[] = [
  { loc: '/', changefreq: 'daily', priority: 1 },
  { loc: '/events', changefreq: 'daily', priority: 0.9 },
  { loc: '/trucks', changefreq: 'weekly', priority: 0.9 },
  { loc: '/blog', changefreq: 'weekly', priority: 0.7 },
  { loc: '/for-owners', changefreq: 'weekly', priority: 0.8 },
  { loc: '/for-organizers', changefreq: 'weekly', priority: 0.75 },
  { loc: '/food-truck-event-research', changefreq: 'weekly', priority: 0.85 },
  { loc: '/food-truck-traffic-data', changefreq: 'weekly', priority: 0.8 },
  { loc: '/food-truck-live-location', changefreq: 'weekly', priority: 0.75 },
  { loc: '/pricing', changefreq: 'weekly', priority: 0.7 },
  { loc: '/claim-your-truck', changefreq: 'weekly', priority: 0.7 },
  { loc: '/features', changefreq: 'monthly', priority: 0.6 },
  { loc: '/about', changefreq: 'monthly', priority: 0.3 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.3 },
  { loc: '/partnerships', changefreq: 'monthly', priority: 0.3 },
  { loc: '/privacy', changefreq: 'monthly', priority: 0.3 },
  { loc: '/terms', changefreq: 'monthly', priority: 0.3 },
  { loc: '/takedown', changefreq: 'monthly', priority: 0.2 },
];

function formatLastmod(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function deduplicateSitemapUrls(urls: SitemapUrl[]): SitemapUrl[] {
  const seen = new Set<string>();
  return urls.filter((url) => {
    if (seen.has(url.loc)) return false;
    seen.add(url.loc);
    return true;
  });
}

export function buildSitemapUrls({
  trucks,
  cuisineRows,
  blogPosts,
  events = [],
}: {
  trucks: TruckSitemapRow[];
  cuisineRows: CuisineSitemapRow[];
  blogPosts: BlogSitemapRow[];
  events?: EventSitemapRow[];
}): SitemapUrl[] {
  const truckUrls: SitemapUrl[] = trucks
    .filter((truck): truck is TruckSitemapRow & { slug: string } => {
      if (!truck.slug) return false;
      return isAllowedTruckSlug(truck.slug) && !isCitySlugPattern(truck.slug);
    })
    .map((truck) => ({
      loc: `/${truck.slug}`,
      lastmod: formatLastmod(truck.updated_at),
      changefreq: 'weekly' as const,
      priority: 0.8,
    }));

  const blogUrls: SitemapUrl[] = blogPosts.map((post) => ({
    loc: `/blog/${post.slug}`,
    lastmod: formatLastmod(post.updated_at ?? post.published_at),
    changefreq: 'monthly' as const,
    priority: 0.65,
  }));

  const cityCounts = new Map<string, { city: string; state: string; count: number }>();
  for (const row of trucks) {
    if (!row.city || !row.state) continue;
    const key = `${row.city}-${row.state}`;
    const existing = cityCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      cityCounts.set(key, { city: row.city, state: row.state, count: 1 });
    }
  }

  const cityUrls: SitemapUrl[] = [...cityCounts.values()]
    .filter((c) => c.count >= 3)
    .map((c) => ({
      loc: `/city/${slugifyCity(c.city, c.state)}`,
      changefreq: 'weekly' as const,
      priority: 0.9,
    }));

  const cuisineMap = new Map<string, number>();
  for (const truck of cuisineRows) {
    const cuisines = Array.isArray(truck.cuisine_type) ? truck.cuisine_type : [];
    for (const c of cuisines) {
      const normalized = c.trim();
      if (!normalized) continue;
      cuisineMap.set(normalized, (cuisineMap.get(normalized) ?? 0) + 1);
    }
  }

  const cuisineUrls: SitemapUrl[] = [...cuisineMap.entries()]
    .filter(([cuisine, count]) => count >= 2 && !Object.hasOwn(CUISINE_SLUG_REDIRECTS, slugifyCuisine(cuisine)))
    .map(([cuisine]) => ({
      loc: `/cuisine/${slugifyCuisine(cuisine)}`,
      changefreq: 'weekly' as const,
      priority: 0.8,
    }));

  const eligibleEvents = events.filter((e) => (e.vetting_score ?? 0) >= 30);

  const eventCitySlugs = new Set<string>();
  const eventCityUrls: SitemapUrl[] = [];
  for (const e of eligibleEvents) {
    const slug = slugifyCity(e.city, e.state);
    if (!eventCitySlugs.has(slug)) {
      eventCitySlugs.add(slug);
      eventCityUrls.push({
        loc: `/events/${slug}`,
        changefreq: 'weekly' as const,
        priority: 0.8,
      });
    }
  }

  const safeEvents = eligibleEvents.filter(
    (e): e is typeof e & { event_start_date: string } => e.event_start_date !== null,
  );
  const eventUrls: SitemapUrl[] = safeEvents.flatMap((e) => {
    const eventSlug = safeBuildEventSlug(e.title, e.event_start_date);
    if (!eventSlug) return [];
    const lastmod = formatLastmod(e.vetted_at);
    return [
      {
        loc: `/events/${slugifyCity(e.city, e.state)}/${eventSlug}`,
        ...(lastmod ? { lastmod } : {}),
        changefreq: 'weekly' as const,
        priority: 0.7,
      },
    ];
  });

  return deduplicateSitemapUrls([
    ...STATIC_URLS,
    ...blogUrls,
    ...truckUrls,
    ...cityUrls,
    ...cuisineUrls,
    ...eventCityUrls,
    ...eventUrls,
  ]);
}

export async function GET(): Promise<Response> {
  const supabase = getSupabaseAdmin();
  const now = new Date();

  const [trucksResult, cuisinesResult, blogPostsResult, eventsResult] = await Promise.all([
    supabase
      .from('food_trucks')
      .select('slug, updated_at, city, state, cuisine_type')
      .not('slug', 'is', null)
      .eq('is_active', true),
    supabase.from('food_trucks').select('cuisine_type').eq('is_active', true),
    supabase
      .from('blog_posts')
      .select('slug, published_at, updated_at')
      .eq('status', 'published')
      .not('slug', 'is', null),
    supabase
      .from('canonical_events')
      .select('id, title, city, state, event_start_date, vetting_score, vetted_at')
      .eq('is_food_truck_relevant', true)
      .eq('is_hidden', false)
      .gte('vetting_score', 30)
      .gte('event_start_date', floorDate(now))
      .lte('event_start_date', horizonDate(now))
      .order('event_start_date', { ascending: false })
      .limit(1000),
  ]);

  if (trucksResult.error) {
    logError('Error fetching trucks for sitemap:', trucksResult.error);
    return new Response('Internal Server Error', { status: 500 });
  }
  if (cuisinesResult.error) {
    logError('Error fetching cuisines for sitemap:', cuisinesResult.error);
    return new Response('Internal Server Error', { status: 500 });
  }
  if (blogPostsResult.error) {
    logError('Error fetching blog posts for sitemap:', blogPostsResult.error);
    return new Response('Internal Server Error', { status: 500 });
  }
  if (eventsResult.error) {
    logError('Error fetching events for sitemap:', eventsResult.error);
    return new Response('Internal Server Error', { status: 500 });
  }

  const xml = generateSitemapXml(
    buildSitemapUrls({
      trucks: trucksResult.data ?? [],
      cuisineRows: cuisinesResult.data ?? [],
      blogPosts: blogPostsResult.data ?? [],
      events: (eventsResult.data ?? []) as unknown as EventSitemapRow[],
    }),
  );

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

export function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlEntries = urls
    .map((url) => {
      const absoluteLoc = `${SITE_URL}${url.loc}`;
      const loc = `<loc>${escapeXml(absoluteLoc)}</loc>`;
      const lastmod = url.lastmod ? `<lastmod>${escapeXml(url.lastmod)}</lastmod>` : '';
      const changefreq = url.changefreq ? `<changefreq>${escapeXml(url.changefreq)}</changefreq>` : '';
      const priority = url.priority === undefined ? '' : `<priority>${url.priority}</priority>`;

      return `  <url>
    ${loc}
    ${lastmod}
    ${changefreq}
    ${priority}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}
