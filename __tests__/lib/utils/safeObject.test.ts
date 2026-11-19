import { describe, it, expect } from '@jest/globals';
import { safe } from '@/lib/utils/safeObject';

describe('safeObject utility', () => {
  describe('safe()', () => {
    it('returns the same object when a valid object is passed', () => {
      const input = { key: 'value', num: 42 };
      const result = safe(input);
      expect(result).toEqual(input);
      expect(result).toBe(input); // strict equality
    });

    it('returns an empty object when null is passed', () => {
      const result = safe(null);
      expect(result).toEqual({});
    });

    it('returns an empty object when undefined is passed', () => {
      const result = safe(undefined);
      expect(result).toEqual({});
    });

    it('allows safe destructuring of properties from a valid object', () => {
      const contactInfo = { phone: '123-456', email: 'test@example.com' };
      const { phone, email } = safe(contactInfo);
      expect(phone).toBe('123-456');
      expect(email).toBe('test@example.com');
    });

    it('allows safe destructuring from null without throwing', () => {
      const contactInfo: { phone?: string; email?: string } | null = null;
      const { phone, email } = safe(contactInfo);
      expect(phone).toBeUndefined();
      expect(email).toBeUndefined();
    });

    it('allows safe destructuring from undefined without throwing', () => {
      const contactInfo: { phone?: string; email?: string } | undefined = undefined;
      const { phone, email } = safe(contactInfo);
      expect(phone).toBeUndefined();
      expect(email).toBeUndefined();
    });

    it('handles nested safe calls', () => {
      const truck: { social_media?: { instagram?: string } | null } = { social_media: null };
      const { instagram } = safe(safe(truck).social_media);
      expect(instagram).toBeUndefined();
    });
  });
});
