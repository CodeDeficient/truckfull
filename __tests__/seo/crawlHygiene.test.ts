import robots from '@/app/robots';
import { buildSitemapUrls, generateSitemapXml } from '@/app/sitemap.xml/route';

describe('crawl hygiene', () => {
  describe('robots.txt', () => {
    test('does not block Next.js static assets', () => {
      const { rules } = robots();
      const disallowedPaths = rules
        .filter((rule) => rule.userAgent === '*')
        .flatMap((rule) => (Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]))
        .filter((path): path is string => typeof path === 'string');

      expect(disallowedPaths).not.toContain('/_next/static/');
    });

    test('still blocks internal/application routes', () => {
      const { rules } = robots();
      const disallowedPaths = rules
        .filter((rule) => rule.userAgent === '*')
        .flatMap((rule) => (Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]))
        .filter((path): path is string => typeof path === 'string');

      expect(disallowedPaths).toContain('/admin/');
      expect(disallowedPaths).toContain('/api/');
      expect(disallowedPaths).toContain('/owner-dashboard/');
      expect(disallowedPaths).toContain('/manifest.json');
    });
  });

  describe('sitemap truck URLs', () => {
    test('filters out reserved and malformed truck slugs', () => {
      const urls = buildSitemapUrls({
        trucks: [
          { slug: 'valid-food-truck', city: 'Augusta', state: 'GA', cuisine_type: ['Deli'] },
          { slug: 'admin', city: 'Augusta', state: 'GA', cuisine_type: ['BBQ'] },
          { slug: 'augusta-ga', city: 'Augusta', state: 'GA', cuisine_type: ['BBQ'] },
          { slug: 'bad_slug', city: 'Augusta', state: 'GA', cuisine_type: ['Tacos'] },
          { slug: '', city: 'Augusta', state: 'GA', cuisine_type: ['Burgers'] },
          { slug: null, city: 'Augusta', state: 'GA', cuisine_type: ['Pizza'] },
          { slug: 'robots.txt', city: 'Augusta', state: 'GA', cuisine_type: ['Coffee'] },
        ],
        cuisineRows: [],
        blogPosts: [],
      });

      const locations = urls.map((u) => u.loc);

      expect(locations).toContain('/valid-food-truck');
      expect(locations).not.toContain('/admin');
      expect(locations).not.toContain('/augusta-ga');
      expect(locations).not.toContain('/bad_slug');
      expect(locations).not.toContain('/robots.txt');
    });

    test('valid truck entries keep full SitemapUrl shape', () => {
      const urls = buildSitemapUrls({
        trucks: [
          {
            slug: 'valid-food-truck',
            updated_at: '2026-06-16T12:00:00Z',
            city: 'Augusta',
            state: 'GA',
            cuisine_type: ['Deli'],
          },
        ],
        cuisineRows: [],
        blogPosts: [],
      });

      const truckUrl = urls.find((u) => u.loc === '/valid-food-truck');

      expect(truckUrl).toMatchObject({
        loc: '/valid-food-truck',
        lastmod: '2026-06-16',
        changefreq: 'weekly',
        priority: 0.8,
      });
    });
  });

  describe('generateSitemapXml', () => {
    test('does not emit reserved truck slugs in final XML', () => {
      const xml = generateSitemapXml(
        buildSitemapUrls({
          trucks: [
            { slug: 'valid-food-truck', city: 'Augusta', state: 'GA', cuisine_type: ['Deli'] },
            { slug: 'admin', city: 'Augusta', state: 'GA', cuisine_type: ['BBQ'] },
          ],
          cuisineRows: [],
          blogPosts: [],
        }),
      );

      expect(xml).toContain('/valid-food-truck');
      expect(xml).not.toContain('/admin');
    });

    test('deduplicates repeated event detail locations', () => {
      const urls = buildSitemapUrls({
        trucks: [],
        cuisineRows: [],
        blogPosts: [],
        events: [
          {
            id: 'event-1',
            title: 'Community Market',
            city: 'Augusta',
            state: 'GA',
            event_start_date: '2026-08-01',
            vetting_score: 50,
            vetted_at: null,
          },
          {
            id: 'event-2',
            title: 'Community Market',
            city: 'Augusta',
            state: 'GA',
            event_start_date: '2026-08-01',
            vetting_score: 40,
            vetted_at: null,
          },
        ],
      });

      expect(urls.filter((url) => url.loc.includes('/events/augusta-ga/community-market-2026-08-01')))
        .toHaveLength(1);
    });
  });
});
