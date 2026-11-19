/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { unstable_cache, revalidateTag } from 'next/cache';

const EXPECTED_FIELDS = [
  'id',
  'name',
  'slug',
  'description',
  'cuisine_type',
  'city',
  'state',
  'updated_at',
  'contact_info',
  'social_media',
  'current_location',
  'default_lat',
  'default_lng',
  'live_gps_lat',
  'live_gps_lng',
  'status',
  'price_range',
  'menu',
    'operating_hours',
    'timezone',
  'is_active',
  'average_rating',
  'review_count',
  'is_claimed',
  'schedule_updated_at',
  'schedule_updated_by',
];

type ImportedModule = typeof import('@/lib/services/publicTruckPage');
type MockedBuildClient = typeof import('@/lib/supabase/build-client');

let publicTruckPage: ImportedModule;
let mockBuildClient: MockedBuildClient;

jest.unstable_mockModule('@/lib/supabase/admin', async () => {
  const { getSupabaseBuild } = await import('@/lib/supabase/build-client');
  return { getSupabaseAdmin: getSupabaseBuild, getSupabasePublicReader: getSupabaseBuild };
});

beforeAll(async () => {
  publicTruckPage = await import('@/lib/services/publicTruckPage');
  mockBuildClient = await import('@/lib/supabase/build-client');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockBuildClient.setSupabaseMockResult(null);
});

const truckRow = {
  id: 'truck-1',
  name: 'Taco Mama',
  slug: 'taco-mama',
  description: 'Great tacos',
  cuisine_type: ['Mexican'],
  city: 'Augusta',
  state: 'GA',
  updated_at: '2026-01-01T00:00:00Z',
  contact_info: null,
  social_media: null,
  current_location: null,
  price_range: '$$',
  menu: null,
  operating_hours: null,
  is_active: true,
  average_rating: 4.5,
  review_count: 12,
};

describe('PUBLIC_TRUCK_SELECT_FIELDS', () => {
  it('contains exactly the 26 canonical fields', () => {
    expect([...publicTruckPage.PUBLIC_TRUCK_SELECT_FIELDS]).toEqual(EXPECTED_FIELDS);
  });

  it('contains no duplicates', () => {
    const fields = publicTruckPage.PUBLIC_TRUCK_SELECT_FIELDS;
    expect(new Set(fields).size).toBe(fields.length);
  });
});

describe('getPublicTruckBySlug', () => {
  it('queries the canonical projection filtered by slug and is_active', async () => {
    mockBuildClient.setSupabaseMockResult(truckRow);

    const result = await publicTruckPage.getPublicTruckBySlug('taco-mama');

    expect(result).toEqual(truckRow);
    expect(mockBuildClient.getSupabaseBuild).toHaveBeenCalledTimes(1);

    const chain = mockBuildClient.getSupabaseChain();
    expect(chain?.from).toHaveBeenCalledWith('food_trucks');
    expect(chain?.select).toHaveBeenCalledWith(EXPECTED_FIELDS.join(', '));
    expect(chain?.eq).toHaveBeenCalledWith('slug', 'taco-mama');
    expect(chain?.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('returns the row when the query succeeds', async () => {
    mockBuildClient.setSupabaseMockResult(truckRow);

    const result = await publicTruckPage.getPublicTruckBySlug('taco-mama');

    expect(result).toEqual(truckRow);
  });

  it('returns null (cacheable miss) when no row matches', async () => {
    mockBuildClient.setSupabaseMockResult(null);

    const result = await publicTruckPage.getPublicTruckBySlug('miss-truck');

    expect(result).toBeNull();
  });

  it('uses the per-slug cache key, approved fallback, and both tags', async () => {
    mockBuildClient.setSupabaseMockResult(null);

    await publicTruckPage.getPublicTruckBySlug('config-truck');

    expect(unstable_cache).toHaveBeenCalledWith(
      expect.any(Function),
      ['public-truck-by-slug-v4', 'config-truck'],
      { revalidate: 86_400, tags: ['public-trucks', 'public-truck:config-truck'] },
    );
  });

  it('serves repeated same-slug calls without errors', async () => {
    mockBuildClient.setSupabaseMockResult(truckRow);

    const [first, second] = await Promise.all([
      publicTruckPage.getPublicTruckBySlug('dedup-truck'),
      publicTruckPage.getPublicTruckBySlug('dedup-truck'),
    ]);

    expect(first).toEqual(truckRow);
    expect(second).toEqual(truckRow);
  });

  it.each(['admin', 'augusta-ga', 'a'])(
    'rejects reserved, city-pattern, and invalid slugs without querying: %s',
    async (slug) => {
      const result = await publicTruckPage.getPublicTruckBySlug(slug);

      expect(result).toBeNull();
      expect(mockBuildClient.getSupabaseBuild).not.toHaveBeenCalled();
    },
  );
});

describe('publicTruckTag', () => {
  it('normalizes case and whitespace into the per-slug tag', () => {
    expect(publicTruckPage.publicTruckTag('Taco-Mama')).toBe('public-truck:taco-mama');
    expect(publicTruckPage.publicTruckTag(' taco-mama ')).toBe('public-truck:taco-mama');
  });
});

describe('invalidatePublicTruckBySlug', () => {
  it('calls revalidateTag with the per-slug tag and { expire: 0 }', () => {
    publicTruckPage.invalidatePublicTruckBySlug('taco-mama');

    expect(revalidateTag).toHaveBeenCalledWith('public-truck:taco-mama', { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith('public-trucks', { expire: 0 });
  });

  it('normalizes the slug before tagging', () => {
    publicTruckPage.invalidatePublicTruckBySlug('Taco-Mama');
    expect(revalidateTag).toHaveBeenCalledWith('public-truck:taco-mama', { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith('public-trucks', { expire: 0 });
  });

  it('can be called multiple times for different slugs', () => {
    publicTruckPage.invalidatePublicTruckBySlug('truck-a');
    publicTruckPage.invalidatePublicTruckBySlug('truck-b');
    expect(revalidateTag).toHaveBeenCalledTimes(4);
    expect(revalidateTag).toHaveBeenCalledWith('public-truck:truck-a', { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith('public-truck:truck-b', { expire: 0 });
  });
});
