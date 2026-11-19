import { generateSlug } from '../../../lib/utils/slug';

describe('generateSlug', () => {
  it('should convert to lowercase', () => {
    expect(generateSlug('TEST')).toBe('test');
  });

  it('should trim whitespace', () => {
    expect(generateSlug(' test ')).toBe('test');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('test name')).toBe('test-name');
  });

  it('should remove special characters', () => {
    expect(generateSlug('test!@#name')).toBe('testname');
  });

  it('should handle multiple consecutive spaces or hyphens', () => {
    expect(generateSlug('test   name---here')).toBe('test-name-here');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(generateSlug('---test-name---')).toBe('test-name');
  });

  it('should handle complex edge cases', () => {
    expect(generateSlug('  !@#  TEST  name   $$$  ')).toBe('test-name');
  });
});
