import { fileURLToPath } from 'node:url';
import { expand } from 'dotenv-expand';
import dotenv from 'dotenv';
import { withSerwist } from '@serwist/turbopack';
import bundleAnalyzer from '@next/bundle-analyzer';
import { legacyEventRedirects } from './redirects/legacy-event-redirects.mjs';
import { cuisineRedirects } from './redirects/cuisine-redirects.mjs';
import { cityRedirects } from './redirects/city-redirects.mjs';

// Load and expand environment variables
const myEnv = dotenv.config({ path: './.env.local' });
expand(myEnv);

// Bundle analyzer for optimization analysis
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Serwist config moved to app/serwist/[path]/route.ts for Turbopack

const nextConfig = {
  // Self-contained server output for the Cloudflare container image. Gated so
  // Vercel and local dev builds are unaffected.
  output: process.env.NEXT_OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  cacheHandler:
    process.env.NEXT_OUTPUT_STANDALONE === 'true'
      ? fileURLToPath(new URL('./lib/next-cache/r2CacheHandler.mjs', import.meta.url))
      : undefined,

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // Redirect non-www to www to consolidate canonical domain
  async redirects() {
    return [
      ...legacyEventRedirects,
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'truckfull.food',
          },
        ],
        destination: 'https://www.truckfull.food/:path*',
        permanent: true,
        statusCode: 301,
      },
      ...cuisineRedirects,
      ...cityRedirects,
    ];
  },

  // Rewrites for PostHog ingestion endpoints and IndexNow key verification
  async rewrites() {
    const indexNowKey = process.env.INDEXNOW_KEY || '';
    const rewrites = [
      ...(indexNowKey ? [{ source: `/${indexNowKey}.txt`, destination: '/indexnow-key.txt' }] : []),
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
    return rewrites;
  },

  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Performance optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for smaller response
  // Source map configuration for better error reporting in production
  productionBrowserSourceMaps: false, // Generate source maps for production builds

  // Typed routes moved from experimental
  typedRoutes: true, // Enable typed routes for better parallel route support

  // Experimental performance features
  experimental: {
    // SRI disabled - experimental feature has known bugs:
    // - Issue #74147: integrity missing for client chunks
    // - Issue #89754: incompatible with cacheComponents
    // - webpack bootstrap chunks not included in integrity manifest
    // Re-enable when Next.js fixes these issues.
    // sri: {
    //   algorithm: 'sha256',
    // },
    optimizeCss: true, // CSS optimization
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@supabase/supabase-js',
      'react-leaflet',
      'leaflet',
      'mapbox-gl',
      'react-map-gl',
      'recharts',
      'framer-motion',
      'date-fns',
      'zod',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      'posthog-js',
      '@google/genai',
      'supercluster',
    ], // Optimize icon and library imports
    webpackMemoryOptimizations: true, // Memory optimizations
    webpackBuildWorker: true, // Use build worker for better performance
    // Static export fans out across every truck slug, twice (desktop /[slug]
    // and mobile /@mobile/[slug]). Production has 400+ active trucks, so the
    // default fan-out (one worker per CPU, 8 concurrent exports each) opens
    // hundreds of simultaneous Supabase connections and the edge resets them
    // (ECONNRESET / connect timeout), aborting the build. Cap the worker count
    // and per-worker concurrency, and retry failures — the default is a single
    // attempt with no retry.
    cpus: 4,
    staticGenerationMaxConcurrency: 3,
    staticGenerationRetryCount: 4,
  },

  images: {
    // Enable Next.js Image optimization for better Core Web Vitals
    unoptimized: false,
    // Keep transformed truck images cached for 31 days to avoid repeated STALE transforms.
    minimumCacheTTL: 2678400,
    // Restrict direct optimizer requests to the default quality.
    qualities: [75],
    // Configure image domains for external images using remotePatterns (updated format)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [{ protocol: 'https', hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname }]
        : []),
      {
        // Mapbox Static Images API
        protocol: 'https',
        hostname: 'api.mapbox.com',
      },
    ],

    // Use one output format so each source/size is cached only once.
    formats: ['image/webp'],
    // Configure image sizes for responsive loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,

  // SOTA Security Headers Implementation
  async headers() {
    // Content Security Policy for XSS protection
    // Relaxed for development, strict for production
    const isDevelopment = process.env.NODE_ENV === 'development';

    const cspHeader = `
      default-src 'self';
      script-src 'self' 'wasm-unsafe-eval' ${isDevelopment ? "'unsafe-eval'" : ''} 'unsafe-inline' https://accounts.google.com https://apis.google.com https://js.stripe.com https://cdn.jsdelivr.net https://api.mapbox.com https://*.mapbox.com https://challenges.cloudflare.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://api.mapbox.com https://*.mapbox.com;
      img-src 'self' blob: data: https: *.supabase.co https://*.googleusercontent.com https://cdn.jsdelivr.net https://api.mapbox.com https://*.mapbox.com https://*.fbcdn.net https://*.xx.fbcdn.net;
      font-src 'self' https://fonts.gstatic.com data:;
      object-src 'none';
      base-uri 'self';
      form-action 'self' https://accounts.google.com;
      frame-ancestors 'none';
      connect-src 'self' https://*.supabase.co https://accounts.google.com https://api.firecrawl.dev https://generativelanguage.googleapis.com https://api.mapbox.com https://events.mapbox.com https://ipapi.co https://challenges.cloudflare.com wss://*.supabase.co https://*.google.com https://*.googleapis.com ${isDevelopment ? 'wss://*.ngrok-free.app wss://*.ngrok.io http://127.0.0.1:54321 http://localhost:54321' : ''};
      worker-src 'self' blob:;
      child-src 'self' https://accounts.google.com https://challenges.cloudflare.com;
      manifest-src 'self';
      media-src 'self' blob:;
      upgrade-insecure-requests;
    `
      .replace(/\s{2,}/g, ' ')
      .replace(/\n/g, ' ')
      .trim();

    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Force HTTPS connections
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Disable DNS prefetching for privacy
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Permissions policy for enhanced security
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          // Spectre mitigation - isolate browsing context
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // Dynamic serving: content varies by User-Agent (Googlebot Smartphone vs Desktop)
          {
            key: 'Vary',
            value: 'User-Agent',
          },
        ],
      },
      {
        // Static event documents are UA-invariant; keep only Next.js RSC variance.
        source: '/events/:citySlug/:eventSlug',
        headers: [
          {
            key: 'Vary',
            value:
              'rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch',
          },
        ],
      },
      {
        // skipTrailingSlashRedirect keeps both canonical slash forms addressable.
        source: '/events/:citySlug/:eventSlug/',
        headers: [
          {
            key: 'Vary',
            value:
              'rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch',
          },
        ],
      },
      {
        // Long-term cache for versioned PostHog static assets
        source: '/ingest/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache Next.js static build output aggressively — content hash changes bust cache
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Webpack configuration to isolate large libraries into separate chunks
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Force mapbox-gl and react-map-gl into their own chunk
      // This prevents them from being included in the main bundle
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          supabase: {
            test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 35,
            enforce: true,
          },
          mapbox: {
            test: /[\\/]node_modules[\\/](mapbox-gl|react-map-gl)[\\/]/,
            name: 'mapbox',
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            chunks: 'all',
            priority: 25,
            enforce: true,
          },
          framerMotion: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'framer-motion',
            chunks: 'all',
            priority: 38,
            enforce: true,
          },
          vaul: {
            test: /[\\/]node_modules[\\/]vaul[\\/]/,
            name: 'vaul',
            chunks: 'all',
            priority: 20,
            enforce: true,
          },
          zod: {
            test: /[\\/]node_modules[\\/]zod[\\/]/,
            name: 'zod',
            chunks: 'all',
            priority: 18,
            enforce: true,
          },
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'lucide',
            chunks: 'all',
            priority: 17,
            enforce: true,
          },
          supercluster: {
            test: /[\\/]node_modules[\\/]supercluster[\\/]/,
            name: 'supercluster',
            chunks: 'all',
            priority: 16,
            enforce: true,
          },
          posthog: {
            test: /[\\/]node_modules[\\/]posthog-js[\\/]/,
            name: 'posthog',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
        },
      };
    }
    return config;
  },
};

// Export the configuration with Turbopack-compatible Serwist and Bundle Analyzer wrappers
export default withSerwist(withBundleAnalyzer(nextConfig));
