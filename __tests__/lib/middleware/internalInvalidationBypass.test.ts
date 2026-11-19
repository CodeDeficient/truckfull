import { describe, expect, it } from '@jest/globals';
import { isInternalInvalidationRequest } from '@/lib/middleware/internalInvalidationBypass';
import { INVALIDATION_EDGE_HEADER } from '@/lib/events/syncCacheTargets';

const SECRET = 'test-edge-value';
const PATH = '/api/revalidate/event';

function withHeader(value?: string): Headers {
  return new Headers(value === undefined ? {} : { [INVALIDATION_EDGE_HEADER]: value });
}

describe('isInternalInvalidationRequest', () => {
  it('trusts a POST to the invalidation route with the matching internal header', () => {
    expect(isInternalInvalidationRequest(PATH, 'POST', withHeader(SECRET), SECRET)).toBe(true);
  });

  it.each([
    ['a missing header', PATH, 'POST', withHeader(), SECRET],
    ['a wrong header of the same length', PATH, 'POST', withHeader('test-edge-valuX'), SECRET],
    ['a wrong header of another length', PATH, 'POST', withHeader('short'), SECRET],
    ['an unconfigured secret', PATH, 'POST', withHeader(''), undefined],
    ['an empty configured secret', PATH, 'POST', withHeader(''), ''],
    ['a GET request', PATH, 'GET', withHeader(SECRET), SECRET],
    ['another API route', '/api/auth/login', 'POST', withHeader(SECRET), SECRET],
    ['a lookalike route', '/api/revalidate/event/extra', 'POST', withHeader(SECRET), SECRET],
  ])('keeps rate limiting for %s', (_label, pathname, method, headers, secret) => {
    expect(isInternalInvalidationRequest(pathname, method, headers, secret)).toBe(false);
  });
});
