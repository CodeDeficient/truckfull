import { describe, expect, it } from '@jest/globals';
import { shouldUseAnonymousPublicFastPath } from '@/lib/middleware/publicRouteFastPath';

function requestHeaders(init?: HeadersInit): Headers {
  return new Headers(init);
}

describe('shouldUseAnonymousPublicFastPath', () => {
  it.each([
    '/',
    '/city/atlanta-ga',
    '/city/atlanta-ga/',
    '/cuisine/mexican',
    '/best/atlanta-ga',
    '/blog/food-truck-guide',
    '/events',
    '/events/atlanta-ga',
    '/events/atlanta-ga/summer-festival-2026-08-01',
    '/events/atlanta-ga/summer-festival-2026-08-01/',
  ])('allows an anonymous GET for %s', (pathname) => {
    expect(shouldUseAnonymousPublicFastPath(pathname, 'GET', requestHeaders())).toBe(true);
  });

  it('allows an anonymous HEAD for an approved route', () => {
    expect(shouldUseAnonymousPublicFastPath('/city/atlanta-ga', 'HEAD', requestHeaders())).toBe(
      true,
    );
  });

  it.each([
    '/',
    '/city/atlanta-ga',
    '/cuisine/mexican',
    '/best/atlanta-ga',
    '/blog/food-truck-guide',
    '/events/atlanta-ga',
    '/events/atlanta-ga/summer-festival-2026-08-01',
  ])('rejects a Cookie-bearing request for %s', (pathname) => {
    expect(
      shouldUseAnonymousPublicFastPath(pathname, 'GET', requestHeaders({ Cookie: 'session=1' })),
    ).toBe(false);
  });

  it('rejects a request with an Authorization header', () => {
    expect(
      shouldUseAnonymousPublicFastPath(
        '/events/atlanta-ga',
        'GET',
        requestHeaders({ Authorization: 'Bearer token' }),
      ),
    ).toBe(false);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('rejects a %s request', (method) => {
    expect(shouldUseAnonymousPublicFastPath('/city/atlanta-ga', method, requestHeaders())).toBe(
      false,
    );
  });

  it.each([
    '/city',
    '/city/atlanta-ga/trucks',
    '/cuisine',
    '/cuisine/mexican/items',
    '/best',
    '/best/atlanta-ga/trucks',
    '/blog',
    '/blog/food-truck-guide/comments',
    '/events/atlanta-ga/summer-festival-2026-08-01/extra',
    '/atlanta-food-truck',
    '/owner-dashboard',
    '/admin/users',
    '/api/events',
    '/api/events/atlanta-ga',
  ])('rejects an unapproved path shape: %s', (pathname) => {
    expect(shouldUseAnonymousPublicFastPath(pathname, 'GET', requestHeaders())).toBe(false);
  });
});
