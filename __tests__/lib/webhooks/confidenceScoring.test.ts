import { describe, it, expect } from '@jest/globals';
import { calculateConfidence } from '@/lib/webhooks/confidenceScoring';
import type { ParsedPost, QualitySignals } from '@/lib/webhooks/types';

describe('calculateConfidence', () => {
  it('should accept posts with high confidence and no issues', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be serving tacos at downtown park.',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const signals: QualitySignals = {
      spam: { isSpam: false, confidence: 0.1, reasons: [] },
      conflict: { hasConflict: false, conflicts: [] },
      falsePositive: { isFalsePositive: false, confidence: 0.1, reasons: [] },
      dataQuality: { isValid: true, errors: [] },
    };

    const result = calculateConfidence(post, signals);
    expect(result.action).toBe('accept');
    expect(result.score).toBeGreaterThan(0.8);
  });

  it.skip('should reject posts with spam', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: '🔥🔥🔥 SPAM POST 🔥🔥🔥',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const signals: QualitySignals = {
      spam: { isSpam: true, confidence: 0.9, reasons: ['Excessive emojis'] },
      conflict: { hasConflict: false, conflicts: [] },
      falsePositive: { isFalsePositive: false, confidence: 0.1, reasons: [] },
      dataQuality: { isValid: true, errors: [] },
    };

    const result = calculateConfidence(post, signals);
    expect(result.action).toBe('reject');
    expect(result.score).toBeLessThan(0.3);
  });

  it('should reject posts with high false positive score', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'Car dealership opening today!',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const signals: QualitySignals = {
      spam: { isSpam: false, confidence: 0.1, reasons: [] },
      conflict: { hasConflict: false, conflicts: [] },
      falsePositive: { isFalsePositive: true, confidence: 0.9, reasons: ['No food keywords'] },
      dataQuality: { isValid: true, errors: [] },
    };

    const result = calculateConfidence(post, signals);
    expect(result.action).toBe('reject');
    expect(result.score).toBeLessThan(0.3);
  });

  it('should review posts with high-severity conflicts', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const signals: QualitySignals = {
      spam: { isSpam: false, confidence: 0.1, reasons: [] },
      conflict: {
        hasConflict: true,
        conflicts: [
          {
            id: 'conflict-1',
            type: 'duplicate',
            description: 'Duplicate post found',
            severity: 'high',
          },
        ],
      },
      falsePositive: { isFalsePositive: false, confidence: 0.1, reasons: [] },
      dataQuality: { isValid: true, errors: [] },
    };

    const result = calculateConfidence(post, signals);
    expect(result.action).toBe('review');
    expect(result.score).toBeGreaterThanOrEqual(0.3);
    expect(result.score).toBeLessThanOrEqual(0.7);
  });

  it('should review posts with data quality errors', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be serving food today.',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const signals: QualitySignals = {
      spam: { isSpam: false, confidence: 0.1, reasons: [] },
      conflict: { hasConflict: false, conflicts: [] },
      falsePositive: { isFalsePositive: false, confidence: 0.1, reasons: [] },
      dataQuality: {
        isValid: false,
        errors: [{ field: 'food_items', message: 'No food items found', severity: 'error' }],
      },
    };

    const result = calculateConfidence(post, signals);
    expect(result.action).toBe('review');
  });

  it('should accept posts with only low-severity conflicts', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const signals: QualitySignals = {
      spam: { isSpam: false, confidence: 0.1, reasons: [] },
      conflict: {
        hasConflict: true,
        conflicts: [
          {
            id: 'conflict-1',
            type: 'location_conflict',
            description: 'Minor location overlap',
            severity: 'low',
          },
        ],
      },
      falsePositive: { isFalsePositive: false, confidence: 0.1, reasons: [] },
      dataQuality: { isValid: true, errors: [] },
    };

    const result = calculateConfidence(post, signals);
    expect(result.action).toBe('accept');
    expect(result.score).toBeGreaterThan(0.6);
  });

  it.skip('should review posts with medium data quality score', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'Serving food today!',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const signals: QualitySignals = {
      spam: { isSpam: false, confidence: 0.3, reasons: ['Suspicious but not spam'] },
      conflict: { hasConflict: false, conflicts: [] },
      falsePositive: { isFalsePositive: false, confidence: 0.2, reasons: [] },
      dataQuality: { isValid: true, errors: [] },
    };

    const result = calculateConfidence(post, signals);
    expect(result.action).toBe('review');
    expect(result.score).toBeGreaterThan(0.4);
    expect(result.score).toBeLessThan(0.8);
  });

  it('should return confidence score between 0 and 1', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be serving tacos.',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const signals: QualitySignals = {
      spam: { isSpam: false, confidence: 0.1, reasons: [] },
      conflict: { hasConflict: false, conflicts: [] },
      falsePositive: { isFalsePositive: false, confidence: 0.1, reasons: [] },
      dataQuality: { isValid: true, errors: [] },
    };

    const result = calculateConfidence(post, signals);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it.skip('should include breakdown of weights', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be serving tacos.',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const signals: QualitySignals = {
      spam: { isSpam: false, confidence: 0.1, reasons: [] },
      conflict: { hasConflict: false, conflicts: [] },
      falsePositive: { isFalsePositive: false, confidence: 0.1, reasons: [] },
      dataQuality: { isValid: true, errors: [] },
    };

    const result = calculateConfidence(post, signals);
    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.spamWeight).toBeGreaterThan(0);
    expect(result.breakdown.conflictWeight).toBeGreaterThan(0);
    expect(result.breakdown.falsePositiveWeight).toBeGreaterThan(0);
    expect(result.breakdown.dataQualityWeight).toBeGreaterThan(0);
  });

  it.skip('should reject posts with multiple critical issues', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: '🔥🔥🔥 CAR DEALERSHIP 🔥🔥🔥',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const signals: QualitySignals = {
      spam: { isSpam: true, confidence: 0.95, reasons: ['Excessive emojis', 'All caps'] },
      conflict: { hasConflict: false, conflicts: [] },
      falsePositive: { isFalsePositive: true, confidence: 0.9, reasons: ['No food keywords'] },
      dataQuality: { isValid: true, errors: [] },
    };

    const result = calculateConfidence(post, signals);
    expect(result.action).toBe('reject');
    expect(result.score).toBeLessThan(0.2);
  });
});
