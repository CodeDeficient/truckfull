import {
  getRuntimeCachePolicy,
  getMapboxAssetCacheKey,
  isCacheableAppAssetUrl,
  isGoogleFontsFontUrl,
  isGoogleFontsStylesheetUrl,
  isMapboxAssetUrl,
  isNextImageUrl,
  isSensitiveRequestUrl,
} from '@/lib/pwa/cachePolicy';

describe('PWA cache policy classification', () => {
  it('allows only explicit app shell and static asset routes', () => {
    expect(isNextImageUrl(new URL('https://www.truckfull.food/_next/image?url=%2Ftruckfull-icon-transparent.webp&w=256&q=75'))).toBe(true);
    expect(isCacheableAppAssetUrl(new URL('https://www.truckfull.food/_next/image?url=%2Ftruckfull-icon-transparent.webp&w=256&q=75'))).toBe(false);
    expect(isCacheableAppAssetUrl(new URL('https://www.truckfull.food/_next/static/chunks/app-abc123.js'))).toBe(true);
    expect(isCacheableAppAssetUrl(new URL('https://www.truckfull.food/_next/static/css/app-abc123.css'))).toBe(true);
    expect(isCacheableAppAssetUrl(new URL('https://www.truckfull.food/manifest.json'))).toBe(true);
    expect(isCacheableAppAssetUrl(new URL('https://www.truckfull.food/pwa-icon-512.webp'))).toBe(true);
    expect(isCacheableAppAssetUrl(new URL('https://www.truckfull.food/truckfull-icon-transparent.webp'))).toBe(true);
  });

  it('keeps sensitive first-party routes network-only', () => {
    const sensitivePaths = [
      '/api/auth/callback',
      '/api/geo/ip-location',
      '/api/trucks',
      '/api/trucks/nearby',
      '/api/owner/pending-updates',
      '/api/owner/facebook/pages',
      '/api/webhooks/meta',
      '/api/stripe/create-portal',
      '/owner-dashboard/facebook',
      '/owner-dashboard',
    ];

    for (const path of sensitivePaths) {
      expect(isSensitiveRequestUrl(new URL(`https://www.truckfull.food${path}`))).toBe(true);
      expect(getRuntimeCachePolicy(new URL(`https://www.truckfull.food${path}`), true)).toBe('network-only');
    }
  });

  it('treats trailing-slash variants of sensitive paths as network-only', () => {
    expect(getRuntimeCachePolicy(new URL('https://www.truckfull.food/api/trucks/'), true)).toBe('network-only');
    expect(getRuntimeCachePolicy(new URL('https://www.truckfull.food/api/trucks/nearby/'), true)).toBe('network-only');
    expect(isSensitiveRequestUrl(new URL('https://www.truckfull.food/api/trucks/'))).toBe(true);
    expect(isSensitiveRequestUrl(new URL('https://www.truckfull.food/api/trucks/nearby/'))).toBe(true);
  });

  it('keeps cross-origin platform requests network-only unless explicitly allowlisted', () => {
    expect(getRuntimeCachePolicy(new URL('https://example.supabase.co/rest/v1/food_trucks'), false)).toBe('network-only');
    expect(getRuntimeCachePolicy(new URL('https://challenges.cloudflare.com/turnstile/v0/g/cbframe'), false)).toBe('network-only');
    expect(getRuntimeCachePolicy(new URL('https://fcmregistrations.googleapis.com/v1/projects/demo/registrations'), false)).toBe('network-only');
    expect(getRuntimeCachePolicy(new URL('https://graph.facebook.com/v25.0/me/accounts'), false)).toBe('network-only');
    expect(getRuntimeCachePolicy(new URL('https://api.stripe.com/v1/checkout/sessions'), false)).toBe('network-only');
  });

  it('caches Google Fonts stylesheets and font files', () => {
    expect(isGoogleFontsStylesheetUrl(new URL('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined'))).toBe(true);
    expect(getRuntimeCachePolicy(new URL('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined'), false)).toBe('stale-while-revalidate');

    expect(isGoogleFontsFontUrl(new URL('https://fonts.gstatic.com/s/materialsymbolsoutlined/v250/kJF1BvYX7B0Qv3c4qj4.woff2'))).toBe(true);
    expect(getRuntimeCachePolicy(new URL('https://fonts.gstatic.com/s/materialsymbolsoutlined/v250/kJF1BvYX7B0Qv3c4qj4.woff2'), false)).toBe('cache-first');
  });

  it('allowlists only selected Mapbox asset requests', () => {
    expect(isMapboxAssetUrl(new URL('https://api.mapbox.com/styles/v1/mapbox/streets-v11?access_token=token'))).toBe(true);
    expect(isMapboxAssetUrl(new URL('https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/1/0/0.vector.pbf?access_token=token'))).toBe(true);
    expect(isMapboxAssetUrl(new URL('https://api.mapbox.com/fonts/v1/mapbox/Open%20Sans/0-255.pbf?access_token=token'))).toBe(true);
    expect(isMapboxAssetUrl(new URL('https://events.mapbox.com/events/v2?access_token=token'))).toBe(false);

    expect(getRuntimeCachePolicy(new URL('https://api.mapbox.com/styles/v1/mapbox/streets-v11?access_token=token'), false)).toBe('cache-first');
    expect(getRuntimeCachePolicy(new URL('https://api.mapbox.com/styles/v1/mapbox/streets-v11/sprite@2x.json?access_token=token'), false)).toBe('cache-first');
    expect(getRuntimeCachePolicy(new URL('https://api.mapbox.com/fonts/v1/mapbox/Open%20Sans/0-255.pbf?access_token=token'), false)).toBe('cache-first');
    expect(getRuntimeCachePolicy(new URL('https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/1/0/0.vector.pbf?access_token=token'), false)).toBe('stale-while-revalidate');
  });

  it('normalizes volatile Mapbox sku params so cached tiles can be reused across launches', () => {
    const firstUrl = new URL(
      'https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/1/0/0.vector.pbf?sku=first&access_token=token',
    );
    const secondUrl = new URL(
      'https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/1/0/0.vector.pbf?sku=second&access_token=token',
    );

    const firstKey = getMapboxAssetCacheKey(firstUrl);
    const secondKey = getMapboxAssetCacheKey(secondUrl);

    expect(firstKey).toBe(secondKey);
    expect(firstKey).not.toContain('sku=');
    expect(firstKey).toContain('access_token=token');
  });
});
