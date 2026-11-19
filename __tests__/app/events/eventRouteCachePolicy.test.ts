import { describe, expect, it } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ONE_DAY = 24 * 60 * 60;

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

const cacheIdentity = readSource('lib/events/eventCacheIdentity.ts');
const getTruckCountSource = readSource('lib/seo/getTruckCount.ts');
const eventPageDataSource = readSource('lib/events/eventPageData.ts');
const nearbyCitiesSource = readSource('lib/events/nearbyCities.ts');
const layoutSource = readSource('app/layout.tsx');

describe('event-detail cache policy sources', () => {
  it('keeps the shared secondary fallback at 180 days, not 14 days', () => {
    const match = cacheIdentity.match(/EVENT_SECONDARY_REVALIDATE_SECONDS\s*=\s*(\d+)\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
    expect(match).not.toBeNull();
    const days = Number(match?.[1]);
    expect(days).toBe(180);
  });

  it('bounds the metadata-safe truck count fallback to one day', () => {
    const match = getTruckCountSource.match(
      /TRUCK_COUNT_METADATA_FALLBACK_SECONDS\s*=\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)/,
    );
    expect(match).not.toBeNull();
    const seconds = Number(match?.[1]) * Number(match?.[2]) * Number(match?.[3]);
    expect(seconds).toBe(24 * 60 * 60);
  });

  it('does not inject the hourly truck-count cache into root metadata', () => {
    expect(layoutSource).toMatch(/getMetadataSafeTruckCount/);
    expect(layoutSource).not.toMatch(/await getTruckCount\(\)/);
  });

  it('throws on query failure inside the cached fetch so the failure is never cached', () => {
    const resolveBlock =
      getTruckCountSource.match(/export async function resolveTruckCount[\s\S]*?\n\}/)?.[0] ?? '';

    expect(resolveBlock).toContain('throw error;');
    expect(getTruckCountSource).toMatch(/truckCountWithFallback\(/);
    expect(getTruckCountSource).not.toContain('FALLBACK_ROUNDED');
    expect(getTruckCountSource).toMatch(/return null;/);
  });

  it('keeps precisely invalidated secondary event caches on the approved fallback', () => {
    const otherEventsBlock =
      eventPageDataSource.match(/\[['"]event-page-city-list['"][\s\S]*?\)\(\);/)?.[0] ?? '';
    expect(otherEventsBlock).toContain('revalidate: EVENT_PAGE_SECONDARY_REVALIDATE_SECONDS');
    expect(otherEventsBlock).not.toContain('revalidate: 3600');
    expect(otherEventsBlock).not.toContain('revalidate: false');

    const nearbyBlock =
      nearbyCitiesSource.match(/\[['"]event-page-nearby-cities['"][\s\S]*?\)\(\);/)?.[0] ?? '';
    expect(nearbyBlock).toContain('revalidate: EVENT_SECONDARY_REVALIDATE_SECONDS');
    expect(nearbyBlock).not.toContain('revalidate: 3600');
    expect(nearbyBlock).not.toContain('revalidate: false');
  });

  it('keeps the event city truck list on the approved long fallback', () => {
    const trucksBlock =
      eventPageDataSource.match(/\[['"]event-page-city-trucks['"][\s\S]*?\)\(\);/)?.[0] ?? '';
    expect(trucksBlock).toContain('revalidate: EVENT_PAGE_SECONDARY_REVALIDATE_SECONDS');
    expect(trucksBlock).not.toContain('revalidate: 3600');
  });
});

describe('built event-detail route artifact', () => {
  const manifestPath = resolve(process.cwd(), '.next/prerender-manifest.json');
  const hasManifest = existsSync(manifestPath);

  it('records no short revalidation for the event-detail route when a build exists', () => {
    if (!hasManifest) {
      expect(process.env.CI).toBeUndefined();
      return;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      routes?: Record<string, { initialRevalidateSeconds?: number | false }>;
      dynamicRoutes?: Record<string, { fallbackRevalidate?: number | false; fallback?: unknown }>;
    };

    const route =
      manifest.routes?.['/events/[city-slug]/[event-slug]'] ??
      manifest.dynamicRoutes?.['/events/[city-slug]/[event-slug]'];

    if (!route) {
      throw new Error(
        'Event-detail route missing from .next/prerender-manifest.json — run `npm run build` first',
      );
    }

    const recorded =
      'initialRevalidateSeconds' in route
        ? (route as { initialRevalidateSeconds?: number | false }).initialRevalidateSeconds
        : (route as { fallbackRevalidate?: number | false }).fallbackRevalidate;

    if (recorded === undefined || recorded === null) {
      return;
    }
    if (typeof recorded === 'number') {
      expect(recorded).toBeGreaterThanOrEqual(90 * ONE_DAY);
      expect(recorded).not.toBe(3600);
      expect(recorded).not.toBe(14 * ONE_DAY);
    }
  });

  it('emits an acceptable Cache-Control from a live production server when probed', async () => {
    const probeUrl = process.env.EVENT_TTL_PROBE_URL;
    if (!probeUrl) {
      expect(process.env.CI).toBeUndefined();
      return;
    }

    const response = await fetch(probeUrl, {
      headers: { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' },
    });
    expect(response.status).toBe(200);

    const cacheControl = response.headers.get('cache-control') ?? '';
    const maxAgeMatch = cacheControl.match(/s-maxage=(\d+)/);
    expect(maxAgeMatch).not.toBeNull();

    const sMaxAge = Number(maxAgeMatch?.[1]);
    expect(sMaxAge).not.toBe(3600);
    expect(sMaxAge).not.toBe(14 * ONE_DAY);
    expect(sMaxAge).toBeGreaterThanOrEqual(90 * ONE_DAY);
  });
});
