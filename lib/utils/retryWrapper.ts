import { logError, logWarning, logMessage } from '@/lib/logging';

/**
 * Exponential backoff retry wrapper
 *
 * Wraps async functions with automatic retry on failure.
 * Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 retries)
 */

export interface RetryOptions {
  readonly maxAttempts?: number;
  readonly initialDelayMs?: number;
  readonly backoffMultiplier?: number;
  readonly shouldRetry?: (error: unknown) => boolean;
}

/**
 * Execute a function with exponential backoff retry
 * @param fn - The async function to execute
 * @param context - Context for logging
 * @param options - Retry options
 * @returns Promise with function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: string,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 5, initialDelayMs = 1000, backoffMultiplier = 2, shouldRetry } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logMessage(`Attempt ${attempt}/${maxAttempts} for ${context}`);
      const result = await fn();
      logMessage(`✅ Success on attempt ${attempt}/${maxAttempts} for ${context}`);
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      const customShouldRetry = shouldRetry?.(error);
      const defaultShouldRetry =
        error instanceof Error &&
        (error.message.includes('ECONNRESET') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('timeout') ||
          error.message.includes('503') ||
          error.message.includes('502'));

      if (!customShouldRetry && !defaultShouldRetry) {
        logError(`Non-retryable error for ${context}:`, error);
        throw error;
      }

      if (attempt === maxAttempts) {
        logError(`Max retries (${maxAttempts}) exceeded for ${context}:`, error);
        throw error;
      }

      const delayMs = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
      logWarning(`Retry ${attempt + 1}/${maxAttempts} in ${delayMs}ms for ${context}:`, {
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}
