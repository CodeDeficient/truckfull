// Base application error class
export abstract class AppError extends Error {
  public readonly name: string;
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();

    // Set the prototype explicitly to maintain proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Error for bad requests (400)
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request') {
    super(message, 'BAD_REQUEST');
  }
}

// Error for unauthorized access (401)
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED');
  }
}

// Error for forbidden access (403)
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN');
  }
}

// Error for resource not found (404)
export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found') {
    super(message, 'NOT_FOUND');
  }
}

// Error for validation failures
export class AppValidationError extends AppError {
  public readonly validationErrors?: unknown[];

  constructor(message: string = 'Validation Error', validationErrors?: unknown[]) {
    super(message, 'VALIDATION_ERROR');
    this.validationErrors = validationErrors;
  }
}

// Error for rate limiting (429)
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate Limit Exceeded',
    public readonly retryAfter?: number,
  ) {
    super(message, 'RATE_LIMITED');
  }
}

// Error for internal server errors (500)
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 'INTERNAL_SERVER_ERROR');
  }
}

// Error for service unavailable (503)
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service Unavailable') {
    super(message, 'SERVICE_UNAVAILABLE');
  }
}
