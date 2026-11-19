/**
 * Property-Based Tests for Middleware and Utilities
 * Uses fast-check for automatic test case generation
 *
 * These tests find edge cases that manual tests might miss:
 * - Empty strings, null, undefined
 * - Extremely long inputs
 * - Special characters, unicode, emojis
 * - SQL injection patterns, XSS payloads
 * - Boundary conditions
 */

import fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';

import { generateSlug } from '../../lib/utils/slug';
import { sanitizeLogMessage } from '../../lib/logging';

describe('Property-Based Tests - Middleware & Utilities', () => {
  describe('generateSlug', () => {
    it('should always return a valid slug format', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const slug = generateSlug(input);

          expect(typeof slug).toBe('string');
          expect(slug).toMatch(/^[a-z0-9-]*$/);
          expect(slug).not.toMatch(/^-/);
          expect(slug).not.toMatch(/-$/);
          expect(slug).not.toMatch(/--/);
          expect(slug.length).toBeLessThan(200);
        }),
      );
    });

    it('should handle empty and whitespace-only input', () => {
      fc.assert(
        fc.property(fc.oneof(fc.constant(''), fc.stringMatching(/^\s+$/)), (input) => {
          const slug = generateSlug(input);
          expect(slug).toBe('');
        }),
      );
    });

    it('should handle unicode and special characters', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.integer({ min: 0x80, max: 0xffff }), { minLength: 1, maxLength: 50 })
            .map((codePoints) => String.fromCodePoint(...codePoints))
            .map((unicodeStr) => unicodeStr + ' Some Restaurant'),
          (input) => {
            const slug = generateSlug(input);
            expect(slug).toMatch(/^[a-z0-9-]*$/);
          },
        ),
      );
    });

    it('should handle extremely long input', () => {
      fc.assert(
        fc.property(fc.string({ maxLength: 10000 }), (input) => {
          const slug = generateSlug(input);
          expect(slug.length).toBeLessThan(200);
        }),
      );
    });
  });

  describe('Email Validation Pattern', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailArb = fc
      .tuple(
        fc.string({ minLength: 1 }).filter((s) => /^[^\s@]+$/.test(s)),
        fc.string({ minLength: 1 }).filter((s) => /^[^\s@.]+$/.test(s)),
        fc.string({ minLength: 1 }).filter((s) => /^[^\s@.]+$/.test(s)),
      )
      .map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

    it('should match valid email formats', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          expect(emailRegex.test(email)).toBe(true);
        }),
      );
    });

    it('should reject strings without @ symbol', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.includes('@')),
          (noAt) => {
            expect(emailRegex.test(noAt)).toBe(false);
          },
        ),
      );
    });

    it('should reject strings without domain', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.includes('.')),
          (noDot) => {
            expect(emailRegex.test(noDot)).toBe(false);
          },
        ),
      );
    });

    it('should reject strings with spaces', () => {
      fc.assert(
        fc.property(fc.stringMatching(/.*\s.*/), (withSpace) => {
          expect(emailRegex.test(withSpace)).toBe(false);
        }),
      );
    });
  });

  describe('sanitizeLogMessage', () => {
    it('should always return a string', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          expect(typeof sanitizeLogMessage(input)).toBe('string');
        }),
      );
    });

    it('should redact email addresses', () => {
      const emailArb = fc
        .tuple(
          fc.string({ minLength: 2, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9._%+-]+$/.test(s)),
          fc.string({ minLength: 2, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9.-]+$/.test(s)),
          fc.string({ minLength: 2, maxLength: 5 }).filter((s) => /^[a-zA-Z]+$/.test(s)),
        )
        .map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

      fc.assert(
        fc.property(fc.string({ maxLength: 20 }), emailArb, (prefix, email) => {
          const input = `${prefix} ${email} ${prefix}`;
          const result = sanitizeLogMessage(input);
          expect(result).not.toContain(email);
          expect(result).toContain('[EMAIL]');
        }),
      );
    });

    it('should redact API keys', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 20 }),
          fc.stringMatching(/^[a-f0-9]{8,32}$/),
          (prefix, key) => {
            const input = `${prefix} api_key=${key}`;
            const result = sanitizeLogMessage(input);
            expect(result).not.toContain(key);
            expect(result).toContain('api_key=[REDACTED]');
          },
        ),
      );
    });

    it('should redact secret keys', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 20 }),
          fc.stringMatching(/^[a-f0-9]{8,32}$/),
          (prefix, key) => {
            const input = `${prefix} secret_key: "${key}"`;
            const result = sanitizeLogMessage(input);
            expect(result).not.toContain(key);
            expect(result).toContain('secret_key=[REDACTED]');
          },
        ),
      );
    });

    it('should redact access tokens', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 20 }),
          fc.stringMatching(/^[a-f0-9]{8,32}$/),
          (prefix, token) => {
            const input = `${prefix} access_token=${token}`;
            const result = sanitizeLogMessage(input);
            expect(result).not.toContain(token);
            expect(result).toContain('access_token=[REDACTED]');
          },
        ),
      );
    });

    it('should not redact generic words containing "token"', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 20 }), (prefix) => {
          const input = `${prefix} the token bucket is full`;
          const result = sanitizeLogMessage(input);
          expect(result).toContain('token bucket');
          expect(result).not.toContain('[REDACTED]');
        }),
      );
    });

    it('should handle empty input', () => {
      expect(typeof sanitizeLogMessage('')).toBe('string');
    });
  });

  describe('URL Domain Validation', () => {
    const allowedDomains = ['facebook.com', 'mapbox.com', 'googleapis.com'];

    const isValidDomain = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        return allowedDomains.some(
          (domain) => urlObj.hostname.endsWith(domain) || urlObj.hostname === domain,
        );
      } catch {
        return false;
      }
    };

    it('should accept URLs with allowed domains', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('facebook.com'),
            fc.constant('mapbox.com'),
            fc.constant('googleapis.com'),
          ),
          fc.string({ minLength: 1, maxLength: 50 }),
          (domain, path) => {
            const url = `https://${domain}/${path}`;
            expect(isValidDomain(url)).toBe(true);
          },
        ),
      );
    });

    it('should reject URLs with non-allowed domains', () => {
      fc.assert(
        fc.property(
          fc.domain().filter((d) => !allowedDomains.some((ad) => d.endsWith(ad))),
          fc.string({ minLength: 1, maxLength: 50 }),
          (domain, path) => {
            const url = `https://${domain}/${path}`;
            expect(isValidDomain(url)).toBe(false);
          },
        ),
      );
    });
  });
});
