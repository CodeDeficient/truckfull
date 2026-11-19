export function createTtlCache<T>(
  fetchFn: () => Promise<T>,
  ttlMs: number,
): () => Promise<T> {
  let cached: T | null = null;
  let lastFetch = 0;
  let inFlight: Promise<T> | null = null;

  return async (): Promise<T> => {
    const now = Date.now();
    if (cached !== null && now - lastFetch < ttlMs) {
      return cached;
    }

    if (inFlight) {
      return inFlight;
    }

    inFlight = fetchFn()
      .then((result) => {
        cached = result;
        lastFetch = Date.now();
        return result;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };
}
