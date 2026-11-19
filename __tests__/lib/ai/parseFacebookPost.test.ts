import { describe, it, expect } from '@jest/globals';
import { isConfidenceAcceptable, hasExtractableData, formatConfidence } from '@/lib/ai/parseFacebookPost';

describe('parseFacebookPost - pure functions', () => {
  describe('isConfidenceAcceptable', () => {
    it('returns true for confidence >= 0.7', () => {
      expect(isConfidenceAcceptable(0.7)).toBe(true);
      expect(isConfidenceAcceptable(0.8)).toBe(true);
      expect(isConfidenceAcceptable(0.9)).toBe(true);
      expect(isConfidenceAcceptable(1.0)).toBe(true);
    });

    it('returns false for confidence < 0.7', () => {
      expect(isConfidenceAcceptable(0.69)).toBe(false);
      expect(isConfidenceAcceptable(0.5)).toBe(false);
      expect(isConfidenceAcceptable(0.0)).toBe(false);
    });
  });

  describe('hasExtractableData', () => {
    it('returns true when has food_items', () => {
      const post = { food_items: ['tacos'], confidence: 0.8 };
      expect(hasExtractableData(post)).toBe(true);
    });

    it('returns true when has location', () => {
      const post = { food_items: [], location: { address: '123 Main' }, confidence: 0.8 };
      expect(hasExtractableData(post)).toBe(true);
    });

    it('returns true when has times', () => {
      const post = { food_items: [], times: { start: '11am' }, confidence: 0.8 };
      expect(hasExtractableData(post)).toBe(true);
    });

    it('returns true when has prices with items', () => {
      const post = { food_items: [], prices: [{ item: 'taco', price: 5 }], confidence: 0.8 };
      expect(hasExtractableData(post)).toBe(true);
    });

    it('returns false when no extractable data', () => {
      const post = { food_items: [], confidence: 0.8 };
      expect(hasExtractableData(post)).toBe(false);
    });

    it('returns false when prices is empty array', () => {
      const post = { food_items: [], prices: [], confidence: 0.8 };
      expect(hasExtractableData(post)).toBe(false);
    });

    it('returns false when prices is undefined', () => {
      const post = { food_items: [], confidence: 0.8 };
      expect(hasExtractableData(post)).toBe(false);
    });
  });

  describe('formatConfidence', () => {
    it('returns "high" for confidence >= 0.9', () => {
      expect(formatConfidence(0.9)).toBe('high');
      expect(formatConfidence(0.95)).toBe('high');
      expect(formatConfidence(1.0)).toBe('high');
    });

    it('returns "medium" for confidence >= 0.7 and < 0.9', () => {
      expect(formatConfidence(0.7)).toBe('medium');
      expect(formatConfidence(0.75)).toBe('medium');
      expect(formatConfidence(0.89)).toBe('medium');
    });

    it('returns "low" for confidence < 0.7', () => {
      expect(formatConfidence(0.69)).toBe('low');
      expect(formatConfidence(0.5)).toBe('low');
      expect(formatConfidence(0.0)).toBe('low');
    });
  });
});