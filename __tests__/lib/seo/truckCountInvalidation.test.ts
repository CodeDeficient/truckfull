/**
 * @jest-environment node
 */

import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { revalidatePath, revalidateTag } from 'next/cache';

import {
  TRUCK_COUNT_CACHE_TAG,
  TRUCK_COUNT_METADATA_CACHE_TAG,
} from '@/lib/seo/getTruckCount';

const revalidateTagMock = revalidateTag as unknown as jest.Mock;
const revalidatePathMock = revalidatePath as unknown as jest.Mock;

describe('truck count invalidation', () => {
  let invalidateMetadataTruckCount: typeof import('@/lib/seo/truckCountInvalidation').invalidateMetadataTruckCount;

  beforeAll(async () => {
    ({ invalidateMetadataTruckCount } = await import('@/lib/seo/truckCountInvalidation'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('expires both truck-count caches and revalidates the home route', () => {
    invalidateMetadataTruckCount();

    expect(revalidateTagMock).toHaveBeenCalledWith(TRUCK_COUNT_METADATA_CACHE_TAG, { expire: 0 });
    expect(revalidateTagMock).toHaveBeenCalledWith(TRUCK_COUNT_CACHE_TAG, { expire: 0 });
    expect(revalidatePathMock).toHaveBeenCalledWith('/');
  });

  it('expires the metadata cache before any other tag so the metadata snapshot is never stale', () => {
    invalidateMetadataTruckCount();

    expect(revalidateTagMock.mock.calls[0]?.[0]).toBe(TRUCK_COUNT_METADATA_CACHE_TAG);
  });

  it('uses immediate expiration rather than stale-while-revalidate', () => {
    invalidateMetadataTruckCount();

    for (const call of revalidateTagMock.mock.calls) {
      expect(call[1]).toEqual({ expire: 0 });
    }
  });
});
