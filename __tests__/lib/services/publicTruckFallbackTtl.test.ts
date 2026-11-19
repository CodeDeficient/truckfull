/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { unstable_cache } from 'next/cache';
import {
  PUBLIC_TRUCK_FALLBACK_TTL,
  shortenPublicTruckCacheLifetime,
} from '@/lib/services/publicTruckFallbackTtl';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PUBLIC_TRUCK_FALLBACK_TTL', () => {
  it('is five minutes', () => {
    expect(PUBLIC_TRUCK_FALLBACK_TTL).toBe(300);
  });
});

describe('shortenPublicTruckCacheLifetime', () => {
  it('registers a short-lived unstable_cache entry under the fallback key', async () => {
    await shortenPublicTruckCacheLifetime();

    expect(unstable_cache).toHaveBeenCalledWith(
      expect.any(Function),
      ['public-truck-fallback-ttl'],
      { revalidate: 300 },
    );
  });

  it('resolves to undefined when the cache call succeeds', async () => {
    await expect(shortenPublicTruckCacheLifetime()).resolves.toBeUndefined();
  });

  it('swallows errors thrown outside a Next render so the page never breaks', async () => {
    jest.mocked(unstable_cache).mockImplementationOnce(() => {
      throw new Error('incrementalCache missing');
    });

    await expect(shortenPublicTruckCacheLifetime()).resolves.toBeUndefined();
  });

  it('swallows rejections from the cached call', async () => {
    jest.mocked(unstable_cache).mockImplementationOnce(() => {
      return () => Promise.reject(new Error('render context unavailable'));
    });

    await expect(shortenPublicTruckCacheLifetime()).resolves.toBeUndefined();
  });
});
