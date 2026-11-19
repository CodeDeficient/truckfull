/**
 * FingerprintJS Utility Tests
 *
 * Phase 7: KYC & Trust Infrastructure
 * Unit tests for fingerprint validation and blocking logic
 */

import {
  storeVisitorId,
  isVisitorBlocked,
  blockVisitor,
  getFingerprintConfig,
  validateFingerprintResult,
} from '@/lib/kyc/fingerprint';

describe('FingerprintJS Utilities', () => {
  describe('validateFingerprintResult', () => {
    it('accepts valid fingerprint with high confidence', () => {
      const result = {
        visitorId: 'abc123def456',
        requestId: 'req_123',
        confidence: { score: 0.95 },
        ip: '192.168.1.1',
      };

      const { valid, reason } = validateFingerprintResult(result);

      expect(valid).toBe(true);
      expect(reason).toBeUndefined();
    });

    it('accepts valid fingerprint with minimum confidence threshold', () => {
      const result = {
        visitorId: 'abc123def456',
        requestId: 'req_123',
        confidence: { score: 0.6 },
      };

      const { valid, reason } = validateFingerprintResult(result);

      expect(valid).toBe(true);
      expect(reason).toBeUndefined();
    });

    it('rejects fingerprint with low confidence score', () => {
      const result = {
        visitorId: 'abc123def456',
        requestId: 'req_123',
        confidence: { score: 0.5 },
      };

      const { valid, reason } = validateFingerprintResult(result);

      expect(valid).toBe(false);
      expect(reason).toBe('Low confidence score');
    });

    it('rejects fingerprint with very low confidence score', () => {
      const result = {
        visitorId: 'abc123def456',
        requestId: 'req_123',
        confidence: { score: 0.1 },
      };

      const { valid, reason } = validateFingerprintResult(result);

      expect(valid).toBe(false);
      expect(reason).toBe('Low confidence score');
    });

    it('rejects fingerprint with zero confidence score', () => {
      const result = {
        visitorId: 'abc123def456',
        requestId: 'req_123',
        confidence: { score: 0 },
      };

      const { valid, reason } = validateFingerprintResult(result);

      expect(valid).toBe(false);
      expect(reason).toBe('Low confidence score');
    });

    it('rejects fingerprint with short visitor ID', () => {
      const result = {
        visitorId: 'short',
        requestId: 'req_123',
        confidence: { score: 0.95 },
      };

      const { valid, reason } = validateFingerprintResult(result);

      expect(valid).toBe(false);
      expect(reason).toBe('Invalid visitor ID');
    });

    it('rejects fingerprint with empty visitor ID', () => {
      const result = {
        visitorId: '',
        requestId: 'req_123',
        confidence: { score: 0.95 },
      };

      const { valid, reason } = validateFingerprintResult(result);

      expect(valid).toBe(false);
      expect(reason).toBe('Invalid visitor ID');
    });

    it('rejects fingerprint with missing visitor ID', () => {
      const result = {
        visitorId: undefined as unknown as string,
        requestId: 'req_123',
        confidence: { score: 0.95 },
      };

      const { valid, reason } = validateFingerprintResult(result);

      expect(valid).toBe(false);
      expect(reason).toBe('Invalid visitor ID');
    });

    it('accepts fingerprint without optional IP field', () => {
      const result = {
        visitorId: 'abc123def456',
        requestId: 'req_123',
        confidence: { score: 0.95 },
      };

      const { valid } = validateFingerprintResult(result);

      expect(valid).toBe(true);
    });

    it('rejects fingerprint when both confidence is low and visitor ID is short', () => {
      const result = {
        visitorId: 'short',
        requestId: 'req_123',
        confidence: { score: 0.5 },
      };

      const { valid, reason } = validateFingerprintResult(result);

      // Should fail on the first check (confidence)
      expect(valid).toBe(false);
      expect(reason).toBe('Low confidence score');
    });
  });

  describe('storeVisitorId', () => {
    it('stores a valid visitor ID', async () => {
      const result = await storeVisitorId('user123', 'abc123def456', 'req_123');

      expect(result).toBe(true);
    });

    it('rejects short visitor ID', async () => {
      const result = await storeVisitorId('user123', 'short', 'req_123');

      expect(result).toBe(false);
    });

    it('rejects empty visitor ID', async () => {
      const result = await storeVisitorId('user123', '', 'req_123');

      expect(result).toBe(false);
    });

    it('rejects undefined visitor ID', async () => {
      const result = await storeVisitorId('user123', undefined as unknown as string, 'req_123');

      expect(result).toBe(false);
    });
  });

  describe('isVisitorBlocked', () => {
    it('returns false for non-blocked visitor', async () => {
      const result = await isVisitorBlocked('abc123def456');

      expect(result).toBe(false);
    });

    it('returns false for any visitor ID (current implementation)', async () => {
      const result = await isVisitorBlocked('blocked123');

      // In production, this would check against blocked_visitors table
      // For now, always returns false
      expect(result).toBe(false);
    });
  });

  describe('blockVisitor', () => {
    it('blocks a visitor successfully', async () => {
      const result = await blockVisitor('abc123def456', 'Fraud detected', 'admin123');

      expect(result).toBe(true);
    });

    it('blocks visitor with long reason', async () => {
      const longReason =
        'Multiple fraud attempts detected from this device including suspicious registration patterns';
      const result = await blockVisitor('abc123def456', longReason, 'admin123');

      expect(result).toBe(true);
    });
  });

  describe('getFingerprintConfig', () => {
    it('returns configuration when API key is set', () => {
      process.env.FINGERPRINTJS_API_KEY = 'test-api-key';
      process.env.FINGERPRINTJS_REGION = 'eu';

      const config = getFingerprintConfig();

      expect(config.isConfigured).toBe(true);
      expect(config.apiKey).toBe('test-api-key');
      expect(config.region).toBe('eu');
      expect(config.endpoint).toBe('https://eu.api.fpjs.io');

      // Clean up
      delete process.env.FINGERPRINTJS_API_KEY;
      delete process.env.FINGERPRINTJS_REGION;
    });

    it('returns configuration with default US region', () => {
      process.env.FINGERPRINTJS_API_KEY = 'test-api-key';

      const config = getFingerprintConfig();

      expect(config.isConfigured).toBe(true);
      expect(config.apiKey).toBe('test-api-key');
      expect(config.region).toBe('us');
      expect(config.endpoint).toBe('https://api.fpjs.io');

      // Clean up
      delete process.env.FINGERPRINTJS_API_KEY;
    });

    it('returns not configured when API key is missing', () => {
      delete process.env.FINGERPRINTJS_API_KEY;
      delete process.env.FINGERPRINTJS_REGION;

      const config = getFingerprintConfig();

      expect(config.isConfigured).toBe(false);
      expect(config.apiKey).toBeUndefined();
      expect(config.region).toBe('us');
      expect(config.endpoint).toBe('https://api.fpjs.io');
    });

    it('returns undefined API key when not configured', () => {
      delete process.env.FINGERPRINTJS_API_KEY;

      const config = getFingerprintConfig();

      expect(config.isConfigured).toBe(false);
      expect(config.apiKey).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles confidence score exactly at boundary (0.6)', () => {
      const result = {
        visitorId: 'abc123def456',
        requestId: 'req_123',
        confidence: { score: 0.6 },
      };

      const { valid } = validateFingerprintResult(result);

      expect(valid).toBe(true);
    });

    it('handles confidence score just below boundary (0.599)', () => {
      const result = {
        visitorId: 'abc123def456',
        requestId: 'req_123',
        confidence: { score: 0.599 },
      };

      const { valid } = validateFingerprintResult(result);

      expect(valid).toBe(false);
    });

    it('handles confidence score above 1.0', () => {
      const result = {
        visitorId: 'abc123def456',
        requestId: 'req_123',
        confidence: { score: 1.2 },
      };

      const { valid } = validateFingerprintResult(result);

      expect(valid).toBe(true);
    });

    it('handles visitor ID with special characters', () => {
      const result = {
        visitorId: 'abc123-DEF456_GHI789',
        requestId: 'req_123',
        confidence: { score: 0.95 },
      };

      const { valid } = validateFingerprintResult(result);

      expect(valid).toBe(true);
    });

    it('handles very long visitor ID', () => {
      const result = {
        visitorId: 'a'.repeat(1000),
        requestId: 'req_123',
        confidence: { score: 0.95 },
      };

      const { valid } = validateFingerprintResult(result);

      expect(valid).toBe(true);
    });

    it('handles visitor ID exactly at minimum length (10)', () => {
      const result = {
        visitorId: '0123456789',
        requestId: 'req_123',
        confidence: { score: 0.95 },
      };

      const { valid } = validateFingerprintResult(result);

      expect(valid).toBe(true);
    });

    it('handles visitor ID just below minimum length (9)', () => {
      const result = {
        visitorId: '012345678',
        requestId: 'req_123',
        confidence: { score: 0.95 },
      };

      const { valid } = validateFingerprintResult(result);

      expect(valid).toBe(false);
    });
  });
});
