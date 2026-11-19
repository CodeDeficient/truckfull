import { describe, expect, it } from '@jest/globals';
import { decideRateLimit, isFailClosedRoute } from '@/lib/middleware/rateLimitDecision';

describe('decideRateLimit', () => {
  it('allows a request the limiter accepted', () => {
    expect(decideRateLimit({ success: true })).toBe('allow');
  });

  it('limits a request the limiter rejected', () => {
    expect(decideRateLimit({ success: false })).toBe('limited');
  });

  it('treats an Upstash timeout as unavailable even though it reports success', () => {
    expect(decideRateLimit({ success: true, reason: 'timeout' })).toBe('unavailable');
  });

  it.each(['cacheBlock', 'denyList'])('keeps the limiter verdict for reason %s', (reason) => {
    expect(decideRateLimit({ success: false, reason })).toBe('limited');
  });
});

describe('isFailClosedRoute', () => {
  it.each([
    '/api/auth/login',
    '/api/auth/claim/send-code',
    '/api/webhooks/meta',
    '/api/claim-truck/submit',
    '/api/events/waitlist',
    '/api/owner/trucks',
  ])('fails closed for %s', (pathname) => {
    expect(isFailClosedRoute(pathname)).toBe(true);
  });

  it.each(['/api/trucks', '/api/search', '/api/geo/ip-location', '/api/authors'])(
    'fails open for %s',
    (pathname) => {
      expect(isFailClosedRoute(pathname)).toBe(false);
    },
  );
});
