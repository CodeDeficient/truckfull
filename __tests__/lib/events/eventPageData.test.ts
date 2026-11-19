import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILE = resolve(process.cwd(), 'lib/events/eventPageData.ts');
const content = readFileSync(FILE, 'utf8');

describe('eventPageData RLS regression', () => {
  it('imports the time-limited service-role reader', () => {
    expect(content).toMatch(
      /import\s*\{\s*getSupabasePublicReader\s*\}\s*from\s*['"]@\/lib\/supabase\/admin['"]/,
    );
  });

  it('does NOT import getSupabaseBuild anywhere in the module', () => {
    expect(content).not.toMatch(/getSupabaseBuild/);
  });

  it('does NOT import getSupabaseBuild under any alias', () => {
    expect(content).not.toMatch(/from\s*['"]@\/lib\/supabase\/build-client['"]/);
  });

  it('contains the three exported SEO query functions', () => {
    for (const fn of ['getEventBySlug', 'getEventsForCity', 'getOtherEventsInCity']) {
      expect(content).toMatch(
        new RegExp(
          `export\\s+(async\\s+)?function\\s+${fn}\\b|export\\s+(const|let|var)\\s+${fn}\\b|as\\s+${fn}\\b`,
        ),
      );
    }
  });

  it('every upcoming query uses the shared eligibility contract', () => {
    expect(content).toMatch(/import\s*\{\s*getUpcomingEventFilters\s*\}/);
    const filterCallCount = (content.match(/getUpcomingEventFilters\(/g) ?? []).length;
    expect(filterCallCount).toBeGreaterThanOrEqual(3);
  });

  it('keeps event page helpers behind request-level cache wrappers', () => {
    expect(content).toMatch(/export const getEventBySlug = cache\(getCachedEventBySlug\);/);
    expect(content).toMatch(
      /export const getOtherEventsInCity = cache\(getCachedOtherEventsInCity\);/,
    );
    expect(content).toMatch(/export const getEventCityTrucks = cache\(getCachedEventCityTrucks\);/);
  });

  it('does not apply the list horizon to exact event detail lookup', () => {
    const detailLookup =
      content.match(
        /async function getEventBySlugImpl[\s\S]*?async function getCachedEventBySlug/,
      )?.[0] ?? '';

    expect(detailLookup).not.toContain('horizonDate');
    expect(detailLookup).not.toContain(".lte('event_start_date'");
  });

  it('does not cache a failed exact event detail lookup as a missing event', () => {
    const detailLookup =
      content.match(
        /async function getEventBySlugImpl[\s\S]*?async function getCachedEventBySlug/,
      )?.[0] ?? '';

    expect(detailLookup).toMatch(/if \(error\) throw error;/);
  });

  it('does not retain the former hourly detail cache', () => {
    expect(content).not.toMatch(/EVENT_PAGE_REVALIDATE_SECONDS\s*=\s*3600/);
    expect(content).toMatch(/revalidate:\s*false/);
  });

  it('keeps secondary caches on the approved 180-day fallback with precise invalidation', () => {
    const otherEventsBlock =
      content.match(/\[['"]event-page-city-list['"][\s\S]*?\)\(\);/)?.[0] ?? '';
    expect(otherEventsBlock).toContain('revalidate: EVENT_PAGE_SECONDARY_REVALIDATE_SECONDS');
    expect(otherEventsBlock).not.toContain('revalidate: 3600');
    expect(otherEventsBlock).not.toContain('revalidate: false');
  });

  it('keeps the event city truck list on the approved long fallback', () => {
    expect(content).toMatch(/revalidate:\s*EVENT_PAGE_SECONDARY_REVALIDATE_SECONDS/);
  });

  it('uses route-specific detail tags and city-specific secondary tags', () => {
    expect(content).toMatch(/eventDetailCacheTag\(citySlug, eventSlug\)/);
    expect(content).toMatch(/eventCityCacheTag\(cityName, stateName\)/);
    expect(content).not.toMatch(/tags:\s*\[EVENT_PAGE_CACHE_TAG\]/);
  });
});
