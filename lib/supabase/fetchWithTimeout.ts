export const SESSION_FETCH_TIMEOUT_MS = 5000;
export const PUBLIC_READ_TIMEOUT_MS = 15_000;
export const EXTERNAL_API_TIMEOUT_MS = 10_000;

export function fetchWithTimeout(
  timeoutMs: number,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): typeof fetch {
  return (input, init) => {
    const limit = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, limit]) : limit;
    return fetchImpl(input, { ...init, signal });
  };
}
