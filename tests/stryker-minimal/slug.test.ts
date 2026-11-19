import { generateSlug } from './slug';

describe('generateSlug', () => {
  it('should convert to lowercase', () => {
    expect(generateSlug('HELLO')).toBe('hello');
  });
  it('should replace spaces with hyphens', () => {
    expect(generateSlug('hello world')).toBe('hello-world');
  });
  it('should remove special characters', () => {
    expect(generateSlug('hello!@#world')).toBe('helloworld');
  });
  it('should trim whitespace', () => {
    expect(generateSlug('  hello  ')).toBe('hello');
  });
  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('');
  });
  it('should remove leading hyphens', () => {
    expect(generateSlug('---hello')).toBe('hello');
  });
  it('should remove trailing hyphens', () => {
    expect(generateSlug('hello---')).toBe('hello');
  });
  it('should handle underscores as separators', () => {
    expect(generateSlug('hello_world')).toBe('hello-world');
  });
});
