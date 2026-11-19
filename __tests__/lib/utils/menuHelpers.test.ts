/**
 * Menu Helpers Tests
 */

import { flattenMenu } from '@/lib/utils/menuHelpers';

describe('menuHelpers', () => {
  describe('flattenMenu', () => {
    it('should be a function', () => {
      expect(typeof flattenMenu).toBe('function');
    });

    it('should return empty array for undefined input', () => {
      expect(flattenMenu(undefined as unknown as any[])).toEqual([]);
    });

    it('should return empty array for null input', () => {
      expect(flattenMenu(null as unknown as any[])).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      expect(flattenMenu('string' as unknown as any[])).toEqual([]);
      expect(flattenMenu(123 as unknown as any[])).toEqual([]);
      expect(flattenMenu({} as unknown as any[])).toEqual([]);
    });

    it('should return empty array for empty array input', () => {
      expect(flattenMenu([])).toEqual([]);
    });

    it('should flatten nested menu structure with categories and items', () => {
      const menu = [
        {
          category: 'Tacos',
          items: [
            { name: 'Al Pastor', price: 3.5 },
            { name: 'Carnitas', price: 3.5 },
          ],
        },
        {
          category: 'Beverages',
          items: [{ name: 'Horchata', price: 2.0 }],
        },
      ];

      const result = flattenMenu(menu);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: 'Al Pastor', price: 3.5, category: 'Tacos' });
      expect(result[1]).toEqual({ name: 'Carnitas', price: 3.5, category: 'Tacos' });
      expect(result[2]).toEqual({ name: 'Horchata', price: 2.0, category: 'Beverages' });
    });

    it('should use "Other" as default category when category is missing', () => {
      const menu = [
        {
          category: '',
          items: [{ name: 'Mystery Item', price: 1.0 }],
        },
      ];

      const result = flattenMenu(menu);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Other');
    });

    it('should preserve item properties when spreading', () => {
      const menu = [
        {
          category: 'Specials',
          items: [
            {
              name: 'Taco Special',
              price: 5.99,
              description: 'Two tacos with sides',
              spicy: true,
            },
          ],
        },
      ];

      const result = flattenMenu(menu);

      expect(result[0]).toEqual({
        name: 'Taco Special',
        price: 5.99,
        category: 'Specials',
        description: 'Two tacos with sides',
        spicy: true,
      });
    });

    it('should convert string prices to numbers', () => {
      const menu = [
        {
          category: 'Tacos',
          items: [{ name: 'Al Pastor', price: '3.50' }],
        },
      ];

      const result = flattenMenu(menu);

      expect(result[0].price).toBe(3.5);
      expect(typeof result[0].price).toBe('number');
    });

    it('should set price to null when price is falsy', () => {
      const menu = [
        {
          category: 'Specials',
          items: [{ name: 'Free Sample', price: 0 }],
        },
      ];

      const result = flattenMenu(menu);

      expect(result[0].price).toBeNull();
    });

    it('should set price to null when price is undefined', () => {
      const menu = [
        {
          category: 'Specials',
          items: [{ name: 'Free Sample' }],
        },
      ];

      const result = flattenMenu(menu);

      expect(result[0].price).toBeNull();
    });

    it('should handle category without items', () => {
      const menu = [
        {
          category: 'Empty Category',
        },
      ];

      const result = flattenMenu(menu);

      expect(result).toEqual([]);
    });

    it('should handle items that are not an array', () => {
      const menu = [
        {
          category: 'Invalid',
          items: 'not an array',
        },
      ];

      const result = flattenMenu(menu);

      expect(result).toEqual([]);
    });

    it('should handle multiple categories with multiple items', () => {
      const menu = [
        {
          category: 'Appetizers',
          items: [
            { name: 'Chips', price: 3 },
            { name: 'Guac', price: 5 },
          ],
        },
        {
          category: 'Main',
          items: [
            { name: 'Burrito', price: 10 },
            { name: 'Taco Plate', price: 9 },
          ],
        },
        {
          category: 'Desserts',
          items: [{ name: 'Churros', price: 4 }],
        },
      ];

      const result = flattenMenu(menu);

      expect(result).toHaveLength(5);
      expect(result.map((i: { name: string }) => i.name)).toEqual([
        'Chips',
        'Guac',
        'Burrito',
        'Taco Plate',
        'Churros',
      ]);
    });

    it('should handle numeric category values', () => {
      const menu = [
        {
          category: 123,
          items: [{ name: 'Item', price: 1 }],
        },
      ];

      const result = flattenMenu(menu);

      expect(result[0].category).toBe(123);
    });
  });
});
