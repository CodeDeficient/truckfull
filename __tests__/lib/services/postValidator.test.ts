import { describe, it, expect } from '@jest/globals';
import { shouldUpdateData, VALIDATION_CONFIG } from '@/lib/services/postValidator';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import { PostType, type Classification } from '@/lib/services/postClassifier';

describe('postValidator', () => {
  const createMockOcrResult = (overrides?: Partial<ParsedPost>): ParsedPost => ({
    food_items: [],
    location: undefined,
    times: undefined,
    confidence: 0.8,
    ...overrides,
  });

  const createMockClassification = (overrides?: Partial<Classification>): Classification => ({
    type: PostType.MENU,
    confidence: 0.8,
    reason: 'Test reason',
    ...overrides,
  });

  describe('VALIDATION_CONFIG', () => {
    it('should have correct threshold values', () => {
      expect(VALIDATION_CONFIG.minConfidence).toBe(0.5);
      expect(VALIDATION_CONFIG.warnConfidence).toBe(0.7);
    });
  });

  describe('shouldUpdateData', () => {
    describe('UNRELATED posts', () => {
      it('should return shouldUpdate=false for UNRELATED posts', () => {
        const ocr = createMockOcrResult();
        const classification = createMockClassification({ type: PostType.UNRELATED });

        const result = shouldUpdateData(ocr, classification);

        expect(result.shouldUpdate).toBe(false);
        expect(result.requiresConfirmation).toBe(false);
        expect(result.reason).toBe(classification.reason);
      });
    });

    describe('AMBIGUOUS posts', () => {
      it('should return shouldUpdate=false and requiresConfirmation=true for AMBIGUOUS posts', () => {
        const ocr = createMockOcrResult();
        const classification = createMockClassification({ type: PostType.AMBIGUOUS });

        const result = shouldUpdateData(ocr, classification);

        expect(result.shouldUpdate).toBe(false);
        expect(result.requiresConfirmation).toBe(true);
        expect(result.reason).toBe(classification.reason);
      });
    });

    describe('confidence threshold', () => {
      it('should reject when confidence is below minConfidence', () => {
        const ocr = createMockOcrResult({ food_items: [{ name: 'Tacos', price: 5 }] });
        const classification = createMockClassification({
          type: PostType.MENU,
          confidence: 0.4,
        });

        const result = shouldUpdateData(ocr, classification);

        expect(result.shouldUpdate).toBe(false);
        expect(result.requiresConfirmation).toBe(true);
        expect(result.warning).toBe('Please confirm this post before we apply it.');
      });

      it('should warn when confidence is between min and warn thresholds', () => {
        const ocr = createMockOcrResult({ food_items: [{ name: 'Tacos', price: 5 }] });
        const classification = createMockClassification({
          type: PostType.MENU,
          confidence: 0.6,
        });

        const result = shouldUpdateData(ocr, classification);

        expect(result.shouldUpdate).toBe(true);
        expect(result.requiresConfirmation).toBe(true);
        expect(result.warning).toBe('Please confirm this post before we apply it.');
      });
    });

    describe('data validation', () => {
      it('should reject when no valid data to update', () => {
        const ocr = createMockOcrResult({ food_items: [], location: undefined });
        const classification = createMockClassification({
          type: PostType.MENU,
          confidence: 0.9,
        });

        const result = shouldUpdateData(ocr, classification);

        expect(result.shouldUpdate).toBe(false);
        expect(result.requiresConfirmation).toBe(false);
        expect(result.reason).toBe('No valid data to update');
      });

      it('should allow update when food_items exist', () => {
        const ocr = createMockOcrResult({ food_items: [{ name: 'Tacos', price: 5 }] });
        const classification = createMockClassification({
          type: PostType.MENU,
          confidence: 0.9,
        });

        const result = shouldUpdateData(ocr, classification);

        expect(result.shouldUpdate).toBe(true);
        expect(result.requiresConfirmation).toBe(false);
      });

      it('should allow update when location exists', () => {
        const ocr = createMockOcrResult({ location: { address: '123 Main St', fuzzy: false } });
        const classification = createMockClassification({
          type: PostType.LOCATION,
          confidence: 0.9,
        });

        const result = shouldUpdateData(ocr, classification);

        expect(result.shouldUpdate).toBe(true);
        expect(result.requiresConfirmation).toBe(false);
      });
    });

    describe('high confidence updates', () => {
      it('should allow update without confirmation for high confidence', () => {
        const ocr = createMockOcrResult({ food_items: [{ name: 'Tacos', price: 5 }] });
        const classification = createMockClassification({
          type: PostType.MENU,
          confidence: 0.85,
        });

        const result = shouldUpdateData(ocr, classification);

        expect(result.shouldUpdate).toBe(true);
        expect(result.requiresConfirmation).toBe(false);
        expect(result.warning).toBeUndefined();
      });

      it('should include warning message for warn confidence threshold', () => {
        const ocr = createMockOcrResult({ food_items: [{ name: 'Tacos', price: 5 }] });
        const classification = createMockClassification({
          type: PostType.MENU,
          confidence: 0.65,
        });

        const result = shouldUpdateData(ocr, classification);

        expect(result.warning).toBe('Please confirm this post before we apply it.');
      });
    });
  });
});