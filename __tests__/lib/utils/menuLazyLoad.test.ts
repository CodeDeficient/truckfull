import { describe, it, expect } from '@jest/globals';
import {
  stripMenuFromTrucks,
  hasMenuContent,
  extractMenuKeywords,
  flattenMenuItems,
  readMenuFromRow,
  getMenuEntries,
} from '@/lib/utils/menuLazyLoad';

describe('stripMenuFromTrucks', () => {
  it('should remove menu field from each truck', () => {
    const trucks = [
      { id: '1', name: 'Taco Truck', menu: { categories: [{ name: 'Tacos', items: [] }] }, menu_items: [{ name: 'Taco' }], has_menu: true },
      { id: '2', name: 'Pizza Truck', menu: null, menu_items: [], has_menu: false },
    ] as Record<string, unknown>[];

    const result = stripMenuFromTrucks(trucks);
    expect(result[0]).not.toHaveProperty('menu');
    expect(result[0]).not.toHaveProperty('menu_items');
    expect(result[0]).toHaveProperty('has_menu', true);
    expect(result[1]).not.toHaveProperty('menu');
    expect(result[1]).not.toHaveProperty('menu_items');
    expect(result[1]).toHaveProperty('has_menu', false);
  });

  it('should compute has_menu from menu_items array', () => {
    const trucks = [
      { id: '1', name: 'A', menu_items: [{ name: 'Item' }, { name: 'Item 2' }] },
      { id: '2', name: 'B', menu_items: [] },
      { id: '3', name: 'C' },
    ] as Record<string, unknown>[];

    const result = stripMenuFromTrucks(trucks);
    expect(result[0].has_menu).toBe(true);
    expect(result[1].has_menu).toBe(false);
    expect(result[2].has_menu).toBe(false);
  });

  it('should compute has_menu from grouped menu JSONB', () => {
    const trucks = [
      {
        id: '1',
        name: 'A',
        menu: [{ name: 'Tacos', items: [{ name: 'Beef Taco', price: 5 }] }],
      },
      { id: '2', name: 'B', menu: [] },
    ] as Record<string, unknown>[];

    const result = stripMenuFromTrucks(trucks);
    expect(result[0].has_menu).toBe(true);
    expect(result[1].has_menu).toBe(false);
  });

  it('should compute has_menu from object menu JSONB with categories', () => {
    const trucks = [
      {
        id: '1',
        name: 'A',
        menu: { categories: [{ name: 'Tacos', items: [{ name: 'Beef Taco' }] }] },
      },
    ] as Record<string, unknown>[];

    const result = stripMenuFromTrucks(trucks);
    expect(result[0].has_menu).toBe(true);
  });

  it('should preserve existing has_menu if already set', () => {
    const trucks = [
      { id: '1', name: 'A', has_menu: true, menu_items: [] },
    ] as Record<string, unknown>[];

    const result = stripMenuFromTrucks(trucks);
    expect(result[0].has_menu).toBe(true);
  });

  it('should preserve all other fields', () => {
    const trucks = [
      { id: '1', name: 'Taco Truck', description: 'Good tacos', cuisine_type: ['Mexican'], menu_items: [{ name: 'Taco', price: 5 }] },
    ] as Record<string, unknown>[];

    const result = stripMenuFromTrucks(trucks);
    expect(result[0].id).toBe('1');
    expect(result[0].name).toBe('Taco Truck');
    expect(result[0].description).toBe('Good tacos');
    expect(result[0].cuisine_type).toEqual(['Mexican']);
  });

  it('should handle empty array', () => {
    const result = stripMenuFromTrucks([]);
    expect(result).toEqual([]);
  });

  it('should extract menu_keywords from menu_items', () => {
    const trucks = [
      {
        id: '1',
        name: 'A',
        menu_items: [
          { name: 'Beef Taco', category: 'Tacos' },
          { name: 'Chicken Burrito', category: 'Burritos' },
          { name: 'Guacamole', category: 'Sides' },
        ],
      },
    ] as Record<string, unknown>[];

    const result = stripMenuFromTrucks(trucks);
    const keywords = result[0].menu_keywords as string[];
    expect(keywords).toContain('beef taco');
    expect(keywords).toContain('tacos');
    expect(keywords).toContain('chicken burrito');
    expect(keywords).toContain('burritos');
    expect(keywords).toContain('guacamole');
    expect(keywords).toContain('sides');
  });

  it('should extract menu_keywords from grouped menu JSONB', () => {
    const trucks = [
      {
        id: '1',
        name: 'A',
        menu: [
          {
            name: 'Tacos',
            items: [
              { name: 'Beef Taco', category: 'Signature' },
              { name: 'Veggie Taco' },
            ],
          },
        ],
      },
    ] as Record<string, unknown>[];

    const result = stripMenuFromTrucks(trucks);
    const keywords = result[0].menu_keywords as string[];
    expect(keywords).toContain('tacos');
    expect(keywords).toContain('beef taco');
    expect(keywords).toContain('signature');
    expect(keywords).toContain('veggie taco');
  });

  it('should extract menu_keywords from object menu JSONB with categories', () => {
    const trucks = [
      {
        id: '1',
        name: 'A',
        menu: { categories: [{ name: 'Tacos', items: [{ name: 'Beef Taco' }] }] },
      },
    ] as Record<string, unknown>[];

    const result = stripMenuFromTrucks(trucks);
    expect(result[0].menu_keywords).toEqual(['tacos', 'beef taco']);
  });

  it('should deduplicate category keywords', () => {
    const trucks = [
      {
        id: '1',
        name: 'A',
        menu_items: [
          { name: 'Taco 1', category: 'Tacos' },
          { name: 'Taco 2', category: 'Tacos' },
        ],
      },
    ] as Record<string, unknown>[];

    const result = stripMenuFromTrucks(trucks);
    const keywords = result[0].menu_keywords as string[];
    const tacoCount = keywords.filter((k: string) => k === 'tacos').length;
    expect(tacoCount).toBe(1);
  });

  it('should set empty menu_keywords when no menu_items', () => {
    const trucks = [{ id: '1', name: 'A' }] as Record<string, unknown>[];
    const result = stripMenuFromTrucks(trucks);
    expect(result[0].menu_keywords).toEqual([]);
  });
});

describe('hasMenuContent', () => {
  it('should return true for non-empty menu_items array', () => {
    expect(hasMenuContent([{ name: 'Taco' }])).toBe(true);
  });

  it('should return false for empty array', () => {
    expect(hasMenuContent([])).toBe(false);
  });

  it('should return false for null', () => {
    expect(hasMenuContent(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(hasMenuContent(undefined)).toBe(false);
  });

  it('should return false for non-array', () => {
    expect(hasMenuContent('not an array')).toBe(false);
  });

  it('should return true for grouped menu JSONB with items', () => {
    expect(hasMenuContent([{ name: 'Tacos', items: [{ name: 'Beef Taco' }] }])).toBe(true);
  });

  it('should return true for object menu JSONB with categories', () => {
    expect(hasMenuContent({ categories: [{ name: 'Tacos', items: [{ name: 'Beef Taco' }] }] })).toBe(true);
  });
});

describe('extractMenuKeywords', () => {
  it('should return flat menu item names and categories', () => {
    expect(extractMenuKeywords([{ name: 'Burger', category: 'Sandwiches' }])).toEqual([
      'burger',
      'sandwiches',
    ]);
  });
});

describe('flattenMenuItems', () => {
  it('should flatten grouped menu JSONB into menu items', () => {
    const result = flattenMenuItems([
      { name: 'Tacos', items: [{ name: 'Beef Taco', price: 5 }] },
      { name: 'Sides', items: [{ name: 'Guacamole', category: 'Dips' }] },
    ]);

    expect(result).toEqual([
      { name: 'Beef Taco', price: 5, category: 'Tacos' },
      { name: 'Guacamole', category: 'Dips' },
    ]);
  });

  it('should preserve flat menu JSONB', () => {
    expect(flattenMenuItems([{ name: 'Burger', category: 'Sandwiches' }])).toEqual([
      { name: 'Burger', category: 'Sandwiches' },
    ]);
  });

  it('should return an empty array for invalid menu JSONB', () => {
    expect(flattenMenuItems(null)).toEqual([]);
  });

  it('should use the group name when an item category is null or blank', () => {
    expect(
      flattenMenuItems([
        {
          name: 'Tacos',
          items: [
            { name: 'Beef Taco', category: null },
            { name: 'Fish Taco', category: '  ' },
            { name: 'Pork Taco', category: 'Specials' },
          ],
        },
      ]),
    ).toEqual([
      { name: 'Beef Taco', category: 'Tacos' },
      { name: 'Fish Taco', category: 'Tacos' },
      { name: 'Pork Taco', category: 'Specials' },
    ]);
  });

  it('should flatten object menu JSONB with categories', () => {
    expect(
      flattenMenuItems({ categories: [{ name: 'Tacos', items: [{ name: 'Beef Taco' }] }] }),
    ).toEqual([{ name: 'Beef Taco', category: 'Tacos' }]);
  });
});

describe('getMenuEntries', () => {
  it('should read categories from object menu JSONB', () => {
    const categories = [{ name: 'Tacos', items: [] }];

    expect(getMenuEntries({ categories })).toBe(categories);
  });

  it('should read top-level items as flat menu entries', () => {
    expect(getMenuEntries({ items: [{ name: 'Burger' }] })).toEqual([{ name: 'Burger' }]);
  });

  it('should not create synthetic keywords for empty top-level items', () => {
    expect(extractMenuKeywords({ items: [] })).toEqual([]);
  });
});

describe('readMenuFromRow', () => {
  it('should read menu from a row object', () => {
    const menu = [{ name: 'Tacos', items: [{ name: 'Beef Taco' }] }];

    expect(readMenuFromRow({ id: 'truck-1', menu })).toBe(menu);
  });

  it('should return an empty array when row has no menu', () => {
    expect(readMenuFromRow({ id: 'truck-1' })).toEqual([]);
  });

  it('should return an empty array for invalid rows', () => {
    expect(readMenuFromRow(null)).toEqual([]);
  });
});
