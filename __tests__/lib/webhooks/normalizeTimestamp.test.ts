import { describe, it, expect } from '@jest/globals';
import { normalizeTimestamp } from '@/lib/webhooks/normalizeTimestamp';

describe('normalizeTimestamp', () => {
  it('converts Unix seconds to ISO string', () => {
    const result = normalizeTimestamp('1785178737');
    expect(result).toBe('2026-07-27T18:58:57.000Z');
  });

  it('converts numeric Unix seconds to ISO string', () => {
    const result = normalizeTimestamp('1700000000');
    expect(result).toBe('2023-11-14T22:13:20.000Z');
  });

  it('converts numeric runtime input to ISO string', () => {
    expect(normalizeTimestamp(1700000000)).toBe('2023-11-14T22:13:20.000Z');
  });

  it('preserves valid ISO timestamp', () => {
    const result = normalizeTimestamp('2026-07-27T18:58:57.000Z');
    expect(result).toBe('2026-07-27T18:58:57.000Z');
  });

  it('preserves ISO timestamp with timezone offset', () => {
    const result = normalizeTimestamp('2026-07-27T14:58:57-04:00');
    expect(result).toBe('2026-07-27T18:58:57.000Z');
  });

  it('returns null for null', () => {
    expect(normalizeTimestamp(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normalizeTimestamp(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeTimestamp('')).toBeNull();
  });

  it('returns null for invalid string', () => {
    expect(normalizeTimestamp('not-a-date')).toBeNull();
  });

  it('returns null for an out-of-range numeric timestamp', () => {
    expect(normalizeTimestamp('1e20')).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(normalizeTimestamp('   ')).toBeNull();
  });

  it('returns null for unsupported runtime input', () => {
    expect(normalizeTimestamp({})).toBeNull();
  });
});
