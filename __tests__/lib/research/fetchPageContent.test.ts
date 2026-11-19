import { describe, it, expect } from '@jest/globals';
import { isPrivateUrl } from '@/lib/research/fetchPageContent';

describe('isPrivateUrl', () => {
  it('blocks localhost', () => {
    expect(isPrivateUrl('http://localhost:3000/admin')).toBe(true);
  });

  it('blocks 127.0.0.1', () => {
    expect(isPrivateUrl('http://127.0.0.1:8080/internal')).toBe(true);
  });

  it('blocks AWS metadata endpoint', () => {
    expect(isPrivateUrl('http://169.254.169.254/latest/meta-data/')).toBe(true);
  });

  it('blocks Google Cloud metadata', () => {
    expect(isPrivateUrl('http://metadata.google.internal/computeMetadata/v1/')).toBe(true);
  });

  it('blocks Alibaba Cloud metadata', () => {
    expect(isPrivateUrl('http://100.100.100.200/latest/meta-data/')).toBe(true);
  });

  it('blocks IPv6 loopback', () => {
    expect(isPrivateUrl('http://[::1]:3000/admin')).toBe(true);
  });

  it('blocks 0.0.0.0', () => {
    expect(isPrivateUrl('http://0.0.0.0:3000/')).toBe(true);
  });

  it('blocks ftp protocol', () => {
    expect(isPrivateUrl('ftp://example.com/file')).toBe(true);
  });

  it('allows HTTPS URLs to public domains', () => {
    expect(isPrivateUrl('https://example.com/page')).toBe(false);
  });

  it('allows HTTP URLs to public domains', () => {
    expect(isPrivateUrl('http://example.com/page')).toBe(false);
  });

  it('allows subdomains of public domains', () => {
    expect(isPrivateUrl('https://www.eventbrite.com/e/event-123')).toBe(false);
  });

  it('blocks invalid URLs', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
  });
});