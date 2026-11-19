import { describe, it, expect } from '@jest/globals';
import { buildTruckMetadata } from '@/lib/seo/truckMetadata';
import type { Metadata } from 'next';

describe('buildTruckMetadata', () => {
  const baseRow = {
    id: 'truck-1',
    slug: 'mustard-seed',
    name: 'Mustard Seed Eatery LLC',
    description: 'Best soul food in Augusta',
    cuisine_type: ['Southern', 'Soul Food', 'Seafood', 'American'],
    city: 'Augusta',
    state: 'GA',
    image_url: 'https://example.com/truck.jpg',
    is_active: true,
    social_media: {} as Record<string, unknown>,
  };

  it('should include OG image from image_url when available', () => {
    const meta = buildTruckMetadata(baseRow, 'mustard-seed');
    expect(meta.openGraph).toBeDefined();
    const images = meta.openGraph?.images as Array<Record<string, unknown>>;
    expect(images).toBeDefined();
    expect(images[0].url).toBe('https://example.com/truck.jpg');
    expect(images[0].width).toBe(1200);
    expect(images[0].height).toBe(630);
    expect(images[0].alt).toBe('Mustard Seed Eatery LLC');
  });

  it('should fall back to social_media photo_url when image_url is missing', () => {
    const row = { ...baseRow, image_url: null, social_media: { photo_url: 'https://cdn.example.com/kb-photo.jpg' } };
    const meta = buildTruckMetadata(row, 'mustard-seed');
    const images = meta.openGraph?.images as Array<Record<string, unknown>>;
    expect(images[0].url).toBe('https://cdn.example.com/kb-photo.jpg');
  });

  it('should fall back to default OG image when no image is available', () => {
    const row = { ...baseRow, image_url: null, social_media: {} };
    const meta = buildTruckMetadata(row, 'no-image');
    const images = meta.openGraph?.images as Array<Record<string, unknown>>;
    expect(images).toBeDefined();
    expect(images[0].url).toBe('https://www.truckfull.food/api/og/default');
  });

  it('should keep title under or equal to 60 characters', () => {
    const meta = buildTruckMetadata(baseRow, 'mustard-seed');
    const title = meta.title as string;
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('should include canonical URL', () => {
    const meta = buildTruckMetadata(baseRow, 'mustard-seed');
    expect(meta.alternates?.canonical).toBe('https://www.truckfull.food/mustard-seed');
  });

  it('should include twitter card with summary_large_image when image exists', () => {
    const meta = buildTruckMetadata(baseRow, 'mustard-seed');
    expect(meta.twitter?.card).toBe('summary_large_image');
    const images = meta.twitter?.images as string[];
    expect(images[0]).toBe('https://example.com/truck.jpg');
  });

  it('should include twitter card with summary_large_image when only default OG is available', () => {
    const row = { ...baseRow, image_url: null, social_media: {} };
    const meta = buildTruckMetadata(row, 'mustard-seed');
    expect(meta.twitter?.card).toBe('summary_large_image');
    const images = meta.twitter?.images as string[];
    expect(images[0]).toBe('https://www.truckfull.food/api/og/default');
  });

  it('should generate compelling description with CTA when city and cuisine available', () => {
    const row = { ...baseRow, has_menu: true, has_hours: true };
    const meta = buildTruckMetadata(row, 'mustard-seed');
    const desc = meta.description as string;
    expect(desc).toContain('Mustard Seed Eatery LLC');
    expect(desc).toContain('Augusta');
    expect(desc).toContain('Southern');
    expect(desc).toContain('menu');
    expect(desc).toContain('hours');
  });

  it('should generate description without cuisine when cuisine_type is empty', () => {
    const row = { ...baseRow, cuisine_type: [], has_menu: true, has_hours: true };
    const meta = buildTruckMetadata(row, 'mustard-seed');
    const desc = meta.description as string;
    expect(desc).toContain('Mustard Seed Eatery LLC');
    expect(desc).toContain('Augusta');
    expect(desc).toContain('menu');
    expect(desc).toContain('hours');
  });

  it('should generate description without location when city and state are missing', () => {
    const row = { ...baseRow, city: null, state: null, has_menu: true, has_hours: true };
    const meta = buildTruckMetadata(row, 'mustard-seed');
    const desc = meta.description as string;
    expect(desc).toContain('Mustard Seed Eatery LLC');
    expect(desc).toContain('on TruckFull');
    expect(desc).toContain('menu');
    expect(desc).toContain('hours');
  });

  it('should omit menu from description when has_menu is false', () => {
    const row = { ...baseRow, has_menu: false, has_hours: true };
    const meta = buildTruckMetadata(row, 'mustard-seed');
    const desc = meta.description as string;
    expect(desc).not.toContain('menu');
    expect(desc).toContain('hours');
    expect(desc).toContain('contact information');
  });

  it('should omit hours from description when has_hours is false', () => {
    const row = { ...baseRow, has_menu: true, has_hours: false };
    const meta = buildTruckMetadata(row, 'mustard-seed');
    const desc = meta.description as string;
    expect(desc).toContain('menu');
    expect(desc).not.toContain('hours');
    expect(desc).toContain('contact information');
  });

  it('should append cuisine for regional/demonym cuisine adjectives', () => {
    const row = { ...baseRow, cuisine_type: ['Southern'], has_menu: true, has_hours: true };
    const meta = buildTruckMetadata(row, 'southern-truck');
    const desc = meta.description as string;
    expect(desc).toContain('Serving Southern cuisine');
  });

  it('should skip cuisine append for noun-style cuisine types', () => {
    const row = { ...baseRow, cuisine_type: ['Tacos'], has_menu: true, has_hours: true };
    const meta = buildTruckMetadata(row, 'taco-truck');
    const desc = meta.description as string;
    expect(desc).toContain('Serving Tacos');
    expect(desc).not.toContain('cuisine');
  });

  it('should include cuisine names that already contain food without extra wording', () => {
    const row = { ...baseRow, cuisine_type: ['Soul Food'], has_menu: true, has_hours: true };
    const meta = buildTruckMetadata(row, 'soul-food-truck');
    const desc = meta.description as string;
    expect(desc).toContain('Serving Soul Food');
  });

  it('should include cuisine in title when it fits within 60 chars', () => {
    const shortNameRow = { ...baseRow, name: 'Taco Truck', cuisine_type: ['Mexican'] };
    const meta = buildTruckMetadata(shortNameRow, 'taco-truck');
    const title = meta.title as string;
    expect(title).toContain('Mexican');
    expect(title).toContain('Augusta');
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('should fall back to shorter title template when cuisine makes it too long', () => {
    const meta = buildTruckMetadata(baseRow, 'mustard-seed');
    const title = meta.title as string;
    expect(title).not.toContain('Southern');
    expect(title).toContain('Augusta');
    expect(title.length).toBeLessThanOrEqual(60);
  });
});
