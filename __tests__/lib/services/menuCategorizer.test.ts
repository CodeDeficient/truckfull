import { describe, it, expect } from '@jest/globals';
import { categorizeMenuItem, categorizeMenuItems, MENU_CATEGORIES, CATEGORY_MAPPINGS } from '@/lib/services/menuCategorizer';
import type { MenuCategory } from '@/lib/services/menuCategorizer';

describe('menuCategorizer', () => {
  describe('MENU_CATEGORIES', () => {
    it('should have all expected categories', () => {
      expect(MENU_CATEGORIES).toContain('entrees');
      expect(MENU_CATEGORIES).toContain('appetizers');
      expect(MENU_CATEGORIES).toContain('sides');
      expect(MENU_CATEGORIES).toContain('desserts');
      expect(MENU_CATEGORIES).toContain('drinks');
      expect(MENU_CATEGORIES).toContain('salads');
      expect(MENU_CATEGORIES).toContain('sandwiches');
      expect(MENU_CATEGORIES).toContain('soups');
      expect(MENU_CATEGORIES).toContain('kids');
      expect(MENU_CATEGORIES.length).toBe(9);
    });
  });

  describe('CATEGORY_MAPPINGS', () => {
    it('should have mappings for all categories', () => {
      const categories = CATEGORY_MAPPINGS.map((m) => m.category);
      expect(categories).toContain('entrees');
      expect(categories).toContain('appetizers');
      expect(categories).toContain('sides');
      expect(categories).toContain('desserts');
      expect(categories).toContain('drinks');
      expect(categories).toContain('salads');
      expect(categories).toContain('sandwiches');
      expect(categories).toContain('soups');
      expect(categories).toContain('kids');
    });

    it('should have keywords for each mapping', () => {
      CATEGORY_MAPPINGS.forEach((mapping) => {
        expect(Array.isArray(mapping.keywords)).toBe(true);
        expect(mapping.keywords.length).toBeGreaterThan(0);
      });
    });
  });

  describe('categorizeMenuItem', () => {
    describe('entrees', () => {
      it('should categorize tacos', () => {
        expect(categorizeMenuItem('Tacos')).toBe('entrees');
        expect(categorizeMenuItem('Fish tacos')).toBe('entrees');
      });

      it('should categorize burritos', () => {
        expect(categorizeMenuItem('Burrito')).toBe('entrees');
        expect(categorizeMenuItem('Chicken burrito')).toBe('entrees');
      });

      it('should categorize burgers', () => {
        expect(categorizeMenuItem('Burger')).toBe('entrees');
        expect(categorizeMenuItem('Veggie burger')).toBe('entrees');
      });

      it('should categorize meats', () => {
        expect(categorizeMenuItem('Beef')).toBe('entrees');
        expect(categorizeMenuItem('Pork')).toBe('entrees');
        expect(categorizeMenuItem('Steak')).toBe('entrees');
        expect(categorizeMenuItem('Brisket')).toBe('entrees');
      });

      it('should categorize mexican dishes', () => {
        expect(categorizeMenuItem('Enchiladas')).toBe('entrees');
        expect(categorizeMenuItem('Quesadilla')).toBe('entrees');
        expect(categorizeMenuItem('Carnitas')).toBe('entrees');
        expect(categorizeMenuItem('Al pastor')).toBe('entrees');
      });

      it('should categorize combos and platters', () => {
        expect(categorizeMenuItem('Combo meal')).toBe('entrees');
        expect(categorizeMenuItem('Platter')).toBe('entrees');
      });
    });

    describe('appetizers', () => {
      it('should categorize wings', () => {
        expect(categorizeMenuItem('Wings')).toBe('appetizers');
        expect(categorizeMenuItem('Buffalo wings')).toBe('appetizers');
      });

      it('should categorize nachos', () => {
        expect(categorizeMenuItem('Nachos')).toBe('appetizers');
        expect(categorizeMenuItem('Loaded nachos')).toBe('appetizers');
      });

      it('should categorize fries', () => {
        expect(categorizeMenuItem('Fries')).toBe('appetizers');
        expect(categorizeMenuItem('French fries')).toBe('appetizers');
      });

      it('should categorize other appetizers', () => {
        expect(categorizeMenuItem('Onion rings')).toBe('appetizers');
        expect(categorizeMenuItem('Dumplings')).toBe('appetizers');
        expect(categorizeMenuItem('Mozzarella sticks')).toBe('appetizers');
      });
    });

    describe('sides', () => {
      it('should categorize mac and cheese', () => {
        expect(categorizeMenuItem('Mac and cheese')).toBe('sides');
        expect(categorizeMenuItem('Mac')).toBe('sides');
      });

      it('should categorize potatoes', () => {
        expect(categorizeMenuItem('Mashed potatoes')).toBe('sides');
        expect(categorizeMenuItem('Baked potato')).toBe('sides');
        expect(categorizeMenuItem('Hash browns')).toBe('sides');
      });

      it('should categorize vegetables', () => {
        expect(categorizeMenuItem('Corn')).toBe('sides');
        expect(categorizeMenuItem('Green beans')).toBe('sides');
        expect(categorizeMenuItem('Coleslaw')).toBe('sides');
      });

      it('should categorize breads', () => {
        expect(categorizeMenuItem('Biscuit')).toBe('sides');
        expect(categorizeMenuItem('Cornbread')).toBe('sides');
      });

      it('should categorize tater tots', () => {
        expect(categorizeMenuItem('Tater tots')).toBe('sides');
        expect(categorizeMenuItem('Tots')).toBe('sides');
      });
    });

    describe('desserts', () => {
      it('should categorize sweets', () => {
        expect(categorizeMenuItem('Brownie')).toBe('desserts');
        expect(categorizeMenuItem('Cookie')).toBe('desserts');
        expect(categorizeMenuItem('Cake')).toBe('desserts');
      });

      it('should categorize ice cream', () => {
        expect(categorizeMenuItem('Ice cream')).toBe('desserts');
        expect(categorizeMenuItem('Gelato')).toBe('desserts');
        expect(categorizeMenuItem('Sundae')).toBe('desserts');
      });

      it('should categorize donuts and pastries', () => {
        expect(categorizeMenuItem('Donut')).toBe('desserts');
        expect(categorizeMenuItem('Churros')).toBe('desserts');
        expect(categorizeMenuItem('Cheesecake')).toBe('desserts');
      });
    });

    describe('drinks', () => {
      it('should categorize beverages', () => {
        expect(categorizeMenuItem('Soda')).toBe('drinks');
        expect(categorizeMenuItem('Tea')).toBe('drinks');
        expect(categorizeMenuItem('Coffee')).toBe('drinks');
      });

      it('should categorize specialty drinks', () => {
        expect(categorizeMenuItem('Lemonade')).toBe('drinks');
        expect(categorizeMenuItem('Margarita')).toBe('drinks');
      });

      it('should categorize soft drinks', () => {
        expect(categorizeMenuItem('Coke')).toBe('drinks');
        expect(categorizeMenuItem('Pepsi')).toBe('drinks');
        expect(categorizeMenuItem('Sprite')).toBe('drinks');
      });
    });

    describe('salads', () => {
      it('should categorize salads', () => {
        expect(categorizeMenuItem('Caesar salad')).toBe('salads');
        expect(categorizeMenuItem('Garden salad')).toBe('salads');
        expect(categorizeMenuItem('House salad')).toBe('salads');
      });

      it('should categorize potato salad', () => {
        expect(categorizeMenuItem('Potato salad')).toBe('salads');
      });
    });

    describe('sandwiches', () => {
      it('should categorize sandwiches', () => {
        expect(categorizeMenuItem('Sandwich')).toBe('sandwiches');
        expect(categorizeMenuItem('Club sandwich')).toBe('sandwiches');
      });

      it('should categorize subs and hoagies', () => {
        expect(categorizeMenuItem('Sub')).toBe('sandwiches');
        expect(categorizeMenuItem('Hoagie')).toBe('sandwiches');
        expect(categorizeMenuItem('Grinder')).toBe('sandwiches');
      });

      it('should categorize wraps', () => {
        expect(categorizeMenuItem('Wrap')).toBe('sandwiches');
        expect(categorizeMenuItem('Gyro')).toBe('sandwiches');
      });
    });

    describe('soups', () => {
      it('should categorize ramen and pho', () => {
        expect(categorizeMenuItem('Ramen')).toBe('soups');
        expect(categorizeMenuItem('Pho')).toBe('soups');
      });

      it('should categorize chili', () => {
        expect(categorizeMenuItem('Chili')).toBe('soups');
      });
    });

    describe('kids', () => {
      it('should categorize kids meal', () => {
        expect(categorizeMenuItem('Kids meal')).toBe('kids');
        expect(categorizeMenuItem("Kid's meal")).toBe('kids');
      });

      it('should categorize generic kids items', () => {
        expect(categorizeMenuItem('Kids')).toBe('kids');
        expect(categorizeMenuItem('Kid')).toBe('kids');
        expect(categorizeMenuItem('Junior')).toBe('kids');
      });

      it('should categorize "little" items without conflicting keywords', () => {
        expect(categorizeMenuItem('Little meals')).toBe('kids');
        expect(categorizeMenuItem('Little')).toBe('kids');
      });
    });

    describe('edge cases', () => {
      it('should return default category for null/undefined', () => {
        expect(categorizeMenuItem('')).toBe('entrees');
        expect(categorizeMenuItem(null as unknown as string)).toBe('entrees');
        expect(categorizeMenuItem(undefined as unknown as string)).toBe('entrees');
      });

      it('should return default category for non-string input', () => {
        expect(categorizeMenuItem(123 as unknown as string)).toBe('entrees');
        expect(categorizeMenuItem({} as unknown as string)).toBe('entrees');
      });

      it('should return default category for unknown items', () => {
        expect(categorizeMenuItem('XYZ_UNKNOWN_ITEM')).toBe('entrees');
        expect(categorizeMenuItem('Random food')).toBe('entrees');
      });

      it('should be case insensitive', () => {
        expect(categorizeMenuItem('TACO')).toBe('entrees');
        expect(categorizeMenuItem('taco')).toBe('entrees');
        expect(categorizeMenuItem('TaCo')).toBe('entrees');
      });

      it('should return first matching category when multiple keywords match', () => {
        expect(categorizeMenuItem('Fish and chips')).toBe('entrees');
        expect(categorizeMenuItem('BBQ Chicken pizza')).toBe('entrees');
      });

      it('should prioritize entrees over kids for items with burger', () => {
        expect(categorizeMenuItem('Kids burger')).toBe('entrees');
      });
    });
  });

  describe('categorizeMenuItems', () => {
    it('should categorize multiple items', () => {
      const items = ['Tacos', 'Fries', 'Soda'];
      const result = categorizeMenuItems(items);
      expect(result).toEqual([
        { name: 'Tacos', category: 'entrees' },
        { name: 'Fries', category: 'appetizers' },
        { name: 'Soda', category: 'drinks' },
      ]);
    });

    it('should handle empty array', () => {
      const result = categorizeMenuItems([]);
      expect(result).toEqual([]);
    });

    it('should handle mixed known and unknown items', () => {
      const items = ['Tacos', 'Unknown Dish'];
      const result = categorizeMenuItems(items);
      expect(result[0].category).toBe('entrees');
      expect(result[1].category).toBe('entrees');
    });
  });
});