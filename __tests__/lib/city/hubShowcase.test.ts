import { describe, expect, it } from '@jest/globals';
import { HUB_SHOWCASE_SLUGS, pickShowcasePhotos } from '@/lib/city/hubShowcase';

describe('pickShowcasePhotos', () => {
  it('returns photos in curated order and skips slugs without a photo or catalog row', () => {
    const catalog = [
      { slug: 'b', photo_url: 'https://example.com/b.jpg' },
      { slug: 'a', photo_url: 'https://example.com/a.jpg' },
      { slug: 'c', photo_url: null },
      { slug: null, photo_url: 'https://example.com/none.jpg' },
    ];
    expect(pickShowcasePhotos(catalog, ['a', 'missing', 'c', 'b'])).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/b.jpg',
    ]);
  });

  it('keeps the curated list free of duplicates', () => {
    expect(new Set(HUB_SHOWCASE_SLUGS).size).toBe(HUB_SHOWCASE_SLUGS.length);
  });
});
