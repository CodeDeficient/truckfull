const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry {
  data: unknown[];
  timestamp: number;
  radiusCap?: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedEvents<T>(key: string): { events: T[]; radiusCap?: number } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return { events: entry.data as T[], radiusCap: entry.radiusCap };
}

export function setCachedEvents(key: string, data: unknown[], radiusCap?: number): void {
  cache.set(key, { data, timestamp: Date.now(), radiusCap });
}

export function clearCache(): void {
  cache.clear();
}
