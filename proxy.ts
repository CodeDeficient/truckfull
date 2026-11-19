import { type NextRequest, NextResponse } from 'next/server';
import { withLoopTiming } from '@/lib/runtime/eventLoopLag';
import { withDependencyTiming } from '@/lib/runtime/dependencyTiming.mjs';
import { noteRequestPath } from '@/lib/runtime/loopStallLog.mjs';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/database.remote.types';
import { logDebug, logError, logWarning } from '@/lib/logging';
import { isRateLimitConfigured, getClientIp, getLimiterForPath } from '@/lib/middleware/rateLimit';
import { decideRateLimit, isFailClosedRoute } from '@/lib/middleware/rateLimitDecision';
import { shouldUseAnonymousPublicFastPath } from '@/lib/middleware/publicRouteFastPath';
import { isInternalInvalidationRequest } from '@/lib/middleware/internalInvalidationBypass';
import { decideApiAccess } from '@/lib/middleware/apiAccessGate';
import { classifyEventDetailPath } from '@/lib/events/eventDetailPath';
import { cityPathRedirect } from '@/lib/city/citySlugAliases';
import { resolvePublicOrigin } from '@/lib/http/publicOrigin';
import { SESSION_FETCH_TIMEOUT_MS, fetchWithTimeout } from '@/lib/supabase/fetchWithTimeout';

const HEALTH_ROUTE = '/api/health';
const EVENTS_API_ROUTE = /^\/api\/events\/?$/;
const TRUCK_API_ROUTE = /^\/api\/trucks\/[^/]+\/?$/;
const AUTHENTICATED_PAGE_ROUTE =
  /^\/(owner-dashboard|admin|user-dashboard|favorites|organizer|account)\/?$/;
const EVENT_DETAIL_ROUTE = /^\/events\/([^/]+)\/([^/]+)\/?$/;
const EVENT_CITY_ROUTE = /^\/events\/[^/]+\/?$/;
const CITY_ROUTE = /^\/city\/[^/]+\/?$/;
const CUISINE_ROUTE = /^\/cuisine\/[^/]+\/?$/;
const BEST_ROUTE = /^\/best\/[^/]+\/?$/;
const BLOG_ROUTE = /^\/blog\/[^/]+\/?$/;
const TRUCK_PROFILE_ROUTE = /^\/trucks\/[^/]+\/?$/;
const ONE_SEGMENT_ROUTE = /^\/([a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)\/?$/i;
const ASSET_LIKE_EXTENSION = /\.(json|txt|md|mp4|xml|webmanifest)$/i;
const STATIC_ASSET_EXTENSION = /\.(css|js|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf)$/i;
const SLUG_ROUTE = /^\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/;

function serviceUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Service temporarily unavailable. Please try again later.' },
    { status: 503 },
  );
}

function rateLimitUnavailableResponse(pathname: string, cause: unknown): NextResponse | undefined {
  if (!isFailClosedRoute(pathname)) {
    logError('[RATE LIMIT] Error checking rate limit, allowing request:', cause);
    return undefined;
  }
  logError('[RATE LIMIT] Error checking rate limit for sensitive route, blocking request:', cause);
  return serviceUnavailableResponse();
}

function tooManyRequestsResponse(limit: number, remaining: number, reset: number): NextResponse {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
      },
    },
  );
}

async function applyRateLimit(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse | undefined> {
  if (!isRateLimitConfigured()) {
    if (!isFailClosedRoute(pathname)) return undefined;
    logError('[SECURITY] Rate limiting unavailable for sensitive route, blocking request');
    return serviceUnavailableResponse();
  }
  try {
    const clientIp = getClientIp(request);
    const result = await getLimiterForPath(pathname).limit(clientIp);
    const decision = decideRateLimit(result);
    if (decision === 'unavailable')
      return rateLimitUnavailableResponse(pathname, 'upstash timeout');
    if (decision === 'allow') return undefined;
    logWarning(`[RATE LIMIT] IP ${clientIp} exceeded limit for ${pathname}`);
    return tooManyRequestsResponse(result.limit, result.remaining, result.reset);
  } catch (error) {
    return rateLimitUnavailableResponse(pathname, error);
  }
}

const EVENT_NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>404 - Page Not Found | TruckFull</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: #050505; color: #f5f5f5; font-family: Arial, sans-serif; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; }
      section { width: min(100%, 34rem); text-align: center; }
      .brand { color: #ff6b00; font-size: 1.25rem; font-weight: 800; letter-spacing: .16em; }
      h1 { margin: 1.5rem 0 .25rem; font-size: clamp(4rem, 20vw, 8rem); line-height: .9; }
      h2 { margin: 1.5rem 0 0; font-size: clamp(1.25rem, 5vw, 1.75rem); }
      p { margin: .75rem auto 0; max-width: 28rem; color: #a3a3a3; line-height: 1.6; }
      a { display: inline-block; margin-top: 1.75rem; border-radius: .5rem; background: #f97316; color: #fff; padding: .75rem 1.25rem; font-weight: 700; text-decoration: none; }
      a:hover { background: #ea580c; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <div class="brand">TRUCKFULL</div>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <a href="/">Find Food Trucks</a>
      </section>
    </main>
  </body>
</html>`;

// Route classification used to skip slug redirects for known application routes.
const AUTHENTICATED_PREFIXES = [
  '/owner-dashboard/',
  '/admin/',
  '/user-dashboard/',
  '/favorites/',
  '/organizer/',
  '/account/',
  '/api/owner/',
  '/api/admin/',
  '/api/stripe/',
  '/api/account/',
  '/api/auth/',
  '/api/claim-truck/',
  '/api/organizer/',
] as const;

const AUTHENTICATED_API_PATTERNS = [
  /^\/api\/(?:account|admin|auth|claim-truck|owner|organizer|stripe)(?:\/|$)/,
  /^\/api\/(?:dashboard|hotspots|organizer-reviews|relevance-stats)(?:\/|$)/,
  /^\/api\/analytics\/summary\/?$/,
  /^\/api\/trial\/start\/?$/,
  /^\/api\/events\/(?:applications|manual-research|ocr|research-feedback|saved-leads|vetting)(?:\/|$)/,
  /^\/api\/events\/[^/]+\/vetting\/?$/,
  /^\/api\/storage\/upload\/?$/,
  /^\/api\/trucks\/[^/]+\/(?:analytics|location)(?:\/|$)/,
] as const;

function isAuthenticatedApiRoute(pathname: string, method: string): boolean {
  if (AUTHENTICATED_API_PATTERNS.some((pattern) => pattern.test(pathname))) return true;
  if (EVENTS_API_ROUTE.test(pathname)) return true;
  return TRUCK_API_ROUTE.test(pathname) && method === 'PUT';
}

const MARKETING_LEGAL_ROUTES = new Set([
  'account-deleted',
  'about',
  'blog',
  'claim-your-truck',
  'contact',
  'discover_food_trucks',
  'features',
  'for-organizers',
  'for-owners',
  'food-truck-event-research',
  'food-truck-live-location',
  'food-truck-traffic-data',
  'login',
  'maintenance',
  'offline',
  'partnerships',
  'pricing',
  'privacy',
  'signup',
  'takedown',
  'terms',
  'unauthorized',
]);

const APPLICATION_ROUTE_SEGMENTS = new Set([
  'auth',
  'best',
  'cuisine',
  'data-api',
  'profile',
  'settings',
  'trucks',
]);

type RouteClass =
  | 'event_detail'
  | 'event_city'
  | 'events_directory'
  | 'homepage'
  | 'marketing_legal'
  | 'truck_profile_or_unknown_slug'
  | 'truck_profile'
  | 'city'
  | 'cuisine'
  | 'best'
  | 'blog'
  | 'api'
  | 'authenticated_api'
  | 'authenticated'
  | 'asset_like'
  | 'other_public';

function classifyRouteDetailed(pathname: string, method: string): RouteClass {
  if (isAuthenticatedApiRoute(pathname, method)) return 'authenticated_api';
  if (pathname.startsWith('/api/')) return 'api';
  if (
    AUTHENTICATED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    AUTHENTICATED_PAGE_ROUTE.test(pathname)
  )
    return 'authenticated';

  if (pathname === '/') return 'homepage';
  if (pathname === '/events') return 'events_directory';

  const eventDetailMatch = pathname.match(EVENT_DETAIL_ROUTE);
  if (eventDetailMatch) return 'event_detail';
  if (EVENT_CITY_ROUTE.test(pathname)) return 'event_city';

  if (CITY_ROUTE.test(pathname)) return 'city';
  if (CUISINE_ROUTE.test(pathname)) return 'cuisine';
  if (BEST_ROUTE.test(pathname)) return 'best';
  if (BLOG_ROUTE.test(pathname)) return 'blog';
  if (TRUCK_PROFILE_ROUTE.test(pathname)) return 'truck_profile';

  const oneSegment = pathname.match(ONE_SEGMENT_ROUTE);
  if (oneSegment) {
    const segment = oneSegment[1].toLowerCase();
    if (MARKETING_LEGAL_ROUTES.has(segment)) return 'marketing_legal';
    if (APPLICATION_ROUTE_SEGMENTS.has(segment)) return 'other_public';
    return 'truck_profile_or_unknown_slug';
  }

  if (ASSET_LIKE_EXTENSION.test(pathname)) return 'asset_like';
  if (pathname.startsWith('/.well-known/')) return 'asset_like';

  return 'other_public';
}

function eventNotFoundResponse(): NextResponse {
  return new NextResponse(EVENT_NOT_FOUND_HTML, {
    status: 404,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

function apiGateDenial(request: NextRequest): NextResponse | null {
  const decision = decideApiAccess({
    pathname: request.nextUrl.pathname,
    method: request.method,
    headers: request.headers,
    cookieNames: request.cookies.getAll().map((cookie) => cookie.name),
    cronSecret: process.env.CRON_SECRET,
  });
  if (decision === 'unauthorized')
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (decision === 'not_found') return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  return null;
}

async function routeRequest(request: NextRequest): Promise<Response> {
  const pathname = request.nextUrl.pathname;

  // 🔧 MAINTENANCE MODE: Redirect to maintenance page during scheduled maintenance
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  if (maintenanceMode && pathname !== '/maintenance' && !pathname.startsWith('/api/')) {
    const startTime = process.env.MAINTENANCE_START;
    const endTime = process.env.MAINTENANCE_END;

    if (startTime && endTime) {
      const now = Date.now();
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();

      if (now >= start && now <= end) {
        const maintenanceUrl = new URL('/maintenance', resolvePublicOrigin(request.nextUrl.origin));
        return NextResponse.redirect(maintenanceUrl);
      }
    }
  }

  // 🚨 SECURITY: Block exploit scanning routes (WordPress, Git, PHP attacks)
  const exploitPatterns = [
    '/.git/config',
    '/.git/',
    '/wordpress/wp-admin/',
    '/wordpress/',
    '/wp-includes/',
    '/wp-admin/setup-config.php',
    '/wp-admin/',
    '/xmlrpc.php',
    '/wp-login.php',
    '/index.php',
    '/index/function.php',
    '/administrator/',
    '/admin/config.php',
    '/setup-config.php',
  ];

  if (exploitPatterns.some((pattern) => pathname.includes(pattern))) {
    logWarning(`[SECURITY] Blocked exploit scan: ${pathname}`);
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  // 🚨 SECURITY: Block sensitive file access (.env files, .git, etc.)

  const sensitiveFilePatterns = [
    '/.env',
    '/.git',
    '/.htaccess',
    '/.htpasswd',
    '/web.config',
    '/docker-compose.yml',
    '/package-lock.json',
    '/composer.json',
    '/composer.lock',
    '/Gemfile',
    '/Gemfile.lock',
    '/Procfile',
  ];

  if (sensitiveFilePatterns.some((pattern) => pathname.includes(pattern))) {
    logWarning(`[SECURITY] Blocked sensitive file access: ${pathname}`);
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  if (classifyEventDetailPath(pathname) === 'malformed') return eventNotFoundResponse();

  const apiDenial = pathname.startsWith('/api/') ? apiGateDenial(request) : null;
  if (apiDenial) return apiDenial;
  if (pathname === HEALTH_ROUTE) return NextResponse.next();

  // 🚦 RATE LIMITING: Apply to all API routes including auth to prevent brute force attacks
  // Auth routes use a separate limiter with higher limits to accommodate legitimate login attempts
  const skipRateLimit = isInternalInvalidationRequest(
    pathname,
    request.method,
    request.headers,
    process.env.TRUCKFULL_EDGE_SECRET,
  );
  if (pathname.startsWith('/api/') && !skipRateLimit) {
    const rateLimited = await applyRateLimit(request, pathname);
    if (rateLimited) return rateLimited;
  }

  // Redirect bare city slugs (e.g. /columbia-sc) to /city/columbia-sc
  // Must happen before Supabase client creation to avoid wasted work
  const cityTarget = cityPathRedirect(pathname);
  if (cityTarget) {
    return NextResponse.redirect(new URL(cityTarget, resolvePublicOrigin(request.nextUrl.origin)), {
      status: 301,
    });
  }

  // Only run Supabase middleware on routes that need auth (excluding static assets and API routes)
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    STATIC_ASSET_EXTENSION.test(request.nextUrl.pathname)
  ) {
    return NextResponse.next();
  }

  if (shouldUseAnonymousPublicFastPath(pathname, request.method, request.headers)) {
    return NextResponse.next();
  }

  // Check if we're on a secure context (HTTPS or localhost)
  // For development with IP addresses, we handle it but log appropriately
  const isSecureContext =
    request.nextUrl.protocol === 'https:' ||
    request.nextUrl.hostname === 'localhost' ||
    request.nextUrl.hostname === '127.0.0.1';

  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Create a Supabase client configured to work in proxy
  // Environment variables are validated during build time and are essential for Supabase client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    logError('Missing required Supabase environment variables');
    // Return early response if env vars are missing
    return NextResponse.error();
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { fetch: fetchWithTimeout(SESSION_FETCH_TIMEOUT_MS) },
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Only set secure cookies on secure contexts
        if (isSecureContext) {
          options.secure = true;
        }
        // Use response.cookies to set cookies in middleware
        response.cookies.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        // Only set secure cookies on secure contexts
        if (isSecureContext) {
          options.secure = true;
        }
        // Use response.cookies to remove cookies in middleware
        response.cookies.set(name, '', { ...options, maxAge: 0 });
      },
    },
  });

  // Check slug_redirects for multi-segment city slugs (e.g. north-augusta-sc)
  // that don't match the 2-segment isCitySlugPattern check above.
  // Only unknown one-segment slugs can be historical/legacy truck slugs;
  // known application routes (marketing/legal, events directory, authenticated
  // pages) can never be truck slugs, so they skip the lookup entirely.
  const slugMatch = pathname.match(SLUG_ROUTE);
  if (
    slugMatch &&
    classifyRouteDetailed(pathname, request.method) === 'truck_profile_or_unknown_slug'
  ) {
    const { data: slugRedirect } = await supabase
      .from('slug_redirects')
      .select('to_slug')
      .eq('from_slug', slugMatch[1])
      .maybeSingle();
    if (slugRedirect) {
      return NextResponse.redirect(
        new URL(`/${slugRedirect.to_slug}`, resolvePublicOrigin(request.nextUrl.origin)),
        { status: 301 },
      );
    }
  }

  // Refresh the session to ensure it's still valid - critical for mobile
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Log the auth status for debugging purposes in development
  // Only logs if VERBOSE_PROXY_LOGGING environment variable is set to 'true'
  // Using a more explicit check to avoid direct process access linting issues
  const isDevEnvironment =
    request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
  const VERBOSE_PROXY_LOGGING = process.env.VERBOSE_PROXY_LOGGING === 'true';
  if (isDevEnvironment && VERBOSE_PROXY_LOGGING) {
    logDebug(
      `[PROXY] Auth check for ${request.url}, User: ${user ? 'Authenticated' : 'Not authenticated'}`,
    );
  }

  // Continue with the request
  return response;
}

export async function proxy(request: NextRequest): Promise<Response> {
  noteRequestPath(request.nextUrl.pathname);
  return withDependencyTiming(withLoopTiming(await routeRequest(request)));
}

// Define which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - approved public static resources
     * - static file extensions (css, js, images, fonts)
     */
    `/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest\\.json$|pins/README\\.md$|pwa-icons-readme\\.md$|field-guide-demo-optimized\\.mp4$|.*\\.(?:css|js|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$).*)`,
    '/api/:path*',
  ],
};
