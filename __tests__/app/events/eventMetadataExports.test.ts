import { describe, expect, it } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mobilePage = readFileSync(
  resolve(process.cwd(), 'app/@mobile/events/[city-slug]/[event-slug]/page.tsx'),
  'utf8',
);
const desktopPage = readFileSync(
  resolve(process.cwd(), 'app/events/[city-slug]/[event-slug]/page.tsx'),
  'utf8',
);
const mobileEventDetailPage = readFileSync(
  resolve(process.cwd(), 'app/@mobile/events/[city-slug]/[event-slug]/page.tsx'),
  'utf8',
);
const eventDetailAncestorLayouts = [
  'app/layout.tsx',
  'app/@mobile/layout.tsx',
  'app/events/layout.tsx',
  'app/events/[city-slug]/layout.tsx',
  'app/events/[city-slug]/[event-slug]/layout.tsx',
]
  .map((path) => resolve(process.cwd(), path))
  .filter(existsSync);
const mobileListAndDiscoveryPages = [
  'app/@mobile/events/page.tsx',
  'app/@mobile/events/[city-slug]/page.tsx',
  'app/@mobile/city/[slug]/page.tsx',
  'app/@mobile/best/[slug]/page.tsx',
  'app/@mobile/cuisine/[slug]/page.tsx',
  'app/@mobile/[slug]/page.tsx',
].map((path) => resolve(process.cwd(), path));
const nextConfig = readFileSync(resolve(process.cwd(), 'next.config.mjs'), 'utf8');
const proxy = readFileSync(resolve(process.cwd(), 'proxy.ts'), 'utf8');

describe('mobile event sentinel ownership', () => {
  it('delegates the mobile slot to MobileDefault so children remain the only event page', () => {
    expect(mobilePage).toMatch(/function MobileDefault\(\): null/);
    expect(mobilePage).toMatch(/MobileDefault\.displayName = 'MobileDefault'/);
    expect(mobilePage).not.toMatch(/getEventBySlug|getEventCityTrucks|getOtherEventsInCity/);
    expect(desktopPage).toMatch(/export async function generateMetadata/);
  });

  it('forces event detail routes static while the root layout reads empty headers', () => {
    expect(desktopPage).toMatch(/export const dynamic = 'force-static';/);
    expect(mobilePage).not.toMatch(/export const dynamic/);
  });

  it('keeps canonical decisions in the static event render instead of proxy execution', () => {
    expect(desktopPage).toMatch(/resolveEventCanonicalRedirect/);
    expect(desktopPage).toMatch(/permanentRedirect/);
    expect(desktopPage).toMatch(/EVENT_EVENT_NOT_FOUND/);
    expect(proxy).not.toMatch(/findEventCanonicalRedirect/);
    expect(proxy).not.toMatch(/EVENT_CANONICAL_LOOKUP/);
    expect(proxy).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('keeps event detail generation on-demand with no catalog-wide build work', () => {
    const generateStaticParamsBlock =
      desktopPage.match(/export async function generateStaticParams[\s\S]*?\n}\n/)?.[0] ?? '';

    expect(desktopPage).toMatch(/export const revalidate = false;/);
    expect(desktopPage).toMatch(/export const dynamicParams = true;/);
    expect(generateStaticParamsBlock).toContain('return [];');
    expect(generateStaticParamsBlock).not.toMatch(/getEventBySlug|getSupabase|external_events/);
  });

  it('has no finite revalidation value in an event-detail ancestor layout', () => {
    for (const layoutPath of eventDetailAncestorLayouts) {
      const content = readFileSync(layoutPath, 'utf8');
      expect(content).not.toMatch(/export\s+const\s+revalidate\s*=\s*(?:\d+|['"])/);
    }
    expect(mobileEventDetailPage).not.toMatch(/export\s+const\s+revalidate\s*=\s*(?:\d+|['"])/);
  });

  it('does not declare route-level revalidate on mobile list and discovery routes', () => {
    for (const pagePath of mobileListAndDiscoveryPages) {
      expect(readFileSync(pagePath, 'utf8')).not.toMatch(
        /export\s+const\s+revalidate\s*=\s*(?:\d+|['"])/,
      );
    }
  });

  it('does not partition static event detail cache entries by user agent', () => {
    const eventHeaderBlock =
      nextConfig.match(
        /source: '\/events\/:citySlug\/:eventSlug'[\s\S]*?source: '\/ingest\/static/,
      )?.[0] ?? '';

    expect(nextConfig).toContain("source: '/events/:citySlug/:eventSlug',");
    expect(nextConfig).toContain("source: '/events/:citySlug/:eventSlug/',");
    expect(eventHeaderBlock).toContain("key: 'Vary'");
    expect(eventHeaderBlock).toContain(
      "value: 'rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch'",
    );
    expect(eventHeaderBlock).not.toContain("value: 'User-Agent'");
  });
});
