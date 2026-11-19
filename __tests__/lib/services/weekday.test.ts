import { describe, expect, it } from '@jest/globals';
import {
  canonicalizeWeekday,
  hasCanonicalWeekdaySet,
  normalizeWeekdaySet,
} from '@/lib/services/weekday';

describe('weekday canonicalization', () => {
  it('normalizes full names and writer-supported abbreviations', () => {
    expect(canonicalizeWeekday(' Monday ')).toBe('monday');
    expect(canonicalizeWeekday('Mon')).toBe('monday');
    expect(hasCanonicalWeekdaySet(['Mon', 'tue'])).toBe(true);
  });

  it('uses the owner-resolution aliases across the active path', () => {
    expect(normalizeWeekdaySet(['Tues', ' weds ', 'THURS'])).toEqual([
      'tuesday',
      'wednesday',
      'thursday',
    ]);
  });

  it('fails closed instead of returning a partial normalized set', () => {
    expect(normalizeWeekdaySet(['monday', 'someday'])).toBeNull();
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'rejects inherited object-property name %s',
    (value) => {
      expect(canonicalizeWeekday(value)).toBeNull();
      expect(hasCanonicalWeekdaySet([value])).toBe(false);
    },
  );
});
