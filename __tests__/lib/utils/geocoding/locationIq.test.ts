import { sanitizeAddress, isLocationIQAvailable } from '@/lib/utils/geocoding/locationIq';

describe('locationIQ pure functions', () => {
  describe('sanitizeAddress', () => {
    it('returns trimmed address for valid input', () => {
      expect(sanitizeAddress('  123 Main St  ')).toBe('123 Main St');
    });

    it('returns null for empty string', () => {
      expect(sanitizeAddress('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(sanitizeAddress('   ')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(sanitizeAddress(null as unknown as string)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(sanitizeAddress(undefined as unknown as string)).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(sanitizeAddress(123 as unknown as string)).toBeNull();
    });

    it('returns null for addresses exceeding max length', () => {
      const longAddress = 'a'.repeat(501);
      expect(sanitizeAddress(longAddress)).toBeNull();
    });

    it('accepts address at max length', () => {
      const maxAddress = 'a'.repeat(500);
      expect(sanitizeAddress(maxAddress)).toHaveLength(500);
    });
  });

  describe('isLocationIQAvailable', () => {
    it('returns boolean based on API key', () => {
      const result = isLocationIQAvailable();
      expect(typeof result).toBe('boolean');
    });
  });
});
