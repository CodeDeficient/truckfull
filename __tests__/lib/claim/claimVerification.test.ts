import { describe, expect, it } from '@jest/globals';

import {
  VERIFICATION_CODE_LENGTH,
  SUPPORT_EMAIL,
  buildContactSupportUrl,
  buildSendCodeBody,
  buildVerifyCodeBody,
  parseApiErrorMessage,
  parseVerificationCodeInput,
  validateVerificationCode,
} from '@/lib/claim/claimVerification';

describe('claimVerification', () => {
  describe('parseVerificationCodeInput', () => {
    it('strips non-digits and caps at 6 characters', () => {
      expect(parseVerificationCodeInput('a1b2c3d4e5f6')).toBe('123456');
    });

    it('returns empty string for non-digit input', () => {
      expect(parseVerificationCodeInput('abcdef')).toBe('');
    });

    it('preserves valid numeric input', () => {
      expect(parseVerificationCodeInput('123456')).toBe('123456');
    });

    it('handles partial input', () => {
      expect(parseVerificationCodeInput('12')).toBe('12');
    });
  });

  describe('buildContactSupportUrl', () => {
    it('builds a mailto URL with encoded subject and body', () => {
      const url = buildContactSupportUrl("Taco's Truck", 'truck-123');
      expect(url).toContain('subject=');
      expect(url).toContain(encodeURIComponent("Taco's Truck"));
      expect(url).toContain(encodeURIComponent('truck-123'));
      expect(url).toContain(SUPPORT_EMAIL);
    });

    it('encodes special characters in truck name', () => {
      const url = buildContactSupportUrl('100% Tacos & More', 't-1');
      expect(url).toContain(encodeURIComponent('100% Tacos & More'));
    });
  });

  describe('parseApiErrorMessage', () => {
    it('extracts error string from valid response data', () => {
      expect(parseApiErrorMessage({ error: 'Too many attempts' }, 'fallback')).toBe(
        'Too many attempts',
      );
    });

    it('returns fallback when data has no error field', () => {
      expect(parseApiErrorMessage({ message: 'something' }, 'fallback')).toBe('fallback');
    });

    it('returns fallback when error is not a string', () => {
      expect(parseApiErrorMessage({ error: 42 }, 'fallback')).toBe('fallback');
    });

    it('returns fallback when data is null', () => {
      expect(parseApiErrorMessage(null, 'fallback')).toBe('fallback');
    });

    it('returns fallback when data is a string', () => {
      expect(parseApiErrorMessage('error string', 'fallback')).toBe('fallback');
    });

    it('returns fallback when error is an empty string', () => {
      expect(parseApiErrorMessage({ error: '' }, 'fallback')).toBe('fallback');
    });
  });

  describe('buildSendCodeBody', () => {
    it('produces valid JSON with truckId', () => {
      const body = buildSendCodeBody('truck-abc');
      expect(JSON.parse(body)).toEqual({ truckId: 'truck-abc' });
    });
  });

  describe('buildVerifyCodeBody', () => {
    it('produces valid JSON with truckId and code', () => {
      const body = buildVerifyCodeBody('truck-abc', '123456');
      expect(JSON.parse(body)).toEqual({ truckId: 'truck-abc', code: '123456' });
    });
  });

  describe('validateVerificationCode', () => {
    it('returns error for codes shorter than required length', () => {
      expect(validateVerificationCode('123')).toBe(
        `Enter ${VERIFICATION_CODE_LENGTH}-digit code`,
      );
    });

    it('returns null for valid code', () => {
      expect(validateVerificationCode('123456')).toBeNull();
    });

    it('returns error for empty code', () => {
      expect(validateVerificationCode('')).not.toBeNull();
    });
  });

  it('exposes the expected support email', () => {
    expect(SUPPORT_EMAIL).toBe('support@truckfull.food');
  });

  it('exposes the expected code length', () => {
    expect(VERIFICATION_CODE_LENGTH).toBe(6);
  });
});
