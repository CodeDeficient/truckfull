import { Redis } from '@upstash/redis';
import { logMessage, logError } from '@/lib/logging';
import type { EventVettingResult } from '@/lib/events/eventVetting';
import type { EventSource } from '@/lib/events/vettingTypes';

const STORE_CACHE_PREFIX = 'vetting_store:';
const STORE_CACHE_TTL = 24 * 60 * 60;

let redisClient: Redis | null = null;
let hasLoggedRedisWarning = false;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!hasLoggedRedisWarning) {
      hasLoggedRedisWarning = true;
      logError('[VETTING STORE] Upstash Redis not configured. Store caching disabled.');
    }
    return null;
  }

  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redisClient;
}

function storeKey(eventId: string, source: EventSource): string {
  return `${STORE_CACHE_PREFIX}${source}:${eventId}`;
}

export async function getVettingResult(
  eventId: string,
  source: EventSource,
): Promise<EventVettingResult | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get<EventVettingResult>(storeKey(eventId, source));
    return cached ?? null;
  } catch (error) {
    logError('Redis getVettingResult error:', error);
    return null;
  }
}

export async function clearAllVettingStoreEntries(): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;

  let cleared = 0;
  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: `${STORE_CACHE_PREFIX}*`,
        count: 100,
      });
      cursor = Number(nextCursor);
      if (keys.length > 0) {
        await redis.del(...keys);
        cleared += keys.length;
      }
    } while (cursor !== 0);
    logMessage(`Cleared ${cleared} vetting store entries from Redis`);
  } catch (error) {
    logError('Redis clearAllVettingStoreEntries error:', error);
  }
  return cleared;
}

export async function saveVettingResult(
  eventId: string,
  source: EventSource,
  result: EventVettingResult,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(storeKey(eventId, source), result, { ex: STORE_CACHE_TTL });
    logMessage(`Stored vetting result for event ${eventId} (${source})`);
  } catch (error) {
    logError('Redis saveVettingResult error:', error);
  }
}
