import type { MenuItem } from '@/lib/types';
import {
  buildMenuItemFromInput,
  isDuplicateMenuItemName,
  findMenuItemByName,
  findMenuItemIndexByName,
  addItemToMenu,
  updateItemInMenu,
  removeItemFromMenu,
} from '@/lib/supabase/MenuItemService';

describe('MenuItemService - Pure Functions', () => {
  describe('buildMenuItemFromInput', () => {
    it('should build menu item with all fields', () => {
      const newItem = {
        name: 'Taco',
        description: 'Delicious taco',
        price: 3.99,
        category: 'Main',
        dietary_info: ['gluten-free'],
        is_popular: true,
        photo_url: 'https://example.com/taco.jpg',
      };

      const result = buildMenuItemFromInput(newItem);

      expect(result.name).toBe('Taco');
      expect(result.description).toBe('Delicious taco');
      expect(result.price).toBe(3.99);
      expect(result.category).toBe('Main');
      expect(result.dietary_info).toEqual(['gluten-free']);
      expect(result.is_popular).toBe(true);
      expect(result.photo_url).toBe('https://example.com/taco.jpg');
    });

    it('should use defaults for missing optional fields', () => {
      const newItem = {
        name: 'Taco',
      };

      const result = buildMenuItemFromInput(newItem);

      expect(result.name).toBe('Taco');
      expect(result.description).toBeUndefined();
      expect(result.price).toBeUndefined();
      expect(result.category).toBe('Uncategorized');
      expect(result.dietary_info).toEqual([]);
      expect(result.is_popular).toBe(false);
      expect(result.photo_url).toBeUndefined();
    });

    it('should handle null name with default', () => {
      const newItem = {
        name: null,
        description: 'Desc',
      };

      const result = buildMenuItemFromInput(newItem);

      expect(result.name).toBe('Unknown Item');
    });

    it('should handle null category with default', () => {
      const newItem = {
        name: 'Taco',
        category: null,
      };

      const result = buildMenuItemFromInput(newItem);

      expect(result.category).toBe('Uncategorized');
    });

    it('should handle null dietary_info with default', () => {
      const newItem = {
        name: 'Taco',
        dietary_info: null,
      };

      const result = buildMenuItemFromInput(newItem);

      expect(result.dietary_info).toEqual([]);
    });

    it('should handle null is_popular with default', () => {
      const newItem = {
        name: 'Taco',
        is_popular: null,
      };

      const result = buildMenuItemFromInput(newItem);

      expect(result.is_popular).toBe(false);
    });
  });

  describe('isDuplicateMenuItemName', () => {
    it('should return true if name exists in menu', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
        { id: '2', name: 'Burrito', description: '', price: 7.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = isDuplicateMenuItemName(menu, 'Taco');

      expect(result).toBe(true);
    });

    it('should return false if name does not exist in menu', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = isDuplicateMenuItemName(menu, 'Nachos');

      expect(result).toBe(false);
    });

    it('should be case sensitive', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      expect(isDuplicateMenuItemName(menu, 'taco')).toBe(false);
      expect(isDuplicateMenuItemName(menu, 'TACO')).toBe(false);
    });
  });

  describe('findMenuItemByName', () => {
    it('should find menu item by name', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
        { id: '2', name: 'Burrito', description: '', price: 7.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = findMenuItemByName(menu, 'Burrito');

      expect(result).toBeDefined();
      expect(result?.id).toBe('2');
    });

    it('should return undefined if name not found', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = findMenuItemByName(menu, 'Nachos');

      expect(result).toBeUndefined();
    });

    it('should return first match when duplicate names exist', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
        { id: '2', name: 'Taco', description: '', price: 4.99, category: 'Specials', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = findMenuItemByName(menu, 'Taco');

      expect(result?.id).toBe('1');
    });
  });

  describe('findMenuItemIndexByName', () => {
    it('should find index by name', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
        { id: '2', name: 'Burrito', description: '', price: 7.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = findMenuItemIndexByName(menu, 'Burrito');

      expect(result).toBe(1);
    });

    it('should return -1 if name not found', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = findMenuItemIndexByName(menu, 'Nachos');

      expect(result).toBe(-1);
    });

    it('should return first index when duplicate names exist', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
        { id: '2', name: 'Taco', description: '', price: 4.99, category: 'Specials', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = findMenuItemIndexByName(menu, 'Taco');

      expect(result).toBe(0);
    });
  });

  describe('addItemToMenu', () => {
    it('should add item to end of menu', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];
      const newItem: MenuItem = {
        id: '2',
        name: 'Burrito',
        description: '',
        price: 7.99,
        category: 'Main',
        dietary_info: [],
        is_popular: false,
        created_at: '',
        updated_at: '',
      };

      const result = addItemToMenu(menu, newItem);

      expect(result).toHaveLength(2);
      expect(result[1].name).toBe('Burrito');
    });

    it('should not mutate original menu', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];
      const newItem: MenuItem = {
        id: '2',
        name: 'Burrito',
        description: '',
        price: 7.99,
        category: 'Main',
        dietary_info: [],
        is_popular: false,
        created_at: '',
        updated_at: '',
      };

      addItemToMenu(menu, newItem);

      expect(menu).toHaveLength(1);
    });

    it('should handle empty menu', () => {
      const menu: MenuItem[] = [];
      const newItem: MenuItem = {
        id: '1',
        name: 'Taco',
        description: '',
        price: 3.99,
        category: 'Main',
        dietary_info: [],
        is_popular: false,
        created_at: '',
        updated_at: '',
      };

      const result = addItemToMenu(menu, newItem);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Taco');
    });
  });

  describe('updateItemInMenu', () => {
    it('should update item at given index', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
        { id: '2', name: 'Burrito', description: '', price: 7.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];
      const updatedItem: MenuItem = {
        id: '1',
        name: 'Taco Supreme',
        description: '',
        price: 4.99,
        category: 'Main',
        dietary_info: [],
        is_popular: false,
        created_at: '',
        updated_at: '',
      };

      const result = updateItemInMenu(menu, 0, updatedItem);

      expect(result[0].name).toBe('Taco Supreme');
      expect(result[0].price).toBe(4.99);
      expect(result[1].name).toBe('Burrito');
    });

    it('should not mutate original menu', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];
      const updatedItem: MenuItem = {
        id: '1',
        name: 'Taco Supreme',
        description: '',
        price: 4.99,
        category: 'Main',
        dietary_info: [],
        is_popular: false,
        created_at: '',
        updated_at: '',
      };

      updateItemInMenu(menu, 0, updatedItem);

      expect(menu[0].name).toBe('Taco');
    });

    it('should handle index at end of menu', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
        { id: '2', name: 'Burrito', description: '', price: 7.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];
      const updatedItem: MenuItem = {
        id: '2',
        name: 'Burrito Deluxe',
        description: '',
        price: 8.99,
        category: 'Main',
        dietary_info: [],
        is_popular: false,
        created_at: '',
        updated_at: '',
      };

      const result = updateItemInMenu(menu, 1, updatedItem);

      expect(result[1].name).toBe('Burrito Deluxe');
    });
  });

  describe('removeItemFromMenu', () => {
    it('should remove item by name', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
        { id: '2', name: 'Burrito', description: '', price: 7.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = removeItemFromMenu(menu, 'Taco');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Burrito');
    });

    it('should not mutate original menu', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
        { id: '2', name: 'Burrito', description: '', price: 7.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      removeItemFromMenu(menu, 'Taco');

      expect(menu).toHaveLength(2);
    });

    it('should return empty array when removing only item', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = removeItemFromMenu(menu, 'Taco');

      expect(result).toHaveLength(0);
    });

    it('should return same array when name not found', () => {
      const menu: MenuItem[] = [
        { id: '1', name: 'Taco', description: '', price: 3.99, category: 'Main', dietary_info: [], is_popular: false, created_at: '', updated_at: '' },
      ];

      const result = removeItemFromMenu(menu, 'Nachos');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Taco');
    });
  });
});
