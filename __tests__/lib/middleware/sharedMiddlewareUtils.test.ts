/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('sharedMiddlewareUtils', () => {
  describe('ValidationError interface', () => {
    it('should define ValidationError structure', () => {
      const error = {
        field: 'email',
        message: 'Invalid email format',
        code: 'invalid_format',
        received: 'not-an-email',
      };
      expect(error.field).toBe('email');
      expect(error.message).toBe('Invalid email format');
      expect(error.code).toBe('invalid_format');
      expect(error.received).toBe('not-an-email');
    });

    it('should allow optional received property', () => {
      const error = {
        field: 'name',
        message: 'Required',
        code: 'required',
      };
      expect(error.received).toBeUndefined();
    });
  });

  describe('AuthenticatedHandler type', () => {
    it('should define handler function signature', () => {
      const handler = async (
        _request: jest.Mock,
        _params: { params?: Record<string, string> },
        _user: { id: string; email: string; role: string },
      ): Promise<jest.Mock> => {
        return Promise.resolve({ status: 200 } as unknown as jest.Mock);
      };

      expect(typeof handler).toBe('function');
    });
  });

  describe('AuthOptions interface', () => {
    it('should define optional roles', () => {
      const options = {
        requiredRoles: ['admin', 'superadmin'],
      };
      expect(options.requiredRoles).toContain('admin');
    });

    it('should define optional rate limit config', () => {
      const options = {
        rateLimit: {
          windowMs: 60000,
          maxRequests: 100,
        },
      };
      expect(options.rateLimit.windowMs).toBe(60000);
    });

    it('should define optional skip methods', () => {
      const options = {
        skipMethods: ['GET', 'HEAD'],
      };
      expect(options.skipMethods).toContain('GET');
    });
  });
});
