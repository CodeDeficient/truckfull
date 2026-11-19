/**
 * Generic retry utility with exponential backoff
 * Provides resilient execution of operations that may fail transiently
 */

/**
 * Options for configuring retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Add random jitter to prevent thundering herd (default: true) */
  useJitter?: boolean;
  /** Function to determine if error should be retried */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Function called before each retry attempt */
  onRetry?: (error: unknown, attempt: number, nextDelayMs: number) => void;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /** The successful result, if any */
  data?: T;
  /** The final error, if operation failed */
  error?: unknown;
  /** Whether the operation succeeded */
  success: boolean;
  /** Number of attempts made */
  attempts: number;
  /** Total time taken in milliseconds */
  totalTimeMs: number;
}

/**
 * Default retry condition - retries on network errors, server errors, and timeouts
 */
function defaultShouldRetry(error: unknown, attempt: number): boolean {
  // Don't retry if we've exhausted attempts
  if (attempt >= 3) return false;

  // Retry on network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Retry on HTTP errors that are likely transient
  if (error != undefined && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return status >= 500 || status === 429 || status === 408;
  }

  // Retry on common error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ??
      message.includes('network') ??
      message.includes('connection') ??
      message.includes('aborted') ??
      message.includes('rate limit')
    );
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
type DelayConfig = {
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  useJitter: boolean;
};

function calculateDelay(attempt: number, cfg: DelayConfig): number {
  const { initialDelayMs, maxDelayMs, backoffMultiplier, useJitter } = cfg;
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  const delayWithCap = Math.min(exponentialDelay, maxDelayMs);

  if (!useJitter) return delayWithCap;

  // Deterministic jitter without large numeric literals to satisfy linting
  let x = attempt >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  // Map to approximately [-0.1, +0.1] using bitmask to avoid large literals
  const y = x & 2047; // 2^11 - 1
  const fraction = (y / 2047 - 0.5) * 0.2; // -0.1 .. +0.1
  const jitter = delayWithCap * fraction;
  return Math.max(0, delayWithCap + jitter);
}

/**
 * Generic retry function with exponential backoff
 *
 * @param operation - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves to RetryResult
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await withRetry(async () => {
 *   const response = await fetch('/api/data');
 *   if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *   return response.json();
 * });
 *
 * if (result.success) {
 *   logDebug('Data:', result.data);
 * } else {
 *   logError('Failed after retries:', result.error);
 * }
 *
 * // With custom options
 * const result = await withRetry(
 *   () => apiCall(),
 *   {
 *     maxAttempts: 5,
 *     initialDelayMs: 500,
 *     maxDelayMs: 10000,
 *     onRetry: (error, attempt, delay) => {
 *       logDebug(`Attempt ${attempt} failed, retrying in ${delay}ms`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 3e4,
    backoffMultiplier = 2,
    useJitter = true,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  const startTime = Date.now();
  let lastError: unknown;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      const data = await operation();
      return {
        data,
        success: true,
        attempts: attempt,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt or if shouldRetry returns false
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        break;
      }

      // Calculate delay and wait before retry
      const delayMs = calculateDelay(attempt, {
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier,
        useJitter,
      });

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(error, attempt, delayMs);
      }

      await sleep(delayMs);
    }
  }

  return {
    error: lastError,
    success: false,
    attempts: attempt,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Specialized retry function for HTTP requests
 *
 * @example
 * ```typescript
 * const result = await withHttpRetry(async () => {
 *   const response = await fetch('/api/trucks');
 *   if (!response.ok) {
 *     throw new HttpError(response.status, response.statusText);
 *   }
 *   return response.json();
 * });
 * ```
 */
export async function withHttpRetry<T>(
  operation: () => Promise<T>,
  options: Omit<RetryOptions, 'shouldRetry'> & {
    /** Custom HTTP status codes to retry (default: 429, 500-599) */
    retryStatuses?: number[];
  } = {},
): Promise<RetryResult<T>> {
  const {
    retryStatuses = [429, 408, ...Array.from({ length: 100 }, (_, i) => 500 + i)],
    ...retryOptions
  } = options;

  return withRetry(operation, {
    ...retryOptions,
    shouldRetry: (error: unknown, attempt: number) => {
      const withinAttempts = attempt < (retryOptions.maxAttempts ?? 3);
      const isHttpRetry =
        error != undefined && typeof error === 'object' && 'status' in error
          ? retryStatuses.includes((error as { status: number }).status)
          : false;
      const isNetworkRetry = error instanceof TypeError && error.message.includes('fetch');
      return withinAttempts && (isHttpRetry ?? isNetworkRetry);
    },
  });
}

/**
 * HTTP Error class for better error handling
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}

/**
 * Utility to create a fetch wrapper with retry logic
 *
 * @example
 * ```typescript
 * const retryFetch = createRetryFetch({
 *   maxAttempts: 3,
 *   initialDelayMs: 1000
 * });
 *
 * try {
 *   const response = await retryFetch('/api/trucks');
 *   const data = await response.json();
 * } catch (error) {
 *   logError('Request failed after retries:', error);
 * }
 * ```
 */
export function createRetryFetch(options: RetryOptions = {}) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const result = await withHttpRetry(async () => {
      const response = await fetch(input, init);

      if (!response.ok) {
        throw new HttpError(response.status, response.statusText);
      }

      return response;
    }, options);

    if (result.success && result.data) {
      return result.data;
    }

    const thrown = result.error;
    if (thrown instanceof Error) {
      throw thrown;
    }
    throw new Error('Request failed after retries');
  };
}
