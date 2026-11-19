import { describe, it, expect } from '@jest/globals';
import type {
  ParsedPost,
  SpamResult,
  Conflict,
  ConflictResult,
  FalsePositiveResult,
  QualityError,
  DataQualityResult,
  QualitySignals,
  ConfidenceResult,
} from '@/lib/webhooks/types';

describe('Webhook Types', () => {
  describe('ParsedPost', () => {
    it('should have correct structure', () => {
      const post: ParsedPost = {
        id: '123',
        platform: 'instagram',
        post_url: 'https://example.com/post/123',
        content: 'Come get some tacos!',
        timestamp: '2024-01-15T10:00:00Z',
        author: '@tacotruck',
        images: ['https://example.com/img1.jpg'],
        extracted_data: {
          truck_name: 'Taco Truck',
          location: {
            address: '123 Main St',
            latitude: 32.7,
            longitude: -79.9,
          },
          food_items: ['Tacos', 'Burritos'],
          cuisine_type: ['Mexican'],
          time: {
            start: '11:00',
            end: '14:00',
            date: '2024-01-15',
          },
          contact_info: {
            phone: '555-1234',
            email: 'tacos@example.com',
            website: 'https://tacotruck.example.com',
          },
        },
        raw_data: { original: 'data' },
      };

      expect(post.id).toBe('123');
      expect(post.platform).toBe('instagram');
      expect(post.extracted_data?.truck_name).toBe('Taco Truck');
      expect(post.extracted_data?.location?.latitude).toBe(32.7);
    });
  });

  describe('SpamResult', () => {
    it('should have correct structure', () => {
      const spamResult: SpamResult = {
        isSpam: false,
        confidence: 0.9,
        reasons: [],
      };

      expect(spamResult.isSpam).toBe(false);
      expect(spamResult.confidence).toBe(0.9);
    });

    it('should track spam reasons', () => {
      const spamResult: SpamResult = {
        isSpam: true,
        confidence: 0.95,
        reasons: ['excessive hashtags', 'promotional content'],
      };

      expect(spamResult.isSpam).toBe(true);
      expect(spamResult.reasons).toHaveLength(2);
    });
  });

  describe('Conflict', () => {
    it('should support duplicate type', () => {
      const conflict: Conflict = {
        id: 'c1',
        type: 'duplicate',
        description: 'Similar post detected',
        severity: 'medium',
      };

      expect(conflict.type).toBe('duplicate');
      expect(conflict.severity).toBe('medium');
    });

    it('should support location_conflict type', () => {
      const conflict: Conflict = {
        id: 'c2',
        type: 'location_conflict',
        description: 'Location mismatch',
        severity: 'high',
      };

      expect(conflict.type).toBe('location_conflict');
    });

    it('should support schedule_conflict type', () => {
      const conflict: Conflict = {
        id: 'c3',
        type: 'schedule_conflict',
        description: 'Schedule overlap',
        severity: 'low',
      };

      expect(conflict.type).toBe('schedule_conflict');
    });
  });

  describe('ConflictResult', () => {
    it('should have correct structure', () => {
      const result: ConflictResult = {
        hasConflict: true,
        conflicts: [],
      };

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toEqual([]);
    });
  });

  describe('FalsePositiveResult', () => {
    it('should have correct structure', () => {
      const result: FalsePositiveResult = {
        isFalsePositive: false,
        confidence: 0.85,
        reasons: [],
      };

      expect(result.isFalsePositive).toBe(false);
      expect(result.confidence).toBe(0.85);
    });
  });

  describe('QualityError', () => {
    it('should support error severity', () => {
      const error: QualityError = {
        field: 'content',
        message: 'Content is too short',
        severity: 'error',
      };

      expect(error.severity).toBe('error');
    });

    it('should support warning severity', () => {
      const error: QualityError = {
        field: 'images',
        message: 'No images provided',
        severity: 'warning',
      };

      expect(error.severity).toBe('warning');
    });
  });

  describe('DataQualityResult', () => {
    it('should have correct structure', () => {
      const result: DataQualityResult = {
        isValid: true,
        errors: [],
      };

      expect(result.isValid).toBe(true);
    });
  });

  describe('QualitySignals', () => {
    it('should aggregate all signal types', () => {
      const signals: QualitySignals = {
        spam: { isSpam: false, confidence: 0.9, reasons: [] },
        conflict: { hasConflict: false, conflicts: [] },
        falsePositive: { isFalsePositive: false, confidence: 0.8, reasons: [] },
        dataQuality: { isValid: true, errors: [] },
      };

      expect(signals.spam.isSpam).toBe(false);
      expect(signals.conflict.hasConflict).toBe(false);
      expect(signals.falsePositive.isFalsePositive).toBe(false);
      expect(signals.dataQuality.isValid).toBe(true);
    });
  });

  describe('ConfidenceResult', () => {
    it('should have correct structure', () => {
      const result: ConfidenceResult = {
        score: 0.85,
        action: 'accept',
        breakdown: {
          spamWeight: 0.3,
          conflictWeight: 0.2,
          falsePositiveWeight: 0.2,
          dataQualityWeight: 0.3,
        },
      };

      expect(result.score).toBe(0.85);
      expect(result.action).toBe('accept');
      expect(result.breakdown.spamWeight).toBe(0.3);
    });

    it('should support review action', () => {
      const result: ConfidenceResult = {
        score: 0.5,
        action: 'review',
        breakdown: {
          spamWeight: 0.3,
          conflictWeight: 0.2,
          falsePositiveWeight: 0.2,
          dataQualityWeight: 0.3,
        },
      };

      expect(result.action).toBe('review');
    });

    it('should support reject action', () => {
      const result: ConfidenceResult = {
        score: 0.1,
        action: 'reject',
        breakdown: {
          spamWeight: 0.3,
          conflictWeight: 0.2,
          falsePositiveWeight: 0.2,
          dataQualityWeight: 0.3,
        },
      };

      expect(result.action).toBe('reject');
    });
  });
});
