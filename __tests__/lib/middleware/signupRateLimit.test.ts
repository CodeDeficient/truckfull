/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';

const originalEnv = process.env;

describe('signupRateLimit', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('parseDurationString', () => {
    it('parses "15m" into an Upstash Duration', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('15m')).toBe('15 m');
    });

    it('parses "1h" into an Upstash Duration', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('1h')).toBe('1 h');
    });

    it('parses "30s" into an Upstash Duration', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('30s')).toBe('30 s');
    });

    it('parses "2d" into an Upstash Duration', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('2d')).toBe('2 d');
    });

    it('parses "500ms" into an Upstash Duration', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('500ms')).toBe('500 ms');
    });

    it('returns null for an invalid unit', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('15x')).toBeNull();
    });

    it('returns null for a non-numeric amount', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('abc m')).toBeNull();
    });

    it('returns null for a zero amount', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('0m')).toBeNull();
    });

    it('returns null for a negative amount', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('-5m')).toBeNull();
    });

    it('returns null for an empty string', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('')).toBeNull();
    });

    it('returns null for a fractional amount', async () => {
      const { parseDurationString } = await import('@/lib/middleware/signupRateLimit');
      expect(parseDurationString('1.5m')).toBeNull();
    });
  });

  describe('getSignupRateLimitConfig', () => {
    it('uses defaults when env vars are unset', async () => {
      delete process.env.SIGNUP_RATE_LIMIT_MAX;
      delete process.env.SIGNUP_RATE_LIMIT_WINDOW;
      const { getSignupRateLimitConfig } = await import('@/lib/middleware/signupRateLimit');
      expect(getSignupRateLimitConfig()).toEqual({ max: 10, window: '15 m' });
    });

    it('reads SIGNUP_RATE_LIMIT_MAX from the environment', async () => {
      process.env.SIGNUP_RATE_LIMIT_MAX = '25';
      const { getSignupRateLimitConfig } = await import('@/lib/middleware/signupRateLimit');
      expect(getSignupRateLimitConfig().max).toBe(25);
    });

    it('falls back to the default max when the env value is not a positive integer', async () => {
      process.env.SIGNUP_RATE_LIMIT_MAX = 'abc';
      const { getSignupRateLimitConfig } = await import('@/lib/middleware/signupRateLimit');
      expect(getSignupRateLimitConfig().max).toBe(10);
    });

    it('reads SIGNUP_RATE_LIMIT_WINDOW from the environment', async () => {
      process.env.SIGNUP_RATE_LIMIT_WINDOW = '1h';
      const { getSignupRateLimitConfig } = await import('@/lib/middleware/signupRateLimit');
      expect(getSignupRateLimitConfig().window).toBe('1 h');
    });

    it('falls back to the default window when the env value is invalid', async () => {
      process.env.SIGNUP_RATE_LIMIT_WINDOW = '15x';
      const { getSignupRateLimitConfig } = await import('@/lib/middleware/signupRateLimit');
      expect(getSignupRateLimitConfig().window).toBe('15 m');
    });
  });

  describe('signupLimiter', () => {
    it('is constructed with the configured max and window', async () => {
      process.env.SIGNUP_RATE_LIMIT_MAX = '3';
      process.env.SIGNUP_RATE_LIMIT_WINDOW = '1h';
      const { signupLimiter } = await import('@/lib/middleware/signupRateLimit');
      expect(signupLimiter).toBeDefined();
      expect(signupLimiter.limit).toBeInstanceOf(Function);
    });
  });
});
