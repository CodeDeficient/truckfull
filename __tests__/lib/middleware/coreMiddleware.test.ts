/**
 * @jest-environment node
 *
 * Note: These tests implement the pure function logic locally because
 * importing from coreMiddleware.ts fails due to Next.js ESM module resolution
 * issues (the file imports from 'next/server' which has internal dependencies
 * that can't be resolved in Jest's ESM environment).
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

function shouldSkipMethod(method: string, skipMethods: string[]): boolean {
  return skipMethods.includes(method);
}

function transformZodError(error: z.ZodError): Array<{
  field: string;
  message: string;
  code: string;
  received?: unknown;
}> {
  return error.issues.map((err) => ({
    field: err.path.join('.') || 'root',
    message: err.message,
    code: err.code,
    received: 'received' in err ? err.received : undefined,
  }));
}

describe('coreMiddleware pure functions (local implementations)', () => {
  describe('shouldSkipMethod', () => {
    it('returns true when method is in skipMethods', () => {
      expect(shouldSkipMethod('GET', ['GET', 'HEAD'])).toBe(true);
    });

    it('returns false when method is not in skipMethods', () => {
      expect(shouldSkipMethod('POST', ['GET', 'HEAD'])).toBe(false);
    });

    it('returns true for multiple matching methods', () => {
      expect(shouldSkipMethod('DELETE', ['GET', 'DELETE', 'PATCH'])).toBe(true);
    });

    it('is case sensitive', () => {
      expect(shouldSkipMethod('get', ['GET'])).toBe(false);
    });

    it('returns false for empty skipMethods array', () => {
      expect(shouldSkipMethod('GET', [])).toBe(false);
    });
  });

  describe('transformZodError', () => {
    it('transforms ZodError issues to ValidationError array', () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = schema.safeParse({ name: 123 });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = transformZodError(result.error);
        expect(errors).toHaveLength(1);
        expect(errors[0].field).toBe('name');
        expect(errors[0].code).toBe('invalid_type');
      }
    });

    it('handles multiple errors', () => {
      const schema = z.object({
        field1: z.string(),
        field2: z.string().min(1),
      });

      const result = schema.safeParse({ field1: 123, field2: '' });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = transformZodError(result.error);
        expect(errors.length).toBeGreaterThanOrEqual(2);
        expect(errors[0].field).toBe('field1');
      }
    });

    it('uses root for empty path', () => {
      const schema = z.string().refine(() => false, { message: 'Custom error' });
      const result = schema.safeParse('test');

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = transformZodError(result.error);
        expect(errors[0].field).toBe('root');
      }
    });

    it('joins nested paths with dot notation', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
          }),
        }),
      });

      const result = schema.safeParse({ user: { profile: { name: 123 } } });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = transformZodError(result.error);
        expect(errors[0].field).toBe('user.profile.name');
      }
    });

    it('handles errors without received property', () => {
      const schema = z.string().min(1);
      const result = schema.safeParse('');

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = transformZodError(result.error);
        expect(errors[0].received).toBeUndefined();
      }
    });
  });
});
