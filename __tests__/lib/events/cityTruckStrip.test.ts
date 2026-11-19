import { describe, expect, it } from '@jest/globals';
import { pickCityTruckStrip, type CityTruckStripSource } from '@/lib/events/cityTruckStrip';

function truck(
  overrides: Partial<CityTruckStripSource> & { readonly id: string },
): CityTruckStripSource {
  return {
    name: `Truck ${overrides.id}`,
    slug: `truck-${overrides.id}`,
    city: 'Charleston',
    state: 'SC',
    photo_url: `https://example.com/${overrides.id}.jpg`,
    cuisine_type: ['Mexican'],
    data_quality_score: 50,
    ...overrides,
  };
}

describe('pickCityTruckStrip', () => {
  it('keeps only trucks in the city, best data first', () => {
    const catalog = [
      truck({ id: 'a', data_quality_score: 40 }),
      truck({ id: 'b', data_quality_score: 90 }),
      truck({ id: 'c', city: 'Columbia' }),
      truck({ id: 'd', data_quality_score: null }),
    ];
    const strip = pickCityTruckStrip(catalog, 'charleston', 'SC');
    expect(strip.trucks.map((t) => t.id)).toEqual(['b', 'a', 'd']);
    expect(strip.totalInCity).toBe(3);
  });

  it('puts photo trucks first, keeps logo-only trucks, and skips trucks without a page', () => {
    const catalog = [
      truck({ id: 'a', photo_url: null, data_quality_score: 99 }),
      truck({ id: 'b', slug: null }),
      truck({ id: 'c', photo_url: '' }),
      truck({ id: 'd', data_quality_score: 10 }),
    ];
    const strip = pickCityTruckStrip(catalog, 'Charleston', 'SC');
    expect(strip.trucks.map((t) => t.id)).toEqual(['d', 'a', 'c']);
    expect(strip.trucks.map((t) => t.photoUrl)).toEqual(['https://example.com/d.jpg', null, null]);
    expect(strip.totalInCity).toBe(4);
  });

  it('stops at the requested size', () => {
    const catalog = Array.from({ length: 20 }, (_, i) => truck({ id: String(i) }));
    expect(pickCityTruckStrip(catalog, 'Charleston', 'SC', 5).trucks).toHaveLength(5);
    expect(pickCityTruckStrip(catalog, 'Charleston', 'SC').trucks).toHaveLength(16);
  });
});
