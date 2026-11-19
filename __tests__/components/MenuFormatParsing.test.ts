/**
 * Unit tests for menu format handling in EnhancedTruckPopup
 *
 * Tests the detection and parsing of two menu formats:
 * 1. Flat format: [{name: "Soup Item", category: "Soups", price: 5}, ...]
 * 2. Grouped format: [{name: "Soups", items: [{name: "Soup Item", price: 5}, ...]}, ...]
 *
 * This is a critical point because the database stores flat format,
 * but some mappers transform to grouped format.
 */

describe('Menu Format Detection and Parsing', () => {
  // Types matching the popup implementation
  interface MenuItem {
    name?: string;
    price?: number;
    category?: string;
    description?: string;
    dietary_info?: string[];
    is_popular?: boolean;
    [key: string]: unknown;
  }

  interface MenuCategory {
    name: string;
    items: MenuItem[];
  }

  // Helper function matching the popup's detection logic
  const isGroupedFormat = (data: unknown[]): boolean => {
    if (data.length === 0) return false;
    const first = data[0] as Record<string, unknown>;
    return Array.isArray(first?.items);
  };

  // Helper function matching the popup's parsing logic
  const parseMenuData = (
    rawMenu: unknown,
  ): { categories: string[]; itemsByCategory: Record<string, MenuItem[]> } => {
    let categories: string[] = [];
    const itemsByCategory: Record<string, MenuItem[]> = {};

    if (Array.isArray(rawMenu) && rawMenu.length > 0) {
      if (isGroupedFormat(rawMenu as unknown[])) {
        // Already grouped - use directly
        const grouped = rawMenu as unknown as MenuCategory[];
        categories = grouped.map((cat) => cat.name);
        for (const cat of grouped) {
          itemsByCategory[cat.name] = cat.items;
        }
      } else {
        // Flat format - group by category field
        const flat = rawMenu as unknown as MenuItem[];
        const categorySet = new Set<string>();
        for (const item of flat) {
          const cat = item.category ?? 'Menu';
          categorySet.add(cat);
          if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
          itemsByCategory[cat].push(item);
        }
        categories = [...categorySet];
      }
    }

    return { categories, itemsByCategory };
  };

  describe('isGroupedFormat detection', () => {
    it('returns false for empty array', () => {
      expect(isGroupedFormat([])).toBe(false);
    });

    it('returns true for grouped format (has items array)', () => {
      const grouped = [
        { name: 'Soups', items: [{ name: 'Tomato Soup', price: 5 }] },
        { name: 'Entrees', items: [{ name: 'Burger', price: 12 }] },
      ];
      expect(isGroupedFormat(grouped)).toBe(true);
    });

    it('returns false for flat format (has category field, no items array)', () => {
      const flat = [
        { name: 'Tomato Soup', category: 'Soups', price: 5 },
        { name: 'Burger', category: 'Entrees', price: 12 },
      ];
      expect(isGroupedFormat(flat)).toBe(false);
    });
  });

  describe('parseMenuData with flat format', () => {
    const flatMenu = [
      { name: 'Weekly Soup', category: 'Soups', price: 5, is_popular: true },
      { name: 'Tomato Basil Soup', category: 'Soups', price: 5 },
      { name: 'Buffalo Cauliflower', category: 'Appetizers', price: 6 },
      { name: 'BBQ Jackfruit Sandwich', category: 'Entrees', price: 8 },
      { name: 'Mac & Cheese', category: 'Sides', price: 6 },
    ];

    it('extracts unique categories in order of appearance', () => {
      const { categories } = parseMenuData(flatMenu);
      expect(categories).toEqual(['Soups', 'Appetizers', 'Entrees', 'Sides']);
    });

    it('groups items by their category', () => {
      const { itemsByCategory } = parseMenuData(flatMenu);

      expect(itemsByCategory['Soups']).toHaveLength(2);
      expect(itemsByCategory['Soups'][0].name).toBe('Weekly Soup');
      expect(itemsByCategory['Soups'][1].name).toBe('Tomato Basil Soup');

      expect(itemsByCategory['Appetizers']).toHaveLength(1);
      expect(itemsByCategory['Appetizers'][0].name).toBe('Buffalo Cauliflower');

      expect(itemsByCategory['Entrees']).toHaveLength(1);
      expect(itemsByCategory['Sides']).toHaveLength(1);
    });

    it('uses "Menu" as default category when category is missing', () => {
      const noCategory = [
        { name: 'Mystery Item', price: 10 },
        { name: 'Another Item', price: 8 },
      ];
      const { categories, itemsByCategory } = parseMenuData(noCategory);

      expect(categories).toEqual(['Menu']);
      expect(itemsByCategory['Menu']).toHaveLength(2);
    });
  });

  describe('parseMenuData with grouped format', () => {
    const groupedMenu = [
      {
        name: 'Soups',
        items: [
          { name: 'Weekly Soup', price: 5, is_popular: true },
          { name: 'Tomato Basil Soup', price: 5 },
        ],
      },
      {
        name: 'Appetizers',
        items: [{ name: 'Buffalo Cauliflower', price: 6 }],
      },
      {
        name: 'Entrees',
        items: [{ name: 'BBQ Jackfruit Sandwich', price: 8 }],
      },
    ];

    it('extracts category names from grouped format', () => {
      const { categories } = parseMenuData(groupedMenu);
      expect(categories).toEqual(['Soups', 'Appetizers', 'Entrees']);
    });

    it('maps items directly from grouped format', () => {
      const { itemsByCategory } = parseMenuData(groupedMenu);

      expect(itemsByCategory['Soups']).toHaveLength(2);
      expect(itemsByCategory['Soups'][0].name).toBe('Weekly Soup');

      expect(itemsByCategory['Appetizers']).toHaveLength(1);
      expect(itemsByCategory['Entrees']).toHaveLength(1);
    });
  });

  describe('parseMenuData edge cases', () => {
    it('handles empty array', () => {
      const { categories, itemsByCategory } = parseMenuData([]);
      expect(categories).toEqual([]);
      expect(Object.keys(itemsByCategory)).toEqual([]);
    });

    it('handles null/undefined gracefully', () => {
      const { categories: cat1 } = parseMenuData(null);
      const { categories: cat2 } = parseMenuData(undefined);

      expect(cat1).toEqual([]);
      expect(cat2).toEqual([]);
    });

    it('handles mixed data with some missing names', () => {
      const mixedData = [
        { name: 'Valid Item', category: 'Main', price: 10 },
        { category: 'Main', price: 5 }, // Missing name
      ];
      const { itemsByCategory } = parseMenuData(mixedData);

      expect(itemsByCategory['Main']).toHaveLength(2);
      expect(itemsByCategory['Main'][0].name).toBe('Valid Item');
      expect(itemsByCategory['Main'][1].name).toBeUndefined();
    });
  });

  describe('Real-world data format (Sample Vegan Kitchen)', () => {
    // This is the actual format stored in the database
    const realDatabaseFormat = [
      {
        name: 'Weekly Soup (Stuffed Pepper)',
        price: 5,
        category: 'Soups',
        is_popular: true,
        description: 'Rotating weekly soup special',
      },
      { name: 'Creamy Tomato Basil Soup', price: 5, category: 'Soups', is_popular: true },
      { name: 'Seven Layer Dip', price: 5, category: 'Appetizers', is_popular: true },
      { name: 'Buffalo Cauliflower Bites', price: 6, category: 'Appetizers', is_popular: true },
      { name: 'BBQ Jackfruit Sandwich', price: 8, category: 'Entrees', is_popular: true },
      { name: "Mushroom Po'Boy", price: 8, category: 'Entrees', is_popular: true },
      { name: 'Mac & Cheese', price: 6, category: 'Sides', is_popular: true },
      { name: 'Chocolate Chip Cookies', price: 4, category: 'Desserts', is_popular: true },
    ];

    it('correctly parses real database format', () => {
      const { categories, itemsByCategory } = parseMenuData(realDatabaseFormat);

      expect(categories).toEqual(['Soups', 'Appetizers', 'Entrees', 'Sides', 'Desserts']);
      expect(itemsByCategory['Soups']).toHaveLength(2);
      expect(itemsByCategory['Appetizers']).toHaveLength(2);
      expect(itemsByCategory['Entrees']).toHaveLength(2);
      expect(itemsByCategory['Sides']).toHaveLength(1);
      expect(itemsByCategory['Desserts']).toHaveLength(1);
    });

    it('preserves all item properties', () => {
      const { itemsByCategory } = parseMenuData(realDatabaseFormat);

      const firstSoup = itemsByCategory['Soups'][0];
      expect(firstSoup.name).toBe('Weekly Soup (Stuffed Pepper)');
      expect(firstSoup.price).toBe(5);
      expect(firstSoup.is_popular).toBe(true);
      expect(firstSoup.description).toBe('Rotating weekly soup special');
    });
  });
});
