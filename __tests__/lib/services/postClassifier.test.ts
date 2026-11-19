import { describe, it, expect } from '@jest/globals';
import { classifyPost, PostType, type Classification } from '@/lib/services/postClassifier';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import type { TextBasedData } from '@/lib/services/textExtractor';

describe('postClassifier', () => {
  const createBaseOcrResult = (): ParsedPost => ({
    food_items: [],
    location: undefined,
    times: undefined,
    confidence: 0.8,
  });

  const createBaseTextData = (): TextBasedData => ({
    location: undefined,
    mentions: [],
    hashtags: [],
    times: undefined,
  });

  describe('UNRELATED Posts', () => {
    it('should classify posts with gratitude keywords and no business context as UNRELATED', () => {
      const result = classifyPost(
        createBaseOcrResult(),
        createBaseTextData(),
        'Thank you for your support!',
      );
      expect(result.type).toBe(PostType.UNRELATED);
      expect(result.reason).toContain('gratitude');
    });

    it('should classify posts with meme phrases as UNRELATED', () => {
      const result = classifyPost(createBaseOcrResult(), createBaseTextData(), 'want to help');
      expect(result.type).toBe(PostType.UNRELATED);
      expect(result.reason).toContain('gratitude'); // Reason uses generic message
    });

    it('should classify posts with event phrases and no food/location as UNRELATED', () => {
      const result = classifyPost(
        createBaseOcrResult(),
        createBaseTextData(),
        'excited to be participating',
      );
      expect(result.type).toBe(PostType.UNRELATED);
    });

    it('should classify posts with regex patterns like happy holidays as UNRELATED', () => {
      const result = classifyPost(createBaseOcrResult(), createBaseTextData(), 'Merry Christmas!');
      expect(result.type).toBe(PostType.UNRELATED);
    });

    it('should classify posts with no extractable data as UNRELATED', () => {
      // Message without any unrelated keywords, but no OCR/text data
      const result = classifyPost(
        createBaseOcrResult(),
        createBaseTextData(),
        'Just a random message here.',
      );
      expect(result.type).toBe(PostType.UNRELATED);
      expect(result.confidence).toBe(0.95);
      expect(result.reason).toContain('No extractable business data found');
    });
  });

  describe('Business Updates', () => {
    it('should classify posts with only food items as MENU', () => {
      const ocr = createBaseOcrResult();
      ocr.food_items = [{ name: 'Tacos', price: 5 }];
      const result = classifyPost(ocr, createBaseTextData(), 'We have tacos!');

      expect(result.type).toBe(PostType.MENU);
      expect(result.reason).toContain('Menu update');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should classify posts with only location as LOCATION', () => {
      const ocr = createBaseOcrResult();
      ocr.location = { address: '123 Main St', fuzzy: false };
      const result = classifyPost(ocr, createBaseTextData(), 'Find us here');

      expect(result.type).toBe(PostType.LOCATION);
      expect(result.reason).toContain('Location update');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should classify posts with multiple data types as MIXED', () => {
      const ocr = createBaseOcrResult();
      ocr.food_items = [{ name: 'Burgers', price: 10 }];
      ocr.location = { address: '456 Oak St', fuzzy: false };
      const result = classifyPost(ocr, createBaseTextData(), 'Burgers at Oak St');

      expect(result.type).toBe(PostType.MIXED);
      expect(result.reason).toContain('Mixed update');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should classify posts with times and food as MIXED', () => {
      const ocr = createBaseOcrResult();
      ocr.times = { start: '11:00', end: '14:00', scope: 'recurring_weekly' };
      ocr.food_items = [{ name: 'Tacos', price: 5 }];
      const result = classifyPost(ocr, createBaseTextData(), 'Tacos today 11-2');

      expect(result.type).toBe(PostType.MIXED);
      expect(result.reason).toContain('Mixed update');
      expect(result.reason).toContain('times');
    });

    it('should classify posts with times and location as MIXED', () => {
      const ocr = createBaseOcrResult();
      ocr.times = { start: '11:00', end: '14:00', scope: 'recurring_weekly' };
      ocr.location = { address: '123 Main St', fuzzy: false };
      const result = classifyPost(ocr, createBaseTextData(), 'At 123 Main St 11-2');

      expect(result.type).toBe(PostType.MIXED);
      expect(result.reason).toContain('Mixed update');
      expect(result.reason).toContain('times');
    });
  });

  describe('AMBIGUOUS Classifications', () => {
    it('should classify posts with only times as SCHEDULE', () => {
      const ocr = createBaseOcrResult();
      ocr.times = { start: '10:00', end: '14:00' };
      const result = classifyPost(ocr, createBaseTextData(), 'Open 10-2');

      expect(result.type).toBe(PostType.SCHEDULE);
      expect(result.reason).toContain('Schedule update');
    });

    it('should classify posts with partial times as SCHEDULE', () => {
      const ocr = createBaseOcrResult();
      ocr.times = { scope: 'scope_missing' };
      const result = classifyPost(ocr, createBaseTextData(), 'Open soon');

      expect(result.type).toBe(PostType.SCHEDULE);
      expect(result.reason).toContain('Partial schedule');
    });

    it('does not classify equal times as a complete schedule', () => {
      const ocr = createBaseOcrResult();
      ocr.times = { start: '10:00', end: '10:00' };

      const result = classifyPost(ocr, createBaseTextData(), 'Open 10-10');

      expect(result.type).toBe(PostType.SCHEDULE);
      expect(result.reason).toContain('Partial schedule');
    });

    it('should classify low confidence posts as AMBIGUOUS', () => {
      const ocr = createBaseOcrResult();
      ocr.food_items = [{ name: 'Pizza', price: 12 }];
      // Base confidence + 0.15 for food = 0.35, which is < 0.5
      ocr.confidence = 0.2;

      const result = classifyPost(ocr, createBaseTextData(), 'Pizza time');

      expect(result.type).toBe(PostType.AMBIGUOUS);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.reason).toContain('Low confidence');
    });

    it('should reduce confidence for fuzzy locations', () => {
      const ocr = createBaseOcrResult();
      ocr.location = { address: 'Main St', fuzzy: true };
      // Base 0.5 + 0.15 (location) - 0.1 (fuzzy) = 0.55. requiresConfirmation = true because < 0.7
      ocr.confidence = 0.5;

      const result = classifyPost(ocr, createBaseTextData(), 'Main St');

      expect(result.type).toBe(PostType.LOCATION);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.confidence).toBeCloseTo(0.55);
    });
  });

  describe('Edge Cases & Contextual Rules', () => {
    it('should NOT classify gratitude as UNRELATED if there are business keywords', () => {
      const ocr = createBaseOcrResult();
      ocr.food_items = [{ name: 'Pizza', price: 12 }]; // Provide data so it does not fallback to UNRELATED from dataTypesPresent === 0
      // We need to avoid matching the regex patterns. "thank you for your support" matches UNRELATED_PATTERNS
      // `/\b(?:thanks|thank\s*you)\s+(?:for\s+(?:your|the|all\s+(?:the\s+)?support|love))\b/i`
      // If it hits UNRELATED_PATTERNS, it ignores countBusinessKeywords.
      // So we use a gratitude keyword that ONLY matches GRATITUDE_KEYWORDS but NOT the regex,
      // or we just accept that the logic currently checks regex regardless of business keywords.
      // Wait, let's look at the source code.
      // The keyword "appreciate" matches GRATITUDE_KEYWORDS and checkBusinessKeywords avoids it.
      // But let's check UNRELATED_PATTERNS: `\bwe\s+(?:appreciate|are\s+(?:grateful|thankful))\s+(?:you|everyone|all)\b/i`.
      // Let's use "thoughts" which is in GRATITUDE_KEYWORDS but not in UNRELATED_PATTERNS.
      const message = 'Sending thoughts! Check out our new menu with pizza and special price!';
      const result = classifyPost(ocr, createBaseTextData(), message);

      // Gratitude keywords present, but countBusinessKeywords > 0
      expect(result.type).not.toBe(PostType.UNRELATED);
      expect(result.type).toBe(PostType.MENU);
    });

    it('should NOT classify event phrases as UNRELATED if there is food or location in text', () => {
      const ocr = createBaseOcrResult();
      ocr.food_items = [{ name: 'Hotdogs', price: 5 }];
      const message = 'Join us at the park serving hotdogs!';
      const result = classifyPost(ocr, createBaseTextData(), message);

      // Event phrase "Join us at" present, but "serving" / "food" keywords present
      expect(result.type).not.toBe(PostType.UNRELATED);
      expect(result.type).toBe(PostType.MENU);
    });

    it('should gracefully handle undefined postMessage', () => {
      const ocr = createBaseOcrResult();
      ocr.food_items = [{ name: 'Fries', price: 3 }];
      const result = classifyPost(ocr, createBaseTextData(), undefined);

      expect(result.type).toBe(PostType.MENU);
    });

    it('should correctly prioritize textData location if ocrResult lacks location', () => {
      const ocr = createBaseOcrResult();
      const textData = createBaseTextData();
      textData.location = { address: '789 Pine Rd', fuzzy: false };

      const result = classifyPost(ocr, textData, 'We are at 789 Pine Rd');

      expect(result.type).toBe(PostType.LOCATION);
    });
  });
});
