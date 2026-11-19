const NETWORK_RETRY_DELAYS_MS = [250, 500] as const;

const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

export function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return error.message.includes('fetch failed');
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    if (code && NETWORK_ERROR_CODES.has(code)) return true;
    if (error.message.includes('fetch failed')) return true;
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) return isRetryableNetworkError(cause);
  }
  return false;
}

export async function withFetchRetry<T>(
  fetchOnce: () => Promise<T>,
  delays: readonly number[] = NETWORK_RETRY_DELAYS_MS,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fetchOnce();
    } catch (error) {
      if (attempt >= delays.length || !isRetryableNetworkError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      attempt += 1;
    }
  }
}
