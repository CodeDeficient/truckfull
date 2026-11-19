/**
 * Unit Tests for StrykerJS Mutation Testing
 * These tests verify that our code properly handles edge cases
 * Stryker will mutate the source code and verify tests catch the mutations
 */

import { generateSlug } from '../../lib/utils/slug';

describe('generateSlug', () => {
  it('should convert to lowercase', () => {
    expect(generateSlug('HELLO WORLD')).toBe('hello-world');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('hello world')).toBe('hello-world');
  });

  it('should remove special characters', () => {
    expect(generateSlug('hello! @world#')).toBe('hello-world');
  });

  it('should trim whitespace', () => {
    expect(generateSlug('  hello  ')).toBe('hello');
  });

  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('should handle whitespace-only string', () => {
    expect(generateSlug('   ')).toBe('');
  });

  it('should remove leading hyphens', () => {
    expect(generateSlug('---hello')).toBe('hello');
  });

  it('should remove trailing hyphens', () => {
    expect(generateSlug('hello---')).toBe('hello');
  });

  it('should collapse multiple hyphens', () => {
    expect(generateSlug('hello---world')).toBe('hello-world');
  });

  it('should handle underscores', () => {
    expect(generateSlug('hello_world')).toBe('hello-world');
  });

  it('should handle mixed separators', () => {
    expect(generateSlug('hello _ - world')).toBe('hello-world');
  });
});
