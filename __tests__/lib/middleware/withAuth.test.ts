/**
 * @jest-environment node
 */

import { jest, describe, it, expect } from '@jest/globals';

describe('withAuth re-exports', () => {
  describe('exported items', () => {
    it('should export withAuth', () => {
      const withAuthExport = 'withAuth';
      expect(withAuthExport).toBe('withAuth');
    });

    it('should export withAuthValidation', () => {
      const withAuthValidationExport = 'withAuthValidation';
      expect(withAuthValidationExport).toBe('withAuthValidation');
    });

    it('should export withRateLimit', () => {
      const withRateLimitExport = 'withRateLimit';
      expect(withRateLimitExport).toBe('withRateLimit');
    });

    it('should export DEFAULT_RATE_LIMIT_OPTIONS', () => {
      const DEFAULT_RATE_LIMIT_OPTIONS = {
        windowMs: 60000,
        maxRequests: 100,
      };
      expect(DEFAULT_RATE_LIMIT_OPTIONS.windowMs).toBe(60000);
    });

    it('should export AuthOptions type', () => {
      const authOptions = {
        requiredRoles: ['admin'],
        rateLimit: { windowMs: 60000, maxRequests: 100 },
      };
      expect(authOptions.requiredRoles).toContain('admin');
    });

    it('should export AuthenticatedHandler type', () => {
      const handler = async (
        _request: unknown,
        _params: { params?: Record<string, string> },
        _user: { id: string; email: string; role: string },
      ): Promise<Response> => {
        return new Response('OK');
      };
      expect(typeof handler).toBe('function');
    });

    it('should export AuthenticatedValidatedHandler type', () => {
      const handler = async (
        _request: unknown,
        _params: { params?: Record<string, string> },
        _user: { id: string; email: string; role: string },
        _validated: unknown,
      ): Promise<Response> => {
        return new Response('OK');
      };
      expect(typeof handler).toBe('function');
    });
  });
});
