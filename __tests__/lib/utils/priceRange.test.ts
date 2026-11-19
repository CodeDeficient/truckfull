import { describe, expect, it } from '@jest/globals';
import {
  formatPriceRange,
  formatPriceRangeFromString,
  getAllPriceRanges,
  getPriceRangeValue,
  isValidPriceRange,
  type PriceRange,
} from '../../../lib/utils/priceRange';

describe('Price Range Utilities', () => {
  describe('formatPriceRange', () => {
    it('should map valid numbers to price range symbols', () => {
      expect(formatPriceRange(1)).toBe('$');
      expect(formatPriceRange(2)).toBe('$$');
      expect(formatPriceRange(3)).toBe('$$$');
      expect(formatPriceRange(4)).toBe('$$$$');
    });

    it('should return null for out of range numbers', () => {
      expect(formatPriceRange(0)).toBeNull();
      expect(formatPriceRange(-1)).toBeNull();
      expect(formatPriceRange(5)).toBeNull();
      expect(formatPriceRange(100)).toBeNull();
    });

    it('should return null for non-number inputs', () => {
      // @ts-expect-error Testing invalid input type
      expect(formatPriceRange('1')).toBeNull();
      // @ts-expect-error Testing invalid input type
      expect(formatPriceRange(null)).toBeNull();
      // @ts-expect-error Testing invalid input type
      expect(formatPriceRange(undefined)).toBeNull();
      // @ts-expect-error Testing invalid input type
      expect(formatPriceRange({})).toBeNull();
      // @ts-expect-error Testing invalid input type
      expect(formatPriceRange([])).toBeNull();
    });
  });

  describe('formatPriceRangeFromString', () => {
    it('should map string numbers to price range symbols', () => {
      expect(formatPriceRangeFromString('1')).toBe('$');
      expect(formatPriceRangeFromString('2')).toBe('$$');
      expect(formatPriceRangeFromString('3')).toBe('$$$');
      expect(formatPriceRangeFromString('4')).toBe('$$$$');
    });

    it('should handle whitespace and case correctly for string numbers', () => {
      expect(formatPriceRangeFromString(' 1 ')).toBe('$');
      expect(formatPriceRangeFromString('  4')).toBe('$$$$');
    });

    it('should map textual representations to price range symbols', () => {
      // Level 1: $
      expect(formatPriceRangeFromString('cheap')).toBe('$');
      expect(formatPriceRangeFromString('inexpensive')).toBe('$');
      expect(formatPriceRangeFromString('budget')).toBe('$');
      expect(formatPriceRangeFromString('affordable')).toBe('$');
      expect(formatPriceRangeFromString('low')).toBe('$');

      // Level 2: $$
      expect(formatPriceRangeFromString('moderate')).toBe('$$');
      expect(formatPriceRangeFromString('medium')).toBe('$$');
      expect(formatPriceRangeFromString('average')).toBe('$$');
      expect(formatPriceRangeFromString('mid')).toBe('$$');

      // Level 3: $$$
      expect(formatPriceRangeFromString('expensive')).toBe('$$$');
      expect(formatPriceRangeFromString('high')).toBe('$$$');
      expect(formatPriceRangeFromString('premium')).toBe('$$$');
      expect(formatPriceRangeFromString('upscale')).toBe('$$$');

      // Level 4: $$$$
      expect(formatPriceRangeFromString('luxury')).toBe('$$$$');
      expect(formatPriceRangeFromString('very expensive')).toBe('$$$$');
      expect(formatPriceRangeFromString('ultra premium')).toBe('$$$$');
      expect(formatPriceRangeFromString('high end')).toBe('$$$$');
    });

    it('should be case-insensitive and ignore leading/trailing whitespace for textual representations', () => {
      expect(formatPriceRangeFromString('CHEAP')).toBe('$');
      expect(formatPriceRangeFromString('  moderate  ')).toBe('$$');
      expect(formatPriceRangeFromString('Expensive')).toBe('$$$');
      expect(formatPriceRangeFromString('\tluxury\n')).toBe('$$$$');
    });

    it('should return null for unknown textual representations', () => {
      expect(formatPriceRangeFromString('free')).toBeNull();
      expect(formatPriceRangeFromString('priceless')).toBeNull();
      expect(formatPriceRangeFromString('unknown')).toBeNull();
      expect(formatPriceRangeFromString('')).toBeNull();
      expect(formatPriceRangeFromString('   ')).toBeNull();
    });

    it('should return null for out of range string numbers', () => {
      expect(formatPriceRangeFromString('0')).toBeNull();
      expect(formatPriceRangeFromString('5')).toBeNull();
      expect(formatPriceRangeFromString('-1')).toBeNull();
    });

    it('should return null for non-string inputs', () => {
      // @ts-expect-error Testing invalid input type
      expect(formatPriceRangeFromString(1)).toBeNull();
      // @ts-expect-error Testing invalid input type
      expect(formatPriceRangeFromString(null)).toBeNull();
      // @ts-expect-error Testing invalid input type
      expect(formatPriceRangeFromString(undefined)).toBeNull();
      // @ts-expect-error Testing invalid input type
      expect(formatPriceRangeFromString({})).toBeNull();
      // @ts-expect-error Testing invalid input type
      expect(formatPriceRangeFromString([])).toBeNull();
    });
  });

  describe('getAllPriceRanges', () => {
    it('should return an array of all available price range symbols', () => {
      const result = getAllPriceRanges();
      expect(result).toEqual(['$', '$$', '$$$', '$$$$']);
      expect(result).toHaveLength(4);
    });
  });

  describe('isValidPriceRange', () => {
    it('should return true for valid price range symbols', () => {
      expect(isValidPriceRange('$')).toBe(true);
      expect(isValidPriceRange('$$')).toBe(true);
      expect(isValidPriceRange('$$$')).toBe(true);
      expect(isValidPriceRange('$$$$')).toBe(true);
    });

    it('should return false for invalid price range symbols', () => {
      expect(isValidPriceRange('$$$$$')).toBe(false);
      expect(isValidPriceRange('$$$$$$')).toBe(false);
      expect(isValidPriceRange('')).toBe(false);
      expect(isValidPriceRange('€')).toBe(false);
      expect(isValidPriceRange('abc')).toBe(false);
    });

    it('should return false for non-string types', () => {
      expect(isValidPriceRange(1)).toBe(false);
      expect(isValidPriceRange(null)).toBe(false);
      expect(isValidPriceRange(undefined)).toBe(false);
      expect(isValidPriceRange({})).toBe(false);
      expect(isValidPriceRange([])).toBe(false);
    });
  });

  describe('getPriceRangeValue', () => {
    it('should return numeric values corresponding to valid price range symbols', () => {
      expect(getPriceRangeValue('$')).toBe(1);
      expect(getPriceRangeValue('$$')).toBe(2);
      expect(getPriceRangeValue('$$$')).toBe(3);
      expect(getPriceRangeValue('$$$$')).toBe(4);
    });

    it('should return null for invalid price range symbols', () => {
      // @ts-expect-error Testing invalid input
      expect(getPriceRangeValue('$$$$$')).toBeNull();
      // @ts-expect-error Testing invalid input
      expect(getPriceRangeValue('')).toBeNull();
      // @ts-expect-error Testing invalid input
      expect(getPriceRangeValue('abc')).toBeNull();
    });

    it('should return null for non-string inputs', () => {
      // @ts-expect-error Testing invalid input
      expect(getPriceRangeValue(1)).toBeNull();
      // @ts-expect-error Testing invalid input
      expect(getPriceRangeValue(null)).toBeNull();
      // @ts-expect-error Testing invalid input
      expect(getPriceRangeValue(undefined)).toBeNull();
    });
  });
});
