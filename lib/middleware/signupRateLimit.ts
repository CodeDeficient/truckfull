/**
 * Signup-specific rate limiting using Upstash Redis.
 *
 * Limits signup attempts per IP (10 per 15 minutes by default) to slow down
 * abuse before the expensive Turnstile + GoTrue work happens. The window is
 * parsed from SIGNUP_RATE_LIMIT_WINDOW into the Upstash Duration format
 * (e.g. "15m" -> "15 m"); invalid values fall back to the defaults.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { Duration } from '@upstash/ratelimit';
import { RATE_LIMIT_TIMEOUT_MS } from '@/lib/middleware/rateLimitDecision';

const DURATION_STRING = /^(\d+)\s*(ms|s|m|h|d)$/;

const DEFAULT_SIGNUP_RATE_LIMIT_MAX = 10;
const DEFAULT_SIGNUP_RATE_LIMIT_WINDOW: Duration = '15 m';

/**
 * Parse a duration string like "15m" into the Upstash Duration format
 * ("15 m"). Returns null for invalid input (non-numeric amount, unknown
 * unit, zero, negative, fractional, or empty).
 */
export function parseDurationString(value: string): Duration | null {
  const match = DURATION_STRING.exec(value.trim());
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }
  return `${amount} ${match[2]}` as Duration;
}

export interface SignupRateLimitConfig {
  max: number;
  window: Duration;
}

/**
 * Read the signup rate limit configuration from the environment, falling
 * back to defaults (10 requests per 15 minutes) for missing or invalid
 * values.
 */
export function getSignupRateLimitConfig(
  env: Record<string, string | undefined> = process.env,
): SignupRateLimitConfig {
  const rawMax = Number(env.SIGNUP_RATE_LIMIT_MAX);
  const max = Number.isInteger(rawMax) && rawMax > 0 ? rawMax : DEFAULT_SIGNUP_RATE_LIMIT_MAX;

  const rawWindow = env.SIGNUP_RATE_LIMIT_WINDOW;
  const window = rawWindow ? (parseDurationString(rawWindow) ?? DEFAULT_SIGNUP_RATE_LIMIT_WINDOW) : DEFAULT_SIGNUP_RATE_LIMIT_WINDOW;

  return { max, window };
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

const { max, window } = getSignupRateLimitConfig();

/**
 * Sliding-window limiter for signup attempts, keyed per IP.
 */
export const signupLimiter = new Ratelimit({
  redis,
  timeout: RATE_LIMIT_TIMEOUT_MS,
  limiter: Ratelimit.slidingWindow(max, window),
  analytics: true,
  prefix: 'ratelimit:signup',
});
