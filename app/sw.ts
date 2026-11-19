/// <reference lib="webworker" />
import type { RuntimeCaching } from 'serwist';
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist';
import {
  getMapboxAssetCacheKey,
  getRuntimeCachePolicy,
  isCacheableAppAssetUrl,
  isGoogleFontsFontUrl,
  isGoogleFontsStylesheetUrl,
  isMapboxStaticAssetUrl,
  isMapboxTileUrl,
  isNextImageUrl,
  isSensitiveRequestUrl,
} from '../lib/pwa/cachePolicy';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string } | string> | undefined;
};

type CacheKeyPlugin = {
  cacheKeyWillBeUsed: (param: { request: Request }) => string;
};

const mapboxCacheKeyPlugin: CacheKeyPlugin = {
  cacheKeyWillBeUsed: ({ request }) => getMapboxAssetCacheKey(new URL(request.url)),
};

const sensitiveNetworkOnly: RuntimeCaching = {
  matcher: ({ request, sameOrigin, url }) => {
    if (request.method !== 'GET') return true;
    if (request.headers.has('authorization')) return true;
    if (sameOrigin && isSensitiveRequestUrl(url)) return true;
    return getRuntimeCachePolicy(url, sameOrigin) === 'network-only';
  },
  handler: new NetworkOnly(),
};

const appStaticCache: RuntimeCaching = {
  matcher: ({ request, sameOrigin, url }) =>
    request.method === 'GET' && sameOrigin && isCacheableAppAssetUrl(url),
  handler: new CacheFirst({
    cacheName: 'truckfull-app-static-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 128,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxAgeFrom: 'last-used',
      }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  }),
};

const nextImageCache: RuntimeCaching = {
  matcher: ({ request, sameOrigin, url }) =>
    request.method === 'GET' && sameOrigin && isNextImageUrl(url),
  handler: new CacheFirst({
    cacheName: 'truckfull-next-image-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 256,
        maxAgeSeconds: 7 * 24 * 60 * 60,
        maxAgeFrom: 'last-used',
      }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  }),
};

const googleFontsStylesheetCache: RuntimeCaching = {
  matcher: ({ request, url }) => request.method === 'GET' && isGoogleFontsStylesheetUrl(url),
  handler: new StaleWhileRevalidate({
    cacheName: 'truckfull-google-fonts-stylesheets-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxAgeFrom: 'last-used',
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
};

const googleFontsFontCache: RuntimeCaching = {
  matcher: ({ request, url }) => request.method === 'GET' && isGoogleFontsFontUrl(url),
  handler: new CacheFirst({
    cacheName: 'truckfull-google-fonts-fonts-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 365 * 24 * 60 * 60,
        maxAgeFrom: 'last-used',
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
};

const mapboxStaticAssetCache: RuntimeCaching = {
  matcher: ({ request, url }) => request.method === 'GET' && isMapboxStaticAssetUrl(url),
  handler: new CacheFirst({
    cacheName: 'truckfull-mapbox-static-v1',
    plugins: [
      mapboxCacheKeyPlugin,
      new ExpirationPlugin({
        maxEntries: 128,
        maxAgeSeconds: 7 * 24 * 60 * 60,
        maxAgeFrom: 'last-used',
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
};

const mapboxAssetCache: RuntimeCaching = {
  matcher: ({ request, url }) => request.method === 'GET' && isMapboxTileUrl(url),
  handler: new StaleWhileRevalidate({
    cacheName: 'truckfull-mapbox-assets-v1',
    plugins: [
      mapboxCacheKeyPlugin,
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 24 * 60 * 60,
        maxAgeFrom: 'last-used',
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
};

const runtimeCaching: RuntimeCaching[] = [
  sensitiveNetworkOnly,
  nextImageCache,
  appStaticCache,
  googleFontsStylesheetCache,
  googleFontsFontCache,
  mapboxStaticAssetCache,
  mapboxAssetCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
