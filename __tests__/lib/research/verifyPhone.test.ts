import { describe, it, expect } from '@jest/globals';
import { normalizePhone } from '@/lib/research/verifyPhone';

describe('verifyPhone', () => {
  describe('normalizePhone', () => {
    it('strips all non-digit characters', () => {
      expect(normalizePhone('(828) 555-1234')).toBe('8285551234');
    });

    it('handles already-clean digits', () => {
      expect(normalizePhone('8285551234')).toBe('8285551234');
    });

    it('handles international format', () => {
      expect(normalizePhone('+1-828-555-1234')).toBe('18285551234');
    });

    it('handles empty string', () => {
      expect(normalizePhone('')).toBe('');
    });

    it('handles text with no digits', () => {
      expect(normalizePhone('call us')).toBe('');
    });

    it('handles phone with extension', () => {
      expect(normalizePhone('828-555-1234 ext 5')).toBe('82855512345');
    });
  });
});
