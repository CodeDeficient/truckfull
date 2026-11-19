/**
 * Standardized Result type for service responses following the pattern from type-safety.md
 *
 * Usage:
 * - Services should return Result<T> where T is the success type
 * - Use ok(value) to create successful results
 * - Use err(message) to create error results
 * - Consumers should check 'error' in result to determine success/failure
 */

export type Ok<T> = { data: T };
export type Err = { error: string };
export type Result<T> = Ok<T> | Err;

/**
 * Creates a successful result with data
 */
export function ok<T>(data: T): Result<T> {
  return { data };
}

/**
 * Creates an error result with error message
 */
export function err<T = never>(error: string): Result<T> {
  return { error };
}

/**
 * Type guard to check if a result is an error
 */
export function isError<T>(result: Result<T>): result is Err {
  return 'error' in result;
}

/**
 * Type guard to check if a result is successful
 */
export function isOk<T>(result: Result<T>): result is Ok<T> {
  return 'data' in result;
}

/**
 * Helper to get data from a result or throw if it's an error
 */
export function unwrap<T>(result: Result<T>): T {
  if (isError(result)) {
    throw new Error(result.error);
  }
  return result.data;
}
