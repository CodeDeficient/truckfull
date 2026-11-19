import { describe, it, expect } from '@jest/globals';
import { validateSearxngRequest, ALLOWED_METHOD, ALLOWED_PATH } from '../../worker/searxngRequest.mjs';

function params(entries = {}) {
  return new URLSearchParams(entries);
}

describe('validateSearxngRequest', () => {
  it('allows GET to the search path requesting JSON', () => {
    expect(validateSearxngRequest('GET', '/search', params({ q: 'tacos', format: 'json' }))).toEqual({
      allowed: true,
    });
  });

  it('rejects POST so the container cannot be used as a write proxy', () => {
    const result = validateSearxngRequest('POST', '/search', params({ format: 'json' }));
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(405);
  });

  it('rejects PUT, DELETE and PATCH', () => {
    for (const method of ['PUT', 'DELETE', 'PATCH']) {
      expect(validateSearxngRequest(method, '/search', params({ format: 'json' })).allowed).toBe(
        false,
      );
    }
  });

  it('rejects arbitrary paths', () => {
    const result = validateSearxngRequest('GET', '/', params({ format: 'json' }));
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(404);
  });

  it('rejects path traversal attempts', () => {
    expect(validateSearxngRequest('GET', '/search/../../etc/passwd', params({ format: 'json' })).allowed).toBe(false);
  });

  it('rejects the search path without an exact match', () => {
    expect(validateSearxngRequest('GET', '/search/extra', params({ format: 'json' })).allowed).toBe(false);
    expect(validateSearxngRequest('GET', '/searching', params({ format: 'json' })).allowed).toBe(false);
  });

  it('rejects requests without format=json so the HTML surface stays unreachable', () => {
    const missing = validateSearxngRequest('GET', '/search', params({ q: 'tacos' }));
    expect(missing.allowed).toBe(false);
    expect(missing.status).toBe(400);
  });

  it('rejects non-json formats', () => {
    expect(validateSearxngRequest('GET', '/search', params({ format: 'html' })).allowed).toBe(false);
    expect(validateSearxngRequest('GET', '/search', params({ format: 'csv' })).allowed).toBe(false);
  });

  it('rejects an empty query string', () => {
    expect(validateSearxngRequest('GET', '/search', params({})).allowed).toBe(false);
  });

  it('exposes the allowlisted method and path', () => {
    expect(ALLOWED_METHOD).toBe('GET');
    expect(ALLOWED_PATH).toBe('/search');
  });
});
