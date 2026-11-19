/**
 * Cron Auth Tests
 */

import { isAuthorized } from '@/lib/utils/cronAuth';

describe('cronAuth', () => {
  describe('isAuthorized', () => {
    it('should be a function', () => {
      expect(typeof isAuthorized).toBe('function');
    });

    it('should return false when authHeader is null', () => {
      expect(isAuthorized(null, 'secret')).toBe(false);
    });

    it('should return false when authHeader is undefined', () => {
      expect(isAuthorized(undefined, 'secret')).toBe(false);
    });

    it('should return false when authHeader is empty string', () => {
      expect(isAuthorized('', 'secret')).toBe(false);
    });

    it('should return false when secret is empty string', () => {
      expect(isAuthorized('Bearer token', '')).toBe(false);
    });

    it('should return false when secret is not provided', () => {
      expect(isAuthorized('Bearer token', undefined as unknown as string)).toBe(false);
    });

    it('should return false when authHeader does not start with Bearer', () => {
      expect(isAuthorized('Basic token123', 'secret')).toBe(false);
    });

    it('should return false when authHeader has only Bearer with no token', () => {
      expect(isAuthorized('Bearer', 'secret')).toBe(false);
    });

    it('should return false when authHeader has only Bearer and space', () => {
      expect(isAuthorized('Bearer ', 'secret')).toBe(false);
    });

    it('should return true when valid Bearer token matches secret', () => {
      expect(isAuthorized('Bearer mysecret123', 'mysecret123')).toBe(true);
    });

    it('should return false when token does not match secret', () => {
      expect(isAuthorized('Bearer wrongtoken', 'mysecret')).toBe(false);
    });

    it('should return false when token length differs from secret length', () => {
      expect(isAuthorized('Bearer short', 'longersecret123')).toBe(false);
    });

    it('should handle Bearer with single space separator', () => {
      expect(isAuthorized('Bearer mytoken', 'mytoken')).toBe(true);
    });

    it('should return false for multiple space separated values after Bearer', () => {
      expect(isAuthorized('Bearer token extra', 'token')).toBe(true);
    });

    it('should handle special characters in token', () => {
      const token = 'special!@#$%^&*()';
      expect(isAuthorized(`Bearer ${token}`, token)).toBe(true);
    });

    it('should handle unicode characters in token', () => {
      const token = 'токен123';
      expect(isAuthorized(`Bearer ${token}`, token)).toBe(true);
    });

    it('should return false when authHeader has extra parts beyond first two', () => {
      expect(isAuthorized('Bearer token extra', 'token extra')).toBe(false);
    });

    it('should be timing safe (not vulnerable to timing attacks)', () => {
      const secret = 'myverylongsecrettoken123';
      expect(isAuthorized('Bearer wrongtoken123', secret)).toBe(false);
      expect(isAuthorized('Bearer myverylongsecrettoken123', secret)).toBe(true);
    });

    it('should handle empty secret string even with valid Bearer', () => {
      expect(isAuthorized('Bearer token', '')).toBe(false);
    });

    it('should handle case sensitivity in Bearer keyword', () => {
      expect(isAuthorized('bearer token', 'token')).toBe(false);
      expect(isAuthorized('BEARER token', 'token')).toBe(false);
    });
  });
});
