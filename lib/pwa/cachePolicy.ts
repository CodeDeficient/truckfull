const GOOGLE_FONTS_HOST = /^fonts\.gstatic\.com$/i;
const MAPBOX_HOST = /(^|\.)mapbox\.com$/i;

export type RuntimeCachePolicy = 'cache-first' | 'stale-while-revalidate' | 'network-only';

const FIRST_PARTY_STATIC_EXTENSIONS = new Set([
  '.avif',
  '.css',
  '.gif',
  '.ico',
  '.jpg',
  '.jpeg',
  '.js',
  '.png',
  '.svg',
  '.webp',
  '.woff',
  '.woff2',
]);

const FIRST_PARTY_STATIC_PREFIXES = [
  '/_next/static/',
  '/fonts/',
  '/images/',
  '/static/',
] as const;

const FIRST_PARTY_STATIC_PATHS = new Set([
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/manifest.json',
  '/offline',
  '/pwa-icon-192.png',
  '/pwa-icon-192.webp',
  '/pwa-icon-512.png',
  '/pwa-icon-512.webp',
  '/truckfull-icon-transparent.webp',
]);

const SENSITIVE_FIRST_PARTY_PREFIXES = [
  '/api/auth/',
  '/api/geo/',
  '/api/owner/',
  '/api/stripe/',
  '/api/webhooks/',
  '/owner-dashboard',
] as const;

const SENSITIVE_FIRST_PARTY_PATHS = new Set([
  '/api/trucks',
  '/api/trucks/',
  '/api/trucks/nearby',
  '/api/trucks/nearby/',
]);

const SENSITIVE_CROSS_ORIGIN_HOST_PATTERNS = [
  /(^|\.)supabase\.co$/i,
  /(^|\.)challenges\.cloudflare\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)fbcdn\.net$/i,
  /(^|\.)stripe\.com$/i,
  /(^|\.)googleapis\.com$/i,
  /(^|\.)gstatic\.com$/i,
] as const;

function hasStaticExtension(pathname: string): boolean {
  const lastDot = pathname.lastIndexOf('.');
  if (lastDot === -1) return false;
  return FIRST_PARTY_STATIC_EXTENSIONS.has(pathname.slice(lastDot).toLowerCase());
}

export function isSensitiveRequestUrl(url: URL): boolean {
  if (SENSITIVE_FIRST_PARTY_PATHS.has(url.pathname)) return true;
  return SENSITIVE_FIRST_PARTY_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

export function isSensitiveCrossOriginUrl(url: URL): boolean {
  return SENSITIVE_CROSS_ORIGIN_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname));
}

export function isGoogleFontsStylesheetUrl(url: URL): boolean {
  return url.hostname === 'fonts.googleapis.com' && url.pathname.startsWith('/css2');
}

export function isGoogleFontsFontUrl(url: URL): boolean {
  if (!GOOGLE_FONTS_HOST.test(url.hostname)) return false;
  const pathname = url.pathname.toLowerCase();
  return (
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.otf') ||
    pathname.endsWith('.eot')
  );
}

export function isNextImageUrl(url: URL): boolean {
  return url.pathname === '/_next/image';
}

export function isCacheableAppAssetUrl(url: URL): boolean {
  if (isSensitiveRequestUrl(url)) return false;
  if (FIRST_PARTY_STATIC_PATHS.has(url.pathname)) return true;
  if (FIRST_PARTY_STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return true;
  return hasStaticExtension(url.pathname) && !url.pathname.startsWith('/api/');
}

export function isMapboxStaticAssetUrl(url: URL): boolean {
  if (!MAPBOX_HOST.test(url.hostname)) return false;
  const pathname = url.pathname.toLowerCase();
  return (
    pathname.includes('/styles/') ||
    pathname.includes('/fonts/') ||
    pathname.includes('/sprite')
  );
}

export function isMapboxTileUrl(url: URL): boolean {
  if (!MAPBOX_HOST.test(url.hostname)) return false;
  const pathname = url.pathname.toLowerCase();
  return (
    pathname.includes('/tiles/') ||
    pathname.includes('.vector.pbf') ||
    pathname.includes('.png') ||
    pathname.includes('.jpg') ||
    pathname.includes('.webp')
  );
}

export function isMapboxAssetUrl(url: URL): boolean {
  return isMapboxStaticAssetUrl(url) || isMapboxTileUrl(url);
}

export function getMapboxAssetCacheKey(url: URL): string {
  const normalizedUrl = new URL(url.toString());
  normalizedUrl.searchParams.delete('sku');
  return normalizedUrl.toString();
}

export function getRuntimeCachePolicy(url: URL, sameOrigin: boolean): RuntimeCachePolicy {
  if (sameOrigin) {
    if (isSensitiveRequestUrl(url)) return 'network-only';
    if (isNextImageUrl(url)) return 'cache-first';
    return isCacheableAppAssetUrl(url) ? 'cache-first' : 'network-only';
  }

  if (isMapboxStaticAssetUrl(url)) return 'cache-first';
  if (isMapboxTileUrl(url)) return 'stale-while-revalidate';
  if (isGoogleFontsStylesheetUrl(url)) return 'stale-while-revalidate';
  if (isGoogleFontsFontUrl(url)) return 'cache-first';
  if (isSensitiveCrossOriginUrl(url)) return 'network-only';
  return 'network-only';
}
