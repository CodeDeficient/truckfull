/**
 * Tests for isAuthorized function in expire-confirmations route
 */

import { isAuthorized } from '@/lib/utils/cronAuth';

describe('isAuthorized', () => {
  it('should accept valid Bearer token', () => {
    expect(isAuthorized('Bearer secret123', 'secret123')).toBe(true);
  });

  it('should reject missing Bearer prefix', () => {
    expect(isAuthorized('secret123', 'secret123')).toBe(false);
  });

  it('should reject malformed Bearer header (only "Bearer")', () => {
    expect(isAuthorized('Bearer', 'secret123')).toBe(false);
  });

  it('should reject wrong token with correct length', () => {
    expect(isAuthorized('Bearer wrongtoken', 'righttoken')).toBe(false);
  });

  it('should reject null header', () => {
    expect(isAuthorized(null, 'secret123')).toBe(false);
  });

  it('should extract and compare only the token part, not the entire Bearer header', () => {
    // This is the key security test: we must extract the token before comparison
    // The buggy implementation compares "Bearer secret" with "Bearer secret"
    // which happens to work but is incorrect
    const result = isAuthorized('Bearer mytoken', 'mytoken');
    expect(result).toBe(true);
  });

  it('should handle tokens with spaces correctly (extract only the first part after Bearer)', () => {
    // Tokens with spaces should be handled - we split on first space
    const result = isAuthorized('Bearer token with spaces', 'token');
    expect(result).toBe(true);
  });
});
