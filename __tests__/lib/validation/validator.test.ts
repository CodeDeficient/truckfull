import { z } from 'zod';
import { AppValidationError as ValidationError } from '../../../lib/errors/AppError';
import { validateWithZod, validateEmail, validatePhone, validateUrl } from '../../../lib/validation/validator';

describe('validator', () => {
  describe('validateWithZod', () => {
    it('returns validated and transformed data for valid input', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      const data = { name: 'John Doe', age: 30, extraField: 'should be stripped if using strict, but here ignored by default' };

      const result = validateWithZod(schema, data);
      expect(result).toEqual({ name: 'John Doe', age: 30 });
    });

    it('throws AppValidationError with issues for ZodError', () => {
      const schema = z.object({
        name: z.string({ required_error: 'Required' }),
      });
      const data = { age: 30 }; // Missing name

      try {
        validateWithZod(schema, data);
        fail('Expected validation to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const err = error as ValidationError;
        expect(err.message).toMatch(/Validation error:/);
        expect(err.validationErrors).toBeDefined();
        expect(err.validationErrors?.length).toBeGreaterThan(0);
      }
    });

    it('throws AppValidationError for unexpected errors', () => {
      const schema = {
        parse: () => { throw new Error('Some unexpected error'); }
      } as unknown as z.ZodSchema;

      try {
        validateWithZod(schema, {});
        fail('Expected validation to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const err = error as ValidationError;
        expect(err.message).toBe('Validation failed due to unexpected error');
        expect(err.validationErrors).toBeUndefined();
      }
    });
  });

  describe('validateEmail', () => {
    it('returns valid email', () => {
      expect(validateEmail('test@example.com')).toBe('test@example.com');
    });

    it('throws AppValidationError for invalid email', () => {
      expect(() => validateEmail('invalid-email')).toThrow(ValidationError);
      try {
        validateEmail('invalid-email');
      } catch (e) {
        expect((e as ValidationError).message).toContain('Invalid email');
      }
    });
  });

  describe('validatePhone', () => {
    it('returns valid phone number', () => {
      expect(validatePhone('+1234567890')).toBe('+1234567890');
      expect(validatePhone('1234567890')).toBe('1234567890');
    });

    it('throws AppValidationError for invalid phone number', () => {
      expect(() => validatePhone('abc')).toThrow(ValidationError);
      expect(() => validatePhone('+12345678901234567')).toThrow(ValidationError); // Too long
    });
  });

  describe('validateUrl', () => {
    it('returns valid URL', () => {
      expect(validateUrl('https://example.com')).toBe('https://example.com');
      expect(validateUrl('http://test.org/path?q=1')).toBe('http://test.org/path?q=1');
      expect(validateUrl('ftp://test.com')).toBe('ftp://test.com'); // Zod allows this by default unless filtered
    });

    it('throws AppValidationError for invalid URL', () => {
      expect(() => validateUrl('invalid-url')).toThrow(ValidationError);
    });
  });
});
