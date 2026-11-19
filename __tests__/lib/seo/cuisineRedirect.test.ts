import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { shouldRedirectToCuisine, collectCuisineSlugs, cuisineMetadataForSlug, createTtlCache } from '@/lib/seo/cuisineRedirect';
import type { CuisineSlugEntry } from '@/lib/seo/cuisineRedirect';

describe('shouldRedirectToCuisine', () => {
  const knownCuisines = ['bbq', 'tacos', 'mexican', 'southern', 'soul-food'];

  it('should return redirect URL for known cuisine slug', () => {
    const result = shouldRedirectToCuisine('bbq', knownCuisines);
    expect(result).toBe('/cuisine/bbq');
  });

  it('should return null for city-like slug', () => {
    const result = shouldRedirectToCuisine('augusta-ga', knownCuisines);
    expect(result).toBeNull();
  });

  it('should return null for unknown cuisine', () => {
    const result = shouldRedirectToCuisine('burgers', knownCuisines);
    expect(result).toBeNull();
  });

  it('should be case-insensitive', () => {
    const result = shouldRedirectToCuisine('BBQ', knownCuisines);
    expect(result).toBe('/cuisine/bbq');
  });

  it('should return null for empty slug', () => {
    const result = shouldRedirectToCuisine('', knownCuisines);
    expect(result).toBeNull();
  });

  it('should return null for empty known cuisine list', () => {
    const result = shouldRedirectToCuisine('bbq', []);
    expect(result).toBeNull();
  });
});

describe('collectCuisineSlugs', () => {
  it('should return empty array for null input', () => {
    expect(collectCuisineSlugs(null)).toEqual([]);
  });

  it('should collect unique cuisine slugs from rows', () => {
    const rows = [
      { cuisine_type: ['BBQ', 'Tacos'] },
      { cuisine_type: ['bbq', 'Mexican'] },
    ];
    const result = collectCuisineSlugs(rows);
    expect(result).toContain('bbq');
    expect(result).toContain('tacos');
    expect(result).toContain('mexican');
    expect(result).toHaveLength(3);
  });

  it('should skip rows with null cuisine_type', () => {
    const rows = [
      { cuisine_type: null },
      { cuisine_type: ['Tacos'] },
    ];
    const result = collectCuisineSlugs(rows);
    expect(result).toEqual(['tacos']);
  });

  it('should return empty array for empty input', () => {
    expect(collectCuisineSlugs([])).toEqual([]);
  });

  it('should deduplicate case-insensitively', () => {
    const rows = [
      { cuisine_type: ['BBQ', 'Bbq', 'bbq'] },
    ];
    const result = collectCuisineSlugs(rows);
    expect(result).toEqual(['bbq']);
  });
});

describe('cuisineMetadataForSlug', () => {
  const knownCuisines: CuisineSlugEntry[] = [
    { slug: 'bbq', displayName: 'BBQ' },
    { slug: 'tacos', displayName: 'Tacos' },
    { slug: 'mexican', displayName: 'Mexican' },
    { slug: 'southern', displayName: 'Southern' },
    { slug: 'soul-food', displayName: 'Soul Food' },
  ];

  it('should return metadata for known cuisine slug', () => {
    const meta = cuisineMetadataForSlug('bbq', knownCuisines);
    expect(meta.title).toBe('BBQ Food Trucks in Georgia & South Carolina | TruckFull');
    expect(meta.description).toContain('bbq');
    expect(meta.canonicalUrl).toContain('/cuisine/bbq');
  });

  it('should be case-insensitive for input slug', () => {
    const meta = cuisineMetadataForSlug('BBQ', knownCuisines);
    expect(meta.title).toBe('BBQ Food Trucks in Georgia & South Carolina | TruckFull');
  });

  it('should return null for city-like slug', () => {
    const meta = cuisineMetadataForSlug('augusta-ga', knownCuisines);
    expect(meta).toBeNull();
  });

  it('should return null for unknown cuisine', () => {
    const meta = cuisineMetadataForSlug('burgers', knownCuisines);
    expect(meta).toBeNull();
  });

  it('should return null for empty slug', () => {
    const meta = cuisineMetadataForSlug('', knownCuisines);
    expect(meta).toBeNull();
  });

  it('should return null for empty known cuisine list', () => {
    const meta = cuisineMetadataForSlug('bbq', []);
    expect(meta).toBeNull();
  });
});

describe('createTtlCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return cached value within TTL', async () => {
    const fetchFn = jest.fn<() => Promise<string>>();
    fetchFn.mockResolvedValue('fresh');
    const cached = createTtlCache(fetchFn, 5000);

    const first = await cached();
    expect(first).toBe('fresh');
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const second = await cached();
    expect(second).toBe('fresh');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('should re-fetch after TTL expires', async () => {
    const fetchFn = jest.fn<() => Promise<string>>();
    fetchFn.mockResolvedValue('old');
    const cached = createTtlCache(fetchFn, 5000);

    await cached();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    fetchFn.mockResolvedValue('new');
    jest.advanceTimersByTime(5001);

    const result = await cached();
    expect(result).toBe('new');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('should handle concurrent calls without double-fetch', async () => {
    let callCount = 0;
    const fetchFn = jest.fn<() => Promise<string>>();
    fetchFn.mockImplementation(async () => {
      callCount++;
      return `result-${callCount}`;
    });
    const cached = createTtlCache(fetchFn, 5000);

    const [r1, r2] = await Promise.all([cached(), cached()]);
    expect(r1).toBe('result-1');
    expect(r2).toBe('result-1');
    expect(callCount).toBe(1);
  });

  it('should recover after a stale fetch failure', async () => {
    const fetchFn = jest.fn<() => Promise<string>>();
    fetchFn
      .mockResolvedValueOnce('cached')
      .mockRejectedValueOnce(new Error('DB down'));

    const cached = createTtlCache(fetchFn, 5000);

    expect(await cached()).toBe('cached');

    jest.advanceTimersByTime(5001);

    await expect(cached()).rejects.toThrow('DB down');

    fetchFn.mockResolvedValue('recovered');
    jest.advanceTimersByTime(5001);

    expect(await cached()).toBe('recovered');
  });
});
