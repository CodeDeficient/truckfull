import { describe, it, expect } from '@jest/globals';
import {
  constantTimeEqual,
  isAuthorizedSearxngRequest,
  SEARXNG_AUTH_HEADER,
} from '../../worker/searxngAuth.mjs';

describe('constantTimeEqual', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeEqual('token-value', 'token-value')).toBe(true);
  });

  it('returns false for different strings of equal length', () => {
    expect(constantTimeEqual('token-value', 'token-valuf')).toBe(false);
  });

  it('returns false when lengths differ', () => {
    expect(constantTimeEqual('short', 'much-longer-token')).toBe(false);
  });

  it('returns false for empty first argument', () => {
    expect(constantTimeEqual('', 'token')).toBe(false);
  });

  it('returns false for empty expected value', () => {
    expect(constantTimeEqual('token', '')).toBe(false);
  });

  it('handles multi-byte characters without throwing', () => {
    expect(constantTimeEqual('tökén', 'tökén')).toBe(true);
    expect(constantTimeEqual('tökén', 'token')).toBe(false);
  });
});

describe('isAuthorizedSearxngRequest', () => {
  it('accepts the correct token', () => {
    expect(isAuthorizedSearxngRequest('correct-token', 'correct-token')).toBe(true);
  });

  it('rejects an incorrect token', () => {
    expect(isAuthorizedSearxngRequest('wrong-token', 'correct-token')).toBe(false);
  });

  it('rejects when the header is missing', () => {
    expect(isAuthorizedSearxngRequest(null, 'correct-token')).toBe(false);
  });

  it('rejects when the header is an empty string', () => {
    expect(isAuthorizedSearxngRequest('', 'correct-token')).toBe(false);
  });

  it('rejects when the expected token is not configured', () => {
    expect(isAuthorizedSearxngRequest('any-token', '')).toBe(false);
    expect(isAuthorizedSearxngRequest('any-token', undefined)).toBe(false);
  });

  it('exposes a lowercase header name for case-insensitive lookup', () => {
    expect(SEARXNG_AUTH_HEADER).toBe(SEARXNG_AUTH_HEADER.toLowerCase());
  });
});
