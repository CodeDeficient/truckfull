import { describe, it, expect } from '@jest/globals';
import {
  validateEnrichmentInput,
  normalizeMenuItem,
  normalizeMenu,
  mergeContactInfo,
  buildEnrichmentUpdate,
  categorizeEnrichmentStatus,
  mapEnrichmentRow,
} from '@/lib/services/menuEnrichmentService';

describe('validateEnrichmentInput', () => {
  it('rejects empty slug', () => {
    const result = validateEnrichmentInput('', [{ name: 'Tacos', items: [{ name: 'Taco' }] }]);
    expect(result).toEqual({ valid: false, error: 'slug is required' });
  });

  it('rejects missing slug', () => {
    const result = validateEnrichmentInput(undefined as unknown as string, [
      { name: 'Tacos', items: [{ name: 'Taco' }] },
    ]);
    expect(result).toEqual({ valid: false, error: 'slug is required' });
  });

  it('rejects empty menu array', () => {
    const result = validateEnrichmentInput('some-truck', []);
    expect(result).toEqual({ valid: false, error: 'menu must have at least one category' });
  });

  it('rejects menu category without name', () => {
    const result = validateEnrichmentInput('some-truck', [{ items: [{ name: 'Taco' }] }]);
    expect(result).toEqual({ valid: false, error: 'each menu category must have a name' });
  });

  it('rejects menu category without items', () => {
    const result = validateEnrichmentInput('some-truck', [{ name: 'Tacos' }]);
    expect(result).toEqual({ valid: false, error: 'each menu category must have items' });
  });

  it('accepts valid input', () => {
    const result = validateEnrichmentInput('some-truck', [
      { name: 'Tacos', items: [{ name: 'Taco' }] },
    ]);
    expect(result).toEqual({ valid: true });
  });

  it('rejects menu item without name', () => {
    const result = validateEnrichmentInput('some-truck', [
      { name: 'Tacos', items: [{ price: 5 }] },
    ]);
    expect(result).toEqual({ valid: false, error: 'each menu item must have a name' });
  });
});

describe('normalizeMenuItem', () => {
  it('preserves valid item', () => {
    const item = { name: 'Taco', price: 5, description: 'Yummy', is_popular: true };
    expect(normalizeMenuItem(item)).toEqual(item);
  });

  it('converts string price to number', () => {
    const item = { name: 'Taco', price: '5.99', description: 'Yummy' };
    expect(normalizeMenuItem(item)).toEqual({ name: 'Taco', price: 5.99, description: 'Yummy' });
  });

  it('sets null price for empty string', () => {
    const item = { name: 'Taco', price: '', description: 'Yummy' };
    expect(normalizeMenuItem(item)).toEqual({ name: 'Taco', price: null, description: 'Yummy' });
  });

  it('sets null price for missing price', () => {
    const item = { name: 'Taco', description: 'Yummy' };
    expect(normalizeMenuItem(item)).toEqual({ name: 'Taco', price: null, description: 'Yummy' });
  });

  it('preserves dietary array', () => {
    const item = { name: 'Salad', price: 8, dietary: ['vegan', 'gluten-free'] };
    expect(normalizeMenuItem(item)).toEqual(item);
  });

  it('handles non-object input gracefully', () => {
    expect(normalizeMenuItem(null)).toEqual({ name: '', price: null });
    expect(normalizeMenuItem('string')).toEqual({ name: '', price: null });
  });

  it('filters non-string dietary values', () => {
    const item = { name: 'Salad', price: 8, dietary: ['vegan', 123, null] };
    const result = normalizeMenuItem(item);
    expect(result.dietary).toEqual(['vegan']);
  });
});

describe('normalizeMenu', () => {
  it('normalizes all items in all categories', () => {
    const menu = [
      {
        name: 'Entrees',
        items: [
          { name: 'Taco', price: '3.50', description: 'Beef taco' },
          { name: 'Burrito', price: 8, description: 'Big burrito' },
        ],
      },
    ];
    const result = normalizeMenu(menu);
    expect(result[0].items[0].price).toBe(3.5);
    expect(result[0].items[1].price).toBe(8);
  });

  it('sets null prices for items without price', () => {
    const menu = [
      {
        name: 'Drinks',
        items: [{ name: 'Lemonade', description: 'Fresh squeezed' }],
      },
    ];
    const result = normalizeMenu(menu);
    expect(result[0].items[0].price).toBeNull();
  });
});

describe('mergeContactInfo', () => {
  it('returns incoming when existing is null', () => {
    const incoming = { phone: '555-1234', email: 'test@test.com' };
    expect(mergeContactInfo(null, incoming)).toEqual(incoming);
  });

  it('merges incoming into existing, incoming takes priority', () => {
    const existing = { phone: '555-0000', website: 'https://old.com' };
    const incoming = { phone: '555-1234', email: 'test@test.com' };
    expect(mergeContactInfo(existing, incoming)).toEqual({
      phone: '555-1234',
      website: 'https://old.com',
      email: 'test@test.com',
    });
  });

  it('preserves existing fields not in incoming', () => {
    const existing = { phone: '555-0000', website: 'https://old.com' };
    const incoming = { email: 'test@test.com' };
    expect(mergeContactInfo(existing, incoming)).toEqual({
      phone: '555-0000',
      website: 'https://old.com',
      email: 'test@test.com',
    });
  });

  it('skips empty string values from incoming', () => {
    const existing = { phone: '555-0000' };
    const incoming = { phone: '', email: 'new@test.com' };
    expect(mergeContactInfo(existing, incoming)).toEqual({
      phone: '555-0000',
      email: 'new@test.com',
    });
  });

  it('strips keys not in safe allowlist', () => {
    const existing = { phone: '555-0000' };
    const incoming = { __proto__: 'polluted', constructor: 'evil', phone: '555-1234' };
    expect(mergeContactInfo(existing, incoming)).toEqual({
      phone: '555-1234',
    });
  });

  it('strips non-string values from incoming', () => {
    const existing = null;
    const incoming = { phone: '555-1234', email: 123 as unknown as string };
    expect(mergeContactInfo(existing, incoming)).toEqual({
      phone: '555-1234',
    });
  });
});

describe('buildEnrichmentUpdate', () => {
  it('builds update with menu only', () => {
    const menu = [{ name: 'Tacos', items: [{ name: 'Taco', price: 5 }] }];
    const result = buildEnrichmentUpdate({ menu });
    expect(result).toHaveProperty('menu');
    expect(result.menu).toHaveLength(1);
    expect(result.menu[0].name).toBe('Tacos');
    expect(result).toHaveProperty('updated_at');
  });

  it('includes operating_hours when provided', () => {
    const menu = [{ name: 'Tacos', items: [{ name: 'Taco' }] }];
    const hours = {
      hours: [{ day: 'Monday', open: '11:00', close: '19:00' }],
    };
    const result = buildEnrichmentUpdate({ menu, operating_hours: hours });
    expect(result).toHaveProperty('operating_hours');
  });

  it('includes contact_info when provided', () => {
    const menu = [{ name: 'Tacos', items: [{ name: 'Taco' }] }];
    const contact = { phone: '555-1234', email: 'test@test.com' };
    const result = buildEnrichmentUpdate({ menu, contact_info: contact });
    expect(result).toHaveProperty('contact_info');
    expect(result.contact_info).toEqual(contact);
  });

  it('does not include undefined optional fields', () => {
    const menu = [{ name: 'Tacos', items: [{ name: 'Taco' }] }];
    const result = buildEnrichmentUpdate({ menu });
    expect(result).not.toHaveProperty('operating_hours');
    expect(result).not.toHaveProperty('contact_info');
    expect(result).not.toHaveProperty('current_location');
  });
});

describe('categorizeEnrichmentStatus', () => {
  it('returns empty for null menu', () => {
    expect(categorizeEnrichmentStatus({ menu: null })).toBe('empty');
  });

  it('returns empty for empty array', () => {
    expect(categorizeEnrichmentStatus({ menu: [] })).toBe('empty');
  });

  it('returns complete for 1 item inside a category', () => {
    const menu = [{ name: 'Desserts', items: [{ name: 'Cannoli' }] }];
    expect(categorizeEnrichmentStatus({ menu })).toBe('complete');
  });

  it('returns complete for 2 items across categories', () => {
    const menu = [
      { name: 'Coffee', items: [{ name: 'Latte' }] },
      { name: 'Desserts', items: [{ name: 'Cannoli' }] },
    ];
    expect(categorizeEnrichmentStatus({ menu })).toBe('complete');
  });

  it('returns complete for flat menu items (no categories)', () => {
    const menu = [{ name: 'Taco' }, { name: 'Burrito' }];
    expect(categorizeEnrichmentStatus({ menu })).toBe('complete');
  });

  it('returns empty when category has items but all are placeholders', () => {
    const menu = [{ name: 'Food', items: [{ name: 'Item 1' }, { name: 'Menu Item' }] }];
    expect(categorizeEnrichmentStatus({ menu })).toBe('empty');
  });

  it('returns complete for flat menu items without items array', () => {
    const menu = [{ name: 'Tacos' }, { name: 'Burritos' }];
    expect(categorizeEnrichmentStatus({ menu })).toBe('complete');
  });

  it('skips non-object entries', () => {
    const menu = ['string', null, { name: 'Taco', items: [{ name: 'Item' }] }];
    expect(categorizeEnrichmentStatus({ menu })).toBe('complete');
  });
});

describe('mapEnrichmentRow', () => {
  it('counts items inside categories for menuCount', () => {
    const row = {
      id: 'abc',
      name: 'Test Truck',
      city: 'Augusta',
      state: 'GA',
      cuisine_type: ['Dessert'],
      description: null,
      social_media: { facebook: 'https://fb.com/test' },
      menu: [
        { name: 'Coffee', items: [{ name: 'Latte' }, { name: 'Espresso' }] },
        { name: 'Pastry', items: [{ name: 'Croissant' }] },
      ],
      data_quality_score: 100,
      is_active: true,
    };
    const result = mapEnrichmentRow(row);
    expect(result.menuCount).toBe(3);
    expect(result.enrichmentStatus).toBe('complete');
  });

  it('counts flat items when no items array', () => {
    const row = {
      id: 'abc',
      name: 'Flat Truck',
      city: 'Augusta',
      state: 'GA',
      cuisine_type: ['Tacos'],
      description: null,
      social_media: null,
      menu: [{ name: 'Taco' }, { name: 'Burrito' }],
      data_quality_score: 75,
      is_active: true,
    };
    const result = mapEnrichmentRow(row);
    expect(result.menuCount).toBe(2);
    expect(result.enrichmentStatus).toBe('complete');
  });

  it('returns 0 for empty menu', () => {
    const row = {
      id: 'abc',
      name: 'Empty Truck',
      city: 'Augusta',
      state: 'GA',
      cuisine_type: null,
      description: null,
      social_media: null,
      menu: [],
      data_quality_score: 50,
      is_active: true,
    };
    const result = mapEnrichmentRow(row);
    expect(result.menuCount).toBe(0);
    expect(result.enrichmentStatus).toBe('empty');
  });

  it('excludes placeholder items from menuCount', () => {
    const row = {
      id: 'abc',
      name: 'Placeholder Truck',
      city: 'Augusta',
      state: 'GA',
      cuisine_type: ['Tacos'],
      description: null,
      social_media: null,
      menu: [{ name: 'Food', items: [{ name: 'Item 1' }, { name: 'Menu Item' }] }],
      data_quality_score: 50,
      is_active: true,
    };
    const result = mapEnrichmentRow(row);
    expect(result.menuCount).toBe(0);
    expect(result.enrichmentStatus).toBe('empty');
  });
});