import { describe, it, expect } from '@jest/globals';
import { formatEventDate, parseEventDate, getEventMonth } from '@/lib/events/dateUtils';

describe('formatEventDate', () => {
  it('displays correct date regardless of timezone', () => {
    expect(formatEventDate('2026-04-17')).toMatch(/Apr 17, 2026/);
    expect(formatEventDate('2026-04-16')).toMatch(/Apr 16, 2026/);
    expect(formatEventDate('2026-01-01')).toMatch(/Jan 1, 2026/);
    expect(formatEventDate('2026-12-31')).toMatch(/Dec 31, 2026/);
  });

  it('handles single-digit months and days', () => {
    expect(formatEventDate('2026-03-05')).toMatch(/Mar 5, 2026/);
    expect(formatEventDate('2026-09-01')).toMatch(/Sep 1, 2026/);
  });
});

describe('parseEventDate', () => {
  it('creates correct local date from ISO date string', () => {
    const date = parseEventDate('2026-04-17');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(17);
  });

  it('does not shift date in negative UTC offsets', () => {
    const date = parseEventDate('2026-04-17');
    expect(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).toBe('Apr 17');
  });
});

describe('getEventMonth', () => {
  it('extracts correct month name', () => {
    expect(getEventMonth('2026-04-17')).toBe('apr');
    expect(getEventMonth('2026-01-15')).toBe('jan');
    expect(getEventMonth('2026-12-25')).toBe('dec');
  });
});
