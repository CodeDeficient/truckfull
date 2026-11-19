import { describe, expect, it } from '@jest/globals';
import { hashEmailForAnalytics } from '@/lib/privacy/emailHash';

describe('hashEmailForAnalytics', () => {
  it('produces a deterministic SHA-256 hex hash', async () => {
    const first = await hashEmailForAnalytics('user@example.com');
    const second = await hashEmailForAnalytics('user@example.com');

    expect(first).toBe(second);
    expect(first).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(first)).toBe(true);
  });

  it('trims and lowercases input before hashing', async () => {
    const trimmed = await hashEmailForAnalytics('  User@Example.COM  ');
    const canonical = await hashEmailForAnalytics('user@example.com');

    expect(trimmed).toBe(canonical);
  });

  it('produces different hashes for different emails', async () => {
    const a = await hashEmailForAnalytics('alice@example.com');
    const b = await hashEmailForAnalytics('bob@example.com');

    expect(a).not.toBe(b);
  });

  it('does not leak original email in the hash output', async () => {
    const hash = await hashEmailForAnalytics('meta-review-test@truckfull.food');

    expect(hash).not.toContain('truckfull');
    expect(hash).not.toContain('meta');
    expect(hash).not.toContain('@');
    expect(hash).not.toContain('review');
  });

  it('never returns empty string or non-hex characters', async () => {
    const emails = [
      'user@example.com',
      'test@test.test',
      'a@b.com',
      'very.long.email.address.with.many.parts@very.long.domain.example.org',
    ];

    for (const email of emails) {
      const hash = await hashEmailForAnalytics(email);
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    }
  });
});
