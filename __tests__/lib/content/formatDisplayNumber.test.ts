import { describe, expect, it } from '@jest/globals';
import { formatDisplayNumber } from '@/lib/content/metrics';

describe('formatDisplayNumber', () => {
  it.each([
    [0, '0+'],
    [7, '5+'],
    [258, '255+'],
    [999, '995+'],
    [1000, '1000+'],
    [3512, '3000+'],
    [4999, '4000+'],
  ])('shows %i as %s', (input, expected) => {
    expect(formatDisplayNumber(input)).toBe(expected);
  });
});
