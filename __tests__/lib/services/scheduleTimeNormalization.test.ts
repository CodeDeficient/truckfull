import { describe, expect, it } from '@jest/globals';
import { normalizeOverrideTime } from '@/lib/services/scheduleOverride';

describe('schedule time normalization', () => {
  it('normalizes PostgreSQL TIME values with seconds', () => {
    expect(normalizeOverrideTime('17:00:00')).toBe('17:00');
    expect(normalizeOverrideTime('09:30:45')).toBe('09:30');
  });

  it('keeps fresh browser time input equivalent to persisted input', () => {
    expect(normalizeOverrideTime('17:00')).toBe(normalizeOverrideTime('17:00:00'));
  });
});
