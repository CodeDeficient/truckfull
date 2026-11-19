import { isCitySlugPattern } from '@/lib/utils/slugify';

const CITY_PATH = /^\/city\/([^/]+)\/?$/;

const CITY_SLUG_ALIASES: Readonly<Record<string, string>> = {
  'mt-gilead-nc': 'mount-gilead-nc',
  'mt-holly-nc': 'mount-holly-nc',
  'mtholly-nc': 'mount-holly-nc',
  'mt-pleasant-sc': 'mount-pleasant-sc',
  'saint-simons-island-ga': 'st-simons-island-ga',
};

export function canonicalCitySlug(slug: string): string {
  return Object.hasOwn(CITY_SLUG_ALIASES, slug) ? CITY_SLUG_ALIASES[slug] : slug;
}

export function cityPathRedirect(pathname: string): string | null {
  if (pathname === '/city' || pathname === '/city/') return '/trucks';
  const slug = pathname.slice(1);
  if (!slug.includes('/') && isCitySlugPattern(slug)) return `/city/${canonicalCitySlug(slug)}`;
  const match = CITY_PATH.exec(pathname);
  if (match && canonicalCitySlug(match[1]) !== match[1]) return `/city/${canonicalCitySlug(match[1])}`;
  return null;
}
