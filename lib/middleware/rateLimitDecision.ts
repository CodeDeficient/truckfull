export const RATE_LIMIT_TIMEOUT_MS = 1000;

const FAIL_CLOSED_ROUTE_PREFIXES = [
  '/api/auth/',
  '/api/webhooks/',
  '/api/claim-truck/',
  '/api/events/waitlist',
  '/api/owner/',
] as const;

export type RateLimitDecision = 'allow' | 'limited' | 'unavailable';

export interface RateLimitOutcome {
  readonly success: boolean;
  readonly reason?: string;
}

export function isFailClosedRoute(pathname: string): boolean {
  return FAIL_CLOSED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function decideRateLimit(outcome: RateLimitOutcome): RateLimitDecision {
  if (outcome.reason === 'timeout') return 'unavailable';
  return outcome.success ? 'allow' : 'limited';
}
