import { createSerwistRoute } from '@serwist/turbopack';
import { PRECACHE_GLOB_PATTERNS } from '@/lib/pwa/precacheConfig';

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: 'app/sw.ts',
  globPatterns: [...PRECACHE_GLOB_PATTERNS],
  additionalPrecacheEntries: [{ url: '/offline', revision: '1' }],
  useNativeEsbuild: true,
});
