/**
 * Unit Tests for Logging Sanitization
 * Tests verify PII removal from log messages
 */

import { sanitizeLogMessage } from '../../lib/logging';

describe('sanitizeLogMessage', () => {
  it('should return string unchanged if no PII', () => {
    expect(sanitizeLogMessage('Hello World')).toBe('Hello World');
  });

  it('should remove simple email addresses', () => {
    const result = sanitizeLogMessage('Contact: test@example.com');
    expect(result).toContain('[EMAIL]');
    expect(result).not.toContain('test@example.com');
  });

  it('should remove complex email addresses', () => {
    const result = sanitizeLogMessage('user.name+tag@subdomain.example.co.uk');
    expect(result).toContain('[EMAIL]');
  });

  it('should remove multiple emails', () => {
    const result = sanitizeLogMessage('From: a@b.com To: c@d.org');
    const emailCount = (result.match(/\[EMAIL\]/g) || []).length;
    expect(emailCount).toBe(2);
  });

  it('should redact api_key patterns', () => {
    const result = sanitizeLogMessage("api_key = 'secret123'");
    expect(result).toContain('[REDACTED]');
  });

  it('should redact secret_key patterns', () => {
    const result = sanitizeLogMessage('secret_key: mysecret');
    expect(result).toContain('[REDACTED]');
  });

  it('should redact access_token patterns', () => {
    const result = sanitizeLogMessage('access_token="abc123"');
    expect(result).toContain('[REDACTED]');
  });

  it('should NOT redact bare token word', () => {
    const result = sanitizeLogMessage('the token bucket is full');
    expect(result).not.toContain('[REDACTED]');
    expect(result).toContain('token bucket');
  });

  it('should handle empty string', () => {
    expect(sanitizeLogMessage('')).toBe('');
  });

  it('should be idempotent', () => {
    const input = 'Email: test@example.com';
    const result1 = sanitizeLogMessage(input);
    const result2 = sanitizeLogMessage(result1);
    expect(result1).toBe(result2);
  });
});
