/**
 * API Helpers Tests
 *
 * Uses manual mocks for next/server and logging modules.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ZodError } from 'zod';

describe('apiHelpers', () => {
  let handleErrorResponse: (
    error: unknown,
  ) => ReturnType<typeof import('@/lib/utils/apiHelpers').handleErrorResponse>;
  let handleDeprecatedEndpoint: (
    newEndpoint: string,
    documentation: string,
  ) => ReturnType<typeof import('@/lib/utils/apiHelpers').handleDeprecatedEndpoint>;

  beforeEach(async () => {
    jest.resetModules();
    const module = await import('@/lib/utils/apiHelpers');
    handleErrorResponse = module.handleErrorResponse;
    handleDeprecatedEndpoint = module.handleDeprecatedEndpoint;
  });

  describe('handleErrorResponse', () => {
    it('should be a function', () => {
      expect(typeof handleErrorResponse).toBe('function');
    });

    it('should return status 400 for ZodError', () => {
      const zodError = new ZodError([]);
      const result = handleErrorResponse(zodError);
      expect(result.status).toBe(400);
    });

    it('should return ZodError issues in body for ZodError', async () => {
      const issues = [{ message: 'test', path: ['field'] }];
      const zodError = new ZodError(issues);
      const result = handleErrorResponse(zodError);
      const body = await result.json();
      expect(body).toEqual({ error: issues });
    });

    it('should return status 500 for generic Error', () => {
      const result = handleErrorResponse(new Error('test error'));
      expect(result.status).toBe(500);
    });

    it('should return error message for Error instance', async () => {
      const error = new Error('specific error message');
      const result = handleErrorResponse(error);
      const body = await result.json();
      expect(body).toEqual({ error: 'specific error message' });
    });

    it('should return status 500 for string error', () => {
      const result = handleErrorResponse('string error');
      expect(result.status).toBe(500);
    });

    it('should return stringified error for string', async () => {
      const result = handleErrorResponse('string error');
      const body = await result.json();
      expect(body).toEqual({ error: 'string error' });
    });

    it('should return status 500 for null', () => {
      const result = handleErrorResponse(null);
      expect(result.status).toBe(500);
    });

    it('should return "null" string for null error', async () => {
      const result = handleErrorResponse(null);
      const body = await result.json();
      expect(body).toEqual({ error: 'null' });
    });

    it('should return status 500 for undefined', () => {
      const result = handleErrorResponse(undefined);
      expect(result.status).toBe(500);
    });

    it('should return "undefined" string for undefined error', async () => {
      const result = handleErrorResponse(undefined);
      const body = await result.json();
      expect(body).toEqual({ error: 'undefined' });
    });

    it('should handle unknown error type', () => {
      const result = handleErrorResponse({ code: 500 });
      expect(result.status).toBe(500);
    });

    it('should handle number error', async () => {
      const result = handleErrorResponse(42);
      const body = await result.json();
      expect(body).toEqual({ error: '42' });
    });
  });

  describe('handleDeprecatedEndpoint', () => {
    it('should be a function', () => {
      expect(typeof handleDeprecatedEndpoint).toBe('function');
    });

    it('should return status 410', () => {
      const result = handleDeprecatedEndpoint('/api/v2', 'https://docs.example.com');
      expect(result.status).toBe(410);
    });

    it('should return not ok', () => {
      const result = handleDeprecatedEndpoint('/api/v2', 'https://docs.example.com');
      expect(result.ok).toBe(false);
    });

    it('should include deprecation info in body', async () => {
      const result = handleDeprecatedEndpoint('/api/v2', 'https://docs.example.com');
      const body = await result.json();
      expect(body.status).toBe('DEPRECATED');
      expect(body.message).toBe('This endpoint has been consolidated into /api/v2');
      expect(body.migration.newEndpoint).toBe('/api/v2');
      expect(body.migration.documentation).toBe('https://docs.example.com');
      expect(body.migration.deprecationDate).toBe('2024-12-09');
      expect(body.migration.removalDate).toBe('2025-01-01');
    });

    it('should handle different endpoints', async () => {
      const result = handleDeprecatedEndpoint('/api/v3/users', 'https://docs.example.com/v3');
      const body = await result.json();
      expect(body.message).toBe('This endpoint has been consolidated into /api/v3/users');
      expect(body.migration.newEndpoint).toBe('/api/v3/users');
    });
  });
});
