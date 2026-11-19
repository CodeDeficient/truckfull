import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';

import {
  filterIndexNowUrls,
  buildIndexNowBody,
  buildTruckUrl,
  buildBlogUrl,
  buildCityUrl,
  buildCuisineUrl,
  INDEXNOW_KEY,
} from '@/lib/utils/indexNow';

describe('filterIndexNowUrls', () => {
  it('keeps matching www subdomain', () => {
    expect(filterIndexNowUrls(['https://www.truckfull.food/trucks/taco'])).toEqual([
      'https://www.truckfull.food/trucks/taco',
    ]);
  });

  it('keeps bare domain', () => {
    expect(filterIndexNowUrls(['https://truckfull.food/trucks/taco'])).toEqual([
      'https://truckfull.food/trucks/taco',
    ]);
  });

  it('keeps subdomain of bare domain', () => {
    expect(filterIndexNowUrls(['https://api.truckfull.food/trucks/taco'])).toEqual([
      'https://api.truckfull.food/trucks/taco',
    ]);
  });

  it('filters out different hostnames', () => {
    expect(filterIndexNowUrls(['https://www.truckfull.food/trucks/taco', 'https://evil.com/page'])).toEqual(
      ['https://www.truckfull.food/trucks/taco'],
    );
  });

  it('filters out invalid URLs', () => {
    expect(filterIndexNowUrls(['not-a-url', 'https://www.truckfull.food/trucks/taco'])).toEqual(
      ['https://www.truckfull.food/trucks/taco'],
    );
  });

  it('returns empty for all invalid', () => {
    expect(filterIndexNowUrls(['not-a-url', 'https://evil.com'])).toEqual([]);
  });

  it('returns empty for empty input', () => {
    expect(filterIndexNowUrls([])).toEqual([]);
  });

  it('rejects look-alike domain suffix', () => {
    expect(filterIndexNowUrls(['https://www.truckfull.food.evil.com/trucks/taco'])).toEqual([]);
  });

  it('rejects multi-level subdomain', () => {
    expect(filterIndexNowUrls(['https://a.b.truckfull.food/trucks/taco'])).toEqual([]);
  });
});

describe('buildIndexNowBody', () => {
  it('builds correct JSON body for single URL', () => {
    const body = JSON.parse(buildIndexNowBody('https://www.truckfull.food/trucks/taco'));
    expect(body.host).toBe('www.truckfull.food');
    expect(body.key).toBe(INDEXNOW_KEY);
    expect(body.urlList).toEqual(['https://www.truckfull.food/trucks/taco']);
  });
});

describe('URL builders', () => {
  it('builds truck URL from slug — uses clean /{slug} not /trucks/{slug}', () => {
    expect(buildTruckUrl('my-taco-truck')).toBe('https://www.truckfull.food/my-taco-truck');
  });

  it('builds blog URL from slug', () => {
    expect(buildBlogUrl('augusta-food-truck-guide')).toBe(
      'https://www.truckfull.food/blog/augusta-food-truck-guide',
    );
  });

  it('builds city URL from slug — must use /city/ prefix', () => {
    expect(buildCityUrl('augusta-ga')).toBe('https://www.truckfull.food/city/augusta-ga');
    expect(buildCityUrl('charleston-sc')).toBe('https://www.truckfull.food/city/charleston-sc');
  });

  it('builds cuisine URL from slug', () => {
    expect(buildCuisineUrl('bbq')).toBe('https://www.truckfull.food/cuisine/bbq');
  });
});

describe('pingIndexNow', () => {
  let pingIndexNow: (urls: string[]) => Promise<void>;

  const originalFetch = globalThis.fetch;

  beforeAll(async () => {
    globalThis.fetch = jest.fn() as unknown as typeof fetch;
    const mod = await import('@/lib/utils/indexNow');
    pingIndexNow = mod.pingIndexNow;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('does nothing for empty array', async () => {
    await pingIndexNow([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does nothing when all URLs are invalid', async () => {
    await pingIndexNow(['not-a-url', 'https://evil.com']);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls fetch with correct endpoint and method', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    await pingIndexNow(['https://www.truckfull.food/my-taco-truck']);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.indexnow.org/indexnow',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends correct JSON body', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    await pingIndexNow(['https://www.truckfull.food/my-taco-truck']);
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.host).toBe('www.truckfull.food');
    expect(body.key).toBe(INDEXNOW_KEY);
    expect(body.urlList).toEqual(['https://www.truckfull.food/my-taco-truck']);
  });

  it('handles non-ok response without throwing', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400, statusText: 'Bad Request' });
    await expect(pingIndexNow(['https://www.truckfull.food/my-taco-truck'])).resolves.not.toThrow();
  });

  it('handles fetch errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));
    await expect(pingIndexNow(['https://www.truckfull.food/my-taco-truck'])).resolves.not.toThrow();
  });
});
