import { describe, expect, it } from '@jest/globals';
import {
  CUISINE_SLUG_REDIRECTS,
  MENU_ITEM_CUISINES,
  cuisineRedirects,
} from '@/redirects/cuisine-redirects.mjs';
import { slugifyCuisine } from '@/lib/utils/slugify';

describe('cuisine redirects', () => {
  it('redirects every menu item cuisine page to its cuisine', () => {
    for (const [item, cuisine] of Object.entries(MENU_ITEM_CUISINES)) {
      expect(CUISINE_SLUG_REDIRECTS[slugifyCuisine(item)]).toBe(slugifyCuisine(cuisine));
    }
  });

  it('keeps the legacy dessert and barbecue redirects', () => {
    expect(CUISINE_SLUG_REDIRECTS.dessert).toBe('desserts');
    expect(CUISINE_SLUG_REDIRECTS.barbecue).toBe('bbq');
  });

  it('redirects retired cuisine slugs that still get search traffic', () => {
    expect(CUISINE_SLUG_REDIRECTS).toMatchObject({
      candy: 'desserts',
      'dirty-sodas': 'beverages',
      'smash-burgers': 'american',
      'chicken-wings': 'american',
      'fried-chicken': 'southern',
    });
  });

  it('never redirects to another redirect source', () => {
    for (const destination of Object.values(CUISINE_SLUG_REDIRECTS)) {
      expect(Object.hasOwn(CUISINE_SLUG_REDIRECTS, destination)).toBe(false);
    }
  });

  it('emits permanent Next redirects under /cuisine', () => {
    expect(cuisineRedirects).toContainEqual({
      source: '/cuisine/hot-dogs',
      destination: '/cuisine/american',
      permanent: true,
    });
    expect(cuisineRedirects).toHaveLength(Object.keys(CUISINE_SLUG_REDIRECTS).length);
  });

  it('treats pizza as a cuisine, not a menu item', () => {
    expect(MENU_ITEM_CUISINES).not.toHaveProperty('pizza');
    expect(CUISINE_SLUG_REDIRECTS).not.toHaveProperty('pizza');
  });
});
