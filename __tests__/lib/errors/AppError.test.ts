import { describe, it, expect } from '@jest/globals';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  AppValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
} from '@/lib/errors/AppError';

describe('AppError', () => {
  describe('abstract base class', () => {
    it('sets name, code, and timestamp', () => {
      class ConcreteError extends AppError {
        constructor() {
          super('test message', 'TEST_CODE');
        }
      }
      const error = new ConcreteError();
      expect(error.name).toBe('ConcreteError');
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('test message');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('has stack trace', () => {
      class ConcreteError extends AppError {
        constructor() {
          super('test', 'CODE');
        }
      }
      const error = new ConcreteError();
      expect(error.stack).toBeDefined();
    });
  });

  describe('BadRequestError', () => {
    it('has correct code', () => {
      const error = new BadRequestError('Invalid input');
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
    });

    it('uses default message', () => {
      const error = new BadRequestError();
      expect(error.message).toBe('Bad Request');
    });
  });

  describe('UnauthorizedError', () => {
    it('has correct code', () => {
      const error = new UnauthorizedError('Not logged in');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Not logged in');
    });

    it('uses default message', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('ForbiddenError', () => {
    it('has correct code', () => {
      const error = new ForbiddenError('Access denied');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Access denied');
    });

    it('uses default message', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Forbidden');
    });
  });

  describe('NotFoundError', () => {
    it('has correct code', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
    });

    it('uses default message', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Not Found');
    });
  });

  describe('AppValidationError', () => {
    it('has correct code', () => {
      const errors = [{ field: 'email', message: 'Invalid' }];
      const error = new AppValidationError('Validation failed', errors);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.validationErrors).toEqual(errors);
    });

    it('works without validation errors', () => {
      const error = new AppValidationError();
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.validationErrors).toBeUndefined();
    });
  });

  describe('RateLimitError', () => {
    it('has correct code', () => {
      const error = new RateLimitError('Too many requests', 60);
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.retryAfter).toBe(60);
    });

    it('works without retryAfter', () => {
      const error = new RateLimitError();
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('InternalServerError', () => {
    it('has correct code', () => {
      const error = new InternalServerError('Something broke');
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.message).toBe('Something broke');
    });

    it('uses default message', () => {
      const error = new InternalServerError();
      expect(error.message).toBe('Internal Server Error');
    });
  });

  describe('ServiceUnavailableError', () => {
    it('has correct code', () => {
      const error = new ServiceUnavailableError('Server down');
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe('Server down');
    });

    it('uses default message', () => {
      const error = new ServiceUnavailableError();
      expect(error.message).toBe('Service Unavailable');
    });
  });

  describe('instanceof checks', () => {
    it('AppValidationError is instance of AppError', () => {
      const error = new AppValidationError('test');
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('RateLimitError is instance of AppError', () => {
      const error = new RateLimitError();
      expect(error instanceof AppError).toBe(true);
    });
  });
});