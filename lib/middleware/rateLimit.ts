/**
 * Rate Limiting Module using Upstash Redis
 *
 * Provides per-endpoint rate limiting to protect APIs from abuse.
 * Uses sliding window algorithm for smooth rate limiting.
 *
 * SECURITY NOTE: Rate limiting requires Upstash Redis to be configured.
 * If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set,
 * rate limiting will be DISABLED and a warning will be logged.
 * For auth endpoints, consider using authLimiter which provides stricter limits.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { type NextRequest, NextResponse } from 'next/server';
import { logWarning } from '@/lib/logging';
import { RATE_LIMIT_TIMEOUT_MS } from '@/lib/middleware/rateLimitDecision';

const TRUCK_DETAIL_API_ROUTE = /^\/api\/trucks\/[^/]+$/;

// Initialize Redis client from environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

// Track if we've already logged the missing Redis warning (prevents log spam)
let hasLoggedMissingRedisWarning = false;

// Check if rate limiting is properly configured
export const isRateLimitConfigured = (): boolean => {
  const configured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );

  if (!configured && !hasLoggedMissingRedisWarning) {
    hasLoggedMissingRedisWarning = true;
    logWarning(
      '[RATE LIMIT] Upstash Redis is not configured. Rate limiting is disabled. ' +
        'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.',
    );
  }

  return configured;
};

/**
 * Rate limiter configurations for different endpoint categories
 * Using sliding window algorithm for smoother rate limiting
 */

// Standard API endpoints (trucks listing, search)
export const standardLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'ratelimit:standard',
});

export const bulkListLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:bulk-list',
});

// Location-based queries (heavier PostGIS operations)
export const locationLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
  analytics: true,
  prefix: 'ratelimit:location',
});

// Single resource endpoints (light operations)
export const detailLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(200, '1 m'), // 200 requests per minute
  analytics: true,
  prefix: 'ratelimit:detail',
});

// Geocoding (costs money via Mapbox)
export const geocodeLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
  analytics: true,
  prefix: 'ratelimit:geocode',
});

// Facebook/Meta webhooks (external, potential abuse)
// Increased to 1000 req/min to handle high-volume legitimate Meta traffic
export const webhookLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(1000, '1 m'), // 1000 requests per minute
  analytics: true,
  prefix: 'ratelimit:webhook',
});

// General fallback limiter
export const fallbackLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
  analytics: true,
  prefix: 'ratelimit:fallback',
});

// Verification code endpoints (strict to prevent abuse)
export const verificationSendLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(3, '15 m'), // 3 requests per 15 minutes
  analytics: true,
  prefix: 'ratelimit:verification-send',
});

export const verificationCheckLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(10, '15 m'), // 10 requests per 15 minutes
  analytics: true,
  prefix: 'ratelimit:verification-check',
});

// Expensive AI research endpoints (LLM inference + external API calls)
export const researchLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests per hour per user
  analytics: true,
  prefix: 'ratelimit:research',
});

// Public claim-your-truck search (unauthenticated, prevent abuse)
export const claimSearchLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  analytics: true,
  prefix: 'ratelimit:claim-search',
});

// Public claim-your-truck listing submissions (unauthenticated, prevent spam)
export const claimSubmissionLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 submissions per hour
  analytics: true,
  prefix: 'ratelimit:claim-submission',
});

// Event waitlist signups (unauthenticated; every accepted row emails support,
// so abuse directly amplifies into the support inbox)
export const waitlistSubmissionLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 submissions per hour
  analytics: true,
  prefix: 'ratelimit:event-waitlist',
});

// Authentication endpoints (strict limits for OAuth callbacks, login, etc.)
export const authLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes (matches old in-memory config)
  analytics: true,
  prefix: 'ratelimit:auth',
});

/**
 * Get client IP address from request
 * Handles various proxy headers for accurate IP detection
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers that proxies/load balancers may set
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Vercel-specific header
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Fallback for local development
  return '127.0.0.1';
}

/**
 * Select appropriate rate limiter based on request path
 */
export function getLimiterForPath(pathname: string): Ratelimit {
  // Geocoding - most restrictive (costs $)
  if (pathname.startsWith('/api/geocode')) {
    return geocodeLimiter;
  }

  if (pathname.startsWith('/api/trucks/public')) {
    return bulkListLimiter;
  }

  // Location-based queries
  if (pathname.startsWith('/api/trucks/nearby')) {
    return locationLimiter;
  }

  // Single truck details (very light)
  if (TRUCK_DETAIL_API_ROUTE.test(pathname) && !pathname.endsWith('/nearby')) {
    return detailLimiter;
  }

  // Expensive AI research endpoints
  if (pathname.startsWith('/api/events/manual-research') || pathname.includes('/vetting')) {
    return researchLimiter;
  }

  // Public claim-your-truck search (unauthenticated)
  if (pathname.startsWith('/api/claim-your-truck')) {
    return claimSearchLimiter;
  }

  // Event waitlist signups (email amplification surface)
  if (pathname.startsWith('/api/events/waitlist')) {
    return waitlistSubmissionLimiter;
  }

  // Standard endpoints
  if (pathname.startsWith('/api/trucks') || pathname.startsWith('/api/search')) {
    return standardLimiter;
  }

  // Fallback for all other API routes
  return fallbackLimiter;
}

/**
 * Convenience function to apply rate limiting to a specific endpoint
 *
 * @param endpoint - The endpoint name to apply rate limiting to
 * @param request - The Next.js request object
 * @returns Rate limit result
 */
export async function rateLimitEndpoint(endpoint: string, request: NextRequest) {
  if (!isRateLimitConfigured()) {
    // If rate limiting is not configured, allow all requests
    return {
      success: true,
      limit: 0,
      reset: 0,
      remaining: Infinity,
    };
  }

  // Map endpoint names to specific limiters
  let limiter: Ratelimit;
  switch (endpoint) {
    case 'analytics-track': {
      limiter = detailLimiter; // High limit for event tracking
      break;
    }
    case 'event-waitlist': {
      limiter = waitlistSubmissionLimiter;
      break;
    }
    default: {
      limiter = fallbackLimiter;
    }
  }

  const identifier = `${endpoint}:${getClientIp(request)}`;
  return await limiter.limit(identifier);
}

/**
 * Compute whole seconds remaining until a rate-limit reset, given the reset
 * timestamp (ms epoch) and the current time (ms epoch). Fractional seconds
 * round up, and an already-elapsed reset clamps to a minimum of 1 second so
 * callers never emit a 0 or negative Retry-After for a rate-limited response.
 */
export function getRetryAfterSeconds(reset: number, now: number): number {
  return Math.max(1, Math.ceil((reset - now) / 1000));
}

/**
 * Rate-limit a request using a named Upstash Redis limiter.
 * Returns a structured result; callers decide how to respond.
 * Drop-in replacement for the old in-memory RateLimiter.checkRateLimit().
 */
export async function checkRateLimited(
  identifier: string,
  limiter: Ratelimit,
): Promise<
  | { allowed: true; remaining: number; reset: number }
  | { allowed: false; retryAfter: number; reset: number }
> {
  if (!isRateLimitConfigured()) {
    // Warning already logged by isRateLimitConfigured() on first call.
    // Rate limiting is disabled - requests proceed without rate limiting.
    return { allowed: true, remaining: Infinity, reset: 0 };
  }

  const { success, remaining, reset } = await limiter.limit(identifier);
  if (!success) {
    return { allowed: false, retryAfter: getRetryAfterSeconds(reset, Date.now()), reset };
  }
  return { allowed: true, remaining, reset };
}

/**
 * Higher-order function: wraps a Next.js route handler with Upstash Redis rate limiting.
 *
 * Replaces the old in-memory withRateLimit from lib/security/rateLimiter.ts
 * and the in-memory version in lib/middleware/coreMiddleware.ts.
 *
 * @example
 * export const GET = withRedisRateLimit(myHandler, locationLimiter);
 */
export function withRedisRateLimit<T extends { params: Promise<Record<string, unknown>> }>(
  handler: (request: NextRequest, context: T) => Promise<Response>,
  limiter: Ratelimit = standardLimiter,
) {
  return async (request: NextRequest, context: T): Promise<Response> => {
    const identifier = `${request.nextUrl.pathname}:${getClientIp(request)}`;
    const result = await checkRateLimited(identifier, limiter);

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: result.retryAfter },
        {
          status: 429,
          headers: { 'Retry-After': String(result.retryAfter) },
        },
      );
    }

    return handler(request, context);
  };
}
