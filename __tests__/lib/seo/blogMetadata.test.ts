import { describe, it, expect } from '@jest/globals';
import { buildBlogMetadata } from '@/lib/seo/blogMetadata';

describe('buildBlogMetadata', () => {
  const basePost = {
    slug: 'charleston-sc-food-truck-guide-2026',
    title: 'Complete Guide to Charleston SC Food Trucks (2026)',
    body: 'Lorem ipsum...',
    excerpt: 'Discover the best food trucks in Charleston SC for 2026.',
    author: 'TruckFull Team',
    published_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    meta_description: null,
    og_image: 'https://example.com/blog-og.jpg',
  };

  it('should return title WITHOUT "| TruckFull Blog" suffix (layout template handles it)', () => {
    const meta = buildBlogMetadata(basePost);
    expect(meta.title).toBe('Complete Guide to Charleston SC Food Trucks (2026)');
    expect(meta.title).not.toContain('TruckFull Blog');
  });

  it('should include canonical URL', () => {
    const meta = buildBlogMetadata(basePost);
    expect(meta.alternates?.canonical).toBe(
      'https://www.truckfull.food/blog/charleston-sc-food-truck-guide-2026',
    );
  });

  it('should include OG image when og_image is present', () => {
    const meta = buildBlogMetadata(basePost);
    const ogImages = meta.openGraph?.images as Array<Record<string, unknown>>;
    expect(ogImages).toBeDefined();
    expect(ogImages[0].url).toBe('https://example.com/blog-og.jpg');
  });

  it('should not include images when og_image is absent', () => {
    const post = { ...basePost, og_image: null };
    const meta = buildBlogMetadata(post);
    expect(meta.openGraph?.images).toBeUndefined();
  });

  it('should use meta_description when available', () => {
    const post = { ...basePost, meta_description: 'Custom meta description' };
    const meta = buildBlogMetadata(post);
    expect(meta.description).toBe('Custom meta description');
  });

  it('should fall back to excerpt when meta_description is absent', () => {
    const post = { ...basePost, meta_description: null, excerpt: 'Fallback excerpt' };
    const meta = buildBlogMetadata(post);
    expect(meta.description).toBe('Fallback excerpt');
  });

  it('should include twitter card metadata', () => {
    const meta = buildBlogMetadata(basePost);
    expect(meta.twitter?.card).toBe('summary_large_image');
    expect(meta.twitter?.title).toBe(basePost.title);
  });
});
