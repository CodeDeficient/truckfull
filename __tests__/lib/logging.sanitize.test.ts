/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

const mockPostHog = {
  capture: jest.fn(),
  identify: jest.fn(),
};

beforeAll(() => {
  jest.unstable_mockModule('posthog-js', () => ({
    __esModule: true,
    default: mockPostHog,
  }));
});

import { sanitizeLogMessage } from '@/lib/logging';

describe('Logging - sanitizeLogMessage', () => {
  it('should redact email addresses', () => {
    const result = sanitizeLogMessage('Contact user@example.com for help');
    expect(result).toBe('Contact [EMAIL] for help');
  });

  it('should redact multiple email addresses', () => {
    const result = sanitizeLogMessage('From: a@b.com To: c@d.org');
    expect(result).toBe('From: [EMAIL] To: [EMAIL]');
  });

  it('should redact access_token values', () => {
    const result = sanitizeLogMessage('access_token=abc123secret');
    expect(result).toBe('access_token=[REDACTED]');
  });

  it('should redact refresh_token values with colon', () => {
    const result = sanitizeLogMessage('refresh_token: mytoken');
    expect(result).toBe('refresh_token=[REDACTED]');
  });

  it('should redact secret_key values with quotes', () => {
    const result = sanitizeLogMessage("secret_key='sk_test_123'");
    expect(result).toBe('secret_key=[REDACTED]');
  });

  it('should redact api_key values', () => {
    const result = sanitizeLogMessage('api_key = xyz-789');
    expect(result).toBe('api_key=[REDACTED]');
  });

  it('should redact tokens case-insensitively', () => {
    const result = sanitizeLogMessage('ACCESS_TOKEN=secret123');
    expect(result).toBe('ACCESS_TOKEN=[REDACTED]');
  });

  it('should handle message with no sensitive data', () => {
    const result = sanitizeLogMessage('User logged in successfully');
    expect(result).toBe('User logged in successfully');
  });

  it('should handle empty message', () => {
    expect(sanitizeLogMessage('')).toBe('');
  });

  it('should handle message with only sensitive data', () => {
    const result = sanitizeLogMessage('user@test.com access_token=secret');
    expect(result).toBe('[EMAIL] access_token=[REDACTED]');
  });
});
