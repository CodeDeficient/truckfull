import { z } from 'zod';
import { AppValidationError as ValidationError } from '../errors/AppError';

const PHONE_NUMBER = /^[+]?[1-9]\d{0,15}$/;

/**
 * Generic validation function that uses Zod for validation
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Validated and potentially transformed data
 */
export function validateWithZod<T extends z.ZodSchema>(schema: T, data: unknown): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Extract the first error message
      const errorMessage = error.issues[0]?.message || 'Validation failed';
      throw new ValidationError(`Validation error: ${errorMessage}`, error.issues);
    }
    throw new ValidationError('Validation failed due to unexpected error');
  }
}

/**
 * Validate an email address using Zod
 * @param email - The email to validate
 * @returns Validated email
 */
export function validateEmail(email: string): string {
  const emailSchema = z.email();
  return validateWithZod(emailSchema, email);
}

/**
 * Validate a phone number using Zod
 * @param phone - The phone number to validate
 * @returns Validated phone number
 */
export function validatePhone(phone: string): string {
  const phoneSchema = z.string().regex(PHONE_NUMBER, 'Invalid phone number format');
  return validateWithZod(phoneSchema, phone);
}

/**
 * Validate a URL using Zod
 * @param url - The URL to validate
 * @returns Validated URL
 */
export function validateUrl(url: string): string {
  const urlSchema = z.url();
  return validateWithZod(urlSchema, url);
}
