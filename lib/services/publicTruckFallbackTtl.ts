import { unstable_cache } from 'next/cache';

export const PUBLIC_TRUCK_FALLBACK_TTL = 300;

export async function shortenPublicTruckCacheLifetime(): Promise<void> {
  try {
    await unstable_cache(async (): Promise<boolean> => true, ['public-truck-fallback-ttl'], {
      revalidate: PUBLIC_TRUCK_FALLBACK_TTL,
    })();
  } catch {
    return;
  }
}
