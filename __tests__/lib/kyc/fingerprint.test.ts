/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

describe('lib/kyc/fingerprint - pure functions', () => {
  beforeEach(() => {
    delete process.env.FINGERPRINTJS_API_KEY;
    delete process.env.FINGERPRINTJS_REGION;
  });

  describe('getFingerprintConfig', () => {
    it('should return configured object when API key is set', async () => {
      process.env.FINGERPRINTJS_API_KEY = 'test-api-key-123';
      process.env.FINGERPRINTJS_REGION = 'us';
      const { getFingerprintConfig } = await import('@/lib/kyc/fingerprint');
      const config = getFingerprintConfig();
      expect(config).toEqual({
        isConfigured: true,
        region: 'us',
        apiKey: 'test-api-key-123',
        endpoint: 'https://api.fpjs.io',
      });
    });

    it('should return configured object with EU endpoint when region is eu', async () => {
      process.env.FINGERPRINTJS_API_KEY = 'test-api-key-123';
      process.env.FINGERPRINTJS_REGION = 'eu';
      const { getFingerprintConfig } = await import('@/lib/kyc/fingerprint');
      const config = getFingerprintConfig();
      expect(config).toEqual({
        isConfigured: true,
        region: 'eu',
        apiKey: 'test-api-key-123',
        endpoint: 'https://eu.api.fpjs.io',
      });
    });

    it('should return unconfigured object when API key is missing', async () => {
      process.env.FINGERPRINTJS_REGION = 'us';
      const { getFingerprintConfig } = await import('@/lib/kyc/fingerprint');
      const config = getFingerprintConfig();
      expect(config).toEqual({
        isConfigured: false,
        region: 'us',
        apiKey: undefined,
        endpoint: 'https://api.fpjs.io',
      });
    });

    it('should default region to us when not set', async () => {
      process.env.FINGERPRINTJS_API_KEY = 'test-api-key-123';
      const { getFingerprintConfig } = await import('@/lib/kyc/fingerprint');
      const config = getFingerprintConfig();
      expect(config.region).toBe('us');
    });
  });

  describe('validateFingerprintResult', () => {
    it('should return valid for high confidence score and valid visitorId', async () => {
      const { validateFingerprintResult } = await import('@/lib/kyc/fingerprint');
      const result = validateFingerprintResult({
        visitorId: 'abc123def456',
        requestId: 'req-789',
        confidence: { score: 0.95 },
        ip: '192.168.1.1',
      });
      expect(result).toEqual({ valid: true });
    });

    it('should return invalid for low confidence score', async () => {
      const { validateFingerprintResult } = await import('@/lib/kyc/fingerprint');
      const result = validateFingerprintResult({
        visitorId: 'abc123def456',
        requestId: 'req-789',
        confidence: { score: 0.4 },
        ip: '192.168.1.1',
      });
      expect(result).toEqual({ valid: false, reason: 'Low confidence score' });
    });

    it('should return valid for confidence score exactly at threshold (0.6)', async () => {
      const { validateFingerprintResult } = await import('@/lib/kyc/fingerprint');
      const result = validateFingerprintResult({
        visitorId: 'abc123def456',
        requestId: 'req-789',
        confidence: { score: 0.6 },
        ip: '192.168.1.1',
      });
      expect(result).toEqual({ valid: true });
    });

    it('should return invalid for missing visitorId', async () => {
      const { validateFingerprintResult } = await import('@/lib/kyc/fingerprint');
      const result = validateFingerprintResult({
        visitorId: '',
        requestId: 'req-789',
        confidence: { score: 0.95 },
        ip: '192.168.1.1',
      });
      expect(result).toEqual({ valid: false, reason: 'Invalid visitor ID' });
    });

    it('should return invalid for short visitorId', async () => {
      const { validateFingerprintResult } = await import('@/lib/kyc/fingerprint');
      const result = validateFingerprintResult({
        visitorId: 'short',
        requestId: 'req-789',
        confidence: { score: 0.95 },
        ip: '192.168.1.1',
      });
      expect(result).toEqual({ valid: false, reason: 'Invalid visitor ID' });
    });

    it('should return invalid for null visitorId', async () => {
      const { validateFingerprintResult } = await import('@/lib/kyc/fingerprint');
      const result = validateFingerprintResult({
        visitorId: null as any,
        requestId: 'req-789',
        confidence: { score: 0.95 },
        ip: '192.168.1.1',
      });
      expect(result).toEqual({ valid: false, reason: 'Invalid visitor ID' });
    });

    it('should return invalid for undefined visitorId', async () => {
      const { validateFingerprintResult } = await import('@/lib/kyc/fingerprint');
      const result = validateFingerprintResult({
        visitorId: undefined as any,
        requestId: 'req-789',
        confidence: { score: 0.95 },
        ip: '192.168.1.1',
      });
      expect(result).toEqual({ valid: false, reason: 'Invalid visitor ID' });
    });

    it('should handle result without IP field', async () => {
      const { validateFingerprintResult } = await import('@/lib/kyc/fingerprint');
      const result = validateFingerprintResult({
        visitorId: 'abc123def456',
        requestId: 'req-789',
        confidence: { score: 0.95 },
      });
      expect(result).toEqual({ valid: true });
    });

    it('should return invalid for confidence score of 0', async () => {
      const { validateFingerprintResult } = await import('@/lib/kyc/fingerprint');
      const result = validateFingerprintResult({
        visitorId: 'abc123def456',
        requestId: 'req-789',
        confidence: { score: 0 },
        ip: '192.168.1.1',
      });
      expect(result).toEqual({ valid: false, reason: 'Low confidence score' });
    });

    it('should return valid for confidence score just above threshold', async () => {
      const { validateFingerprintResult } = await import('@/lib/kyc/fingerprint');
      const result = validateFingerprintResult({
        visitorId: 'abc123def456',
        requestId: 'req-789',
        confidence: { score: 0.61 },
        ip: '192.168.1.1',
      });
      expect(result).toEqual({ valid: true });
    });
  });
});
