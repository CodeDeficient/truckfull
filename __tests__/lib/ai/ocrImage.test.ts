import { describe, it, expect } from '@jest/globals';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import { hasReadableText, shouldProcessImage } from '@/lib/ai/ocrImage';

describe('ocrImage - pure functions', () => {
  describe('hasReadableText', () => {
    it('returns true when confidence >= 0.7 and has food_items', () => {
      const result = { confidence: 0.8, food_items: ['tacos'] };
      expect(hasReadableText(result)).toBe(true);
    });

    it('returns true when confidence >= 0.7 and has location', () => {
      const result = { confidence: 0.8, food_items: [], location: { address: '123 Main' } };
      expect(hasReadableText(result)).toBe(true);
    });

    it('returns true when confidence >= 0.7 and has times', () => {
      const result = { confidence: 0.8, food_items: [], times: { start: '11am' } };
      expect(hasReadableText(result)).toBe(true);
    });

    it('returns true when confidence >= 0.7 and has prices', () => {
      const result = {
        confidence: 0.8,
        food_items: [],
        prices: [{ item: 'taco', price: 5 }],
      };
      expect(hasReadableText(result)).toBe(true);
    });

    it('returns false when confidence < 0.7', () => {
      const result = { confidence: 0.6, food_items: ['tacos'] };
      expect(hasReadableText(result)).toBe(false);
    });

    it('returns false when confidence >= 0.7 but no data', () => {
      const result = { confidence: 0.8, food_items: [] };
      expect(hasReadableText(result)).toBe(false);
    });

    it('returns false when confidence >= 0.7 but empty prices', () => {
      const result = { confidence: 0.8, food_items: [], prices: [] };
      expect(hasReadableText(result)).toBe(false);
    });

    it('returns false when confidence < 0.7 with location', () => {
      const result = { confidence: 0.5, food_items: [], location: { address: '123 Main' } };
      expect(hasReadableText(result)).toBe(false);
    });

    it('handles undefined prices gracefully', () => {
      const result = { confidence: 0.8, food_items: ['tacos'], prices: undefined };
      expect(hasReadableText(result)).toBe(true);
    });
  });

  describe('shouldProcessImage', () => {
    it('returns true when has readable text', () => {
      const result = { confidence: 0.8, food_items: ['tacos'] };
      expect(shouldProcessImage(result)).toBe(true);
    });

    it('returns false when not readable', () => {
      const result = { confidence: 0.5, food_items: [] };
      expect(shouldProcessImage(result)).toBe(false);
    });

    it('returns false when confidence high but no data', () => {
      const result = { confidence: 0.85, food_items: [] };
      expect(shouldProcessImage(result)).toBe(false);
    });

    it('returns true when has only location', () => {
      const result = { confidence: 0.9, food_items: [], location: { address: '123 Main' } };
      expect(shouldProcessImage(result)).toBe(true);
    });
  });
});

describe('ocrImage - URL and type validation', () => {
  function isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function isValidImageType(type: string): type is 'story' | 'photo' {
    return type === 'story' || type === 'photo';
  }

  describe('isValidImageUrl', () => {
    it('returns true for valid https URL', () => {
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('returns true for valid http URL', () => {
      expect(isValidImageUrl('http://example.com/image.jpg')).toBe(true);
    });

    it('returns false for invalid URL', () => {
      expect(isValidImageUrl('not-a-url')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidImageUrl('')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isValidImageUrl(null as unknown as string)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidImageUrl(undefined as unknown as string)).toBe(false);
    });

    it('returns false for ftp protocol', () => {
      expect(isValidImageUrl('ftp://example.com/image.jpg')).toBe(false);
    });
  });

  describe('isValidImageType', () => {
    it('returns true for story', () => {
      expect(isValidImageType('story')).toBe(true);
    });

    it('returns true for photo', () => {
      expect(isValidImageType('photo')).toBe(true);
    });

    it('returns false for invalid type', () => {
      expect(isValidImageType('video' as 'story')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidImageType('')).toBe(false);
    });
  });
});