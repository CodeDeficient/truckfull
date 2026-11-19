import { isDefined, isNonEmptyString } from '@/lib/utils/predicates';

describe('Predicate Utilities', () => {
  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined('string')).toBe(true);
      expect(isDefined(42)).toBe(true);
      expect(isDefined({})).toBe(true);
      expect(isDefined([])).toBe(true);
      expect(isDefined(true)).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true); // Empty string is defined
    });

    it('should return false for null and undefined', () => {
      expect(isDefined(null)).toBe(false);
      expect(isDefined(undefined)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('a')).toBe(true);
      expect(isNonEmptyString('123')).toBe(true);
      expect(isNonEmptyString('   ')).toBe(true); // spaces are still non-empty
      expect(isNonEmptyString('0')).toBe(true); // zero as string is non-empty
    });

    it('should return false for non-strings', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
      expect(isNonEmptyString(true)).toBe(false);
      expect(isNonEmptyString(false)).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
    });
  });
});
