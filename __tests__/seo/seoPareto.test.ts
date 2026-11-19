import { buildBlogMetadata, getBlogSeoTitle } from '@/lib/seo/blogMetadata';
import { buildCityMetadata } from '@/lib/seo/cityMetadata';
import { getTruckExploreLinks, generateCuisineFaq, generateCityFaq } from '@/lib/seo/keywords';
import { buildTruckMetadata } from '@/lib/seo/truckMetadata';
import { buildSitemapUrls, generateSitemapXml } from '@/app/sitemap.xml/route';

const trucks = [
  {
    id: '1',
    name: 'Smoke House BBQ',
    slug: 'smoke-house-bbq',
    description: null,
    cuisine_type: ['BBQ', 'Tacos'],
    city: 'Augusta',
    state: 'GA',
    social_media: null,
    operating_hours: null,
    is_claimed: null,
    view_count: null,
    updated_at: '2026-05-01T12:00:00Z',
  },
  {
    id: '2',
    name: 'Sweet Wheels',
    slug: 'sweet-wheels',
    description: null,
    cuisine_type: ['Desserts'],
    city: 'Augusta',
    state: 'GA',
    social_media: null,
    operating_hours: null,
    is_claimed: null,
    view_count: null,
    updated_at: '2026-05-02T12:00:00Z',
  },
  {
    id: '3',
    name: 'Taco Cart',
    slug: 'taco-cart',
    description: null,
    cuisine_type: ['Tacos'],
    city: 'Augusta',
    state: 'GA',
    social_media: null,
    operating_hours: null,
    is_claimed: null,
    view_count: null,
    updated_at: '2026-05-03T12:00:00Z',
  },
];

describe('SEO Pareto metadata and sitemap rules', () => {
  test('city metadata is query-first, factual, and emits a default OG image', () => {
    const metadata = buildCityMetadata({
      slug: 'augusta-ga',
      cityName: 'Augusta',
      stateName: 'GA',
      trucks,
    });

    expect(metadata.title).toBe('Food Trucks in Augusta GA: Menus, Hours & Catering | TruckFull');
    expect(metadata.title).not.toContain('Best');
    expect(metadata.description).toContain('Find 3 food trucks in Augusta GA');
    expect(metadata.description).not.toMatch(/Discover|top|best/i);
    expect(metadata.openGraph).toMatchObject({
      images: [
        expect.objectContaining({
          url: 'https://www.truckfull.food/api/og/default',
          width: 1200,
          height: 630,
        }),
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: ['https://www.truckfull.food/api/og/default'],
    });
  });

  test('truck metadata shortens long descriptions without inventing details', () => {
    const metadata = buildTruckMetadata(
      {
        id: '1',
        slug: 'kb-deli-and-bread-co',
        name: 'KB Deli and Bread Co.',
        description:
          'This is a very long imported description that keeps going with generic promotional copy, repeated social content, menu notes, owner notes, and enough text to create a bad search snippet that should not be used as the meta description for a food truck profile page.',
        cuisine_type: ['Deli'],
        city: 'Augusta',
        state: 'GA',
        image_url: null,
        social_media: null,
        is_active: true,
      },
      'kb-deli-and-bread-co',
    );

    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
    expect(metadata.description).toBe(
      'Find KB Deli and Bread Co. in Augusta GA. View food truck profile details and contact information on TruckFull.',
    );
  });

  test('blog metadata falls back to default OG image and normalizes unsupported titles', () => {
    const metadata = buildBlogMetadata({
      slug: 'food-trucks-augusta-ga-complete-guide',
      title: '10 Best Food Trucks in Augusta, GA (May 2026)',
      body: 'Food truck guide body',
      excerpt: 'Find food trucks in Augusta GA.',
      author: 'TruckFull',
      published_at: '2026-05-01T00:00:00Z',
      updated_at: null,
      meta_description: null,
      og_image: null,
    });

    expect(metadata.title).toBe('Food Trucks in Augusta GA');
    expect(metadata.title).not.toMatch(/best|\(|,/i);
    expect(getBlogSeoTitle('Best BBQ Food Trucks CSRA')).toBe('BBQ Food Trucks in CSRA');
    expect(getBlogSeoTitle('Top-rated BBQ Food Trucks in Augusta, GA')).toBe('BBQ Food Trucks in Augusta GA');
    expect(metadata.openGraph).toMatchObject({
      images: [expect.objectContaining({ url: 'https://www.truckfull.food/api/og/default' })],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: ['https://www.truckfull.food/api/og/default'],
    });
  });

  test('truck internal links use natural query anchors for city and cuisine hubs', () => {
    expect(getTruckExploreLinks('Smoke House BBQ', 'Augusta', 'GA', ['BBQ'])).toEqual(
      expect.arrayContaining([
        { href: '/city/augusta-ga', label: 'Food Trucks in Augusta GA' },
        { href: '/cuisine/bbq', label: 'BBQ Food Trucks' },
      ]),
    );
  });

  test('FAQ copy avoids unsupported ratings and best/top claims', () => {
    const faqText = [
      ...generateCityFaq('Augusta', 'GA', 3, ['BBQ', 'Tacos']),
      ...generateCuisineFaq('BBQ', [{ city: 'Augusta', state: 'GA' }], 3),
    ]
      .flatMap((item) => [item.question, item.answer])
      .join(' ');

    expect(faqText).not.toMatch(/best|top-rated|top /i);
  });

  test('sitemap includes published blog posts and intended SEO landing pages only', () => {
    const urls = buildSitemapUrls({
      trucks,
      cuisineRows: trucks.map((truck) => ({ cuisine_type: truck.cuisine_type })),
      blogPosts: [
        {
          slug: 'charleston-sc-food-truck-guide-2026',
          published_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-04T00:00:00Z',
        },
        {
          slug: 'bad&slug',
          published_at: 'not-a-date',
          updated_at: null,
        },
      ],
    });
    const xml = generateSitemapXml(urls);

    expect(xml).toContain('https://www.truckfull.food/blog/charleston-sc-food-truck-guide-2026');
    expect(xml).toContain('https://www.truckfull.food/blog/bad&amp;slug');
    expect(xml).not.toContain('Invalid Date');
    expect(xml).toContain('https://www.truckfull.food/for-owners');
    expect(xml).toContain('https://www.truckfull.food/for-organizers');
    expect(xml).toContain('https://www.truckfull.food/food-truck-event-research');
    expect(xml).toContain('https://www.truckfull.food/food-truck-traffic-data');
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/owner-dashboard');
  });
});
