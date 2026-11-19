import { flattenMenu } from '../lib/utils/menuHelpers';
import { generateSlug } from '../lib/utils/slug';

describe('Parser Utilities', () => {
  describe('generateSlug', () => {
    it('should lowercase and hyphenate names', () => {
      expect(generateSlug('Poppin Smoke BBQ')).toBe('poppin-smoke-bbq');
    });

    it('should handle special characters', () => {
      expect(generateSlug("Lily's Tea & Coffee")).toBe('lilys-tea-coffee');
    });

    it('should trim whitespace', () => {
      expect(generateSlug('  Bad Spacing  ')).toBe('bad-spacing');
    });
  });

  describe('flattenMenu', () => {
    it('should flatten a nested category structure', () => {
      const input = [
        {
          category: 'Lunch',
          items: [
            { name: 'Burger', price: '10' },
            { name: 'Fries', price: 5 },
          ],
        },
        {
          category: 'Drinks',
          items: [{ name: 'Coke', price: 2 }],
        },
      ];

      const output = flattenMenu(input);

      expect(output).toHaveLength(3);
      expect(output[0]).toEqual({ name: 'Burger', price: 10, category: 'Lunch' });
      expect(output[2]).toEqual({ name: 'Coke', price: 2, category: 'Drinks' });
    });

    it('should handle empty input', () => {
      expect(flattenMenu([])).toEqual([]);
    });

    it('should convert string prices to numbers', () => {
      const input = [{ category: 'Test', items: [{ name: 'Item', price: '12.50' }] }];
      expect(flattenMenu(input)[0].price).toBe(12.5);
    });
  });
});
