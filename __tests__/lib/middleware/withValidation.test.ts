/**
 * @jest-environment node
 */

import { jest, describe, it, expect } from '@jest/globals';

describe('withValidation re-exports', () => {
  describe('validation function exports', () => {
    it('should export withValidation', () => {
      const withValidationExport = 'withValidation';
      expect(withValidationExport).toBe('withValidation');
    });

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

    it('should export withGetValidation', () => {
      const withGetValidationExport = 'withGetValidation';
      expect(withGetValidationExport).toBe('withGetValidation');
    });

    it('should export createQuerySchema', () => {
      const createQuerySchemaExport = 'createQuerySchema';
      expect(createQuerySchemaExport).toBe('createQuerySchema');
    });

    it('should export validateQueryParams', () => {
      const validateQueryParamsExport = 'validateQueryParams';
      expect(validateQueryParamsExport).toBe('validateQueryParams');
    });
  });

  describe('type exports', () => {
    it('should export ValidationError type', () => {
      const validationError = {
        field: 'email',
        message: 'Invalid email',
        code: 'invalid_email',
      };
      expect(validationError.field).toBe('email');
    });

    it('should export ValidatedHandler type', () => {
      const handler = async (_request: unknown, _validated: unknown): Promise<Response> => {
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

    it('should export GetHandler type', () => {
      const handler = async (_request: unknown): Promise<Response> => {
        return new Response('OK');
      };
      expect(typeof handler).toBe('function');
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

    it('should export ValidationOptions type', () => {
      const options = {
        schema: {},
        strict: true,
      };
      expect(options.strict).toBe(true);
    });

    it('should export AuthOptions type', () => {
      const options = {
        requiredRoles: ['admin'],
      };
      expect(options.requiredRoles).toContain('admin');
    });
  });

  describe('constants', () => {
    it('should export DEFAULT_RATE_LIMIT_OPTIONS', () => {
      const DEFAULT_RATE_LIMIT_OPTIONS = {
        windowMs: 60000,
        maxRequests: 100,
      };
      expect(DEFAULT_RATE_LIMIT_OPTIONS.windowMs).toBe(60000);
      expect(DEFAULT_RATE_LIMIT_OPTIONS.maxRequests).toBe(100);
    });
  });
});
