import { describe, it, expect } from '@jest/globals';
import {
  normalizeEmail,
  classifyWaitlistInsertError,
  MAX_EMAIL_LENGTH,
} from '@/lib/waitlist/waitlistApi';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com');
  });

  it('rejects non-strings', () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail(123)).toBeNull();
    expect(normalizeEmail({ email: 'a@b.co' })).toBeNull();
  });

  it('rejects empty and whitespace-only input', () => {
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail('   ')).toBeNull();
  });

  it('rejects emails over the 254-character RFC cap', () => {
    expect(MAX_EMAIL_LENGTH).toBe(254);
    const local = 'a'.repeat(MAX_EMAIL_LENGTH - '@example.com'.length);
    expect(normalizeEmail(`${local}@example.com`)).toBe(`${local}@example.com`);
    expect(normalizeEmail(`${local}x@example.com`)).toBeNull();
  });

  it('normalization makes duplicates collide (Foo@X == foo@x)', () => {
    expect(normalizeEmail('Foo@X.COM')).toBe(normalizeEmail('foo@x.com'));
  });
});

describe('classifyWaitlistInsertError', () => {
  it('unique violation (23505) is idempotent success with no notification', () => {
    const outcome = classifyWaitlistInsertError({ code: '23505' });
    expect(outcome.status).toBe(200);
    expect(outcome.body).toEqual({ success: true, duplicate: true });
    expect(outcome.notify).toBe(false);
  });

  it('other DB errors are a 500 with no notification', () => {
    const outcome = classifyWaitlistInsertError({ code: '08003' });
    expect(outcome.status).toBe(500);
    expect(outcome.body).toEqual({ error: 'Failed to join waitlist' });
    expect(outcome.notify).toBe(false);
  });

  it('a missing error code is still a 500, not a duplicate', () => {
    const outcome = classifyWaitlistInsertError({});
    expect(outcome.status).toBe(500);
    expect(outcome.notify).toBe(false);
  });
});
