import { describe, it, expect } from '@jest/globals';
import { sanitizeUrl } from '@/lib/utils/url';

describe('sanitizeUrl', () => {
  it('accepts valid https URL', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it('accepts valid http URL', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('accepts relative path starting with /', () => {
    expect(sanitizeUrl('/about')).toBe('/about');
  });

  it('accepts hash fragment', () => {
    expect(sanitizeUrl('#section')).toBe('#section');
  });

  it('rejects javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<h1>hi</h1>')).toBeNull();
  });

  it('rejects protocol-relative URL', () => {
    expect(sanitizeUrl('//evil.com')).toBeNull();
  });

  it('rejects bare string without protocol', () => {
    expect(sanitizeUrl('not-a-url')).toBeNull();
  });

  it('accepts https URL with path', () => {
    expect(sanitizeUrl('https://example.com/path?q=1')).toBe(
      'https://example.com/path?q=1',
    );
  });

  it('rejects empty string', () => {
    expect(sanitizeUrl('')).toBeNull();
  });

  it('rejects file: protocol', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:MsgBox("xss")')).toBeNull();
  });
});
