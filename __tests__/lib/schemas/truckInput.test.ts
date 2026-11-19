import { describe, it, expect } from '@jest/globals';
import {
  validateTruckData,
  validatePartialTruckData,
  MenuItemSchema,
  MenuCategorySchema,
  ContactInfoSchema,
  SocialMediaSchema,
  OperatingHoursSchema,
  LocationSchema,
} from '@/lib/schemas/truckInput';

describe('truckInput', () => {
  describe('validateTruckData', () => {
    it('validates valid truck data', () => {
      const data = {
        name: 'Test Truck',
        cuisine_type: ['Vegan'],
        contact_info: { email: 'test@test.com' },
      };
      const result = validateTruckData(data);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('fails when name is too short', () => {
      const data = { name: 'T', cuisine_type: [] };
      const result = validateTruckData(data);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('fails when email is invalid', () => {
      const data = {
        name: 'Test Truck',
        cuisine_type: [],
        contact_info: { email: 'not-an-email' },
      };
      const result = validateTruckData(data);
      expect(result.success).toBe(false);
    });

    it('fails when website URL is invalid', () => {
      const data = {
        name: 'Test Truck',
        cuisine_type: [],
        contact_info: { website: 'not-a-url' },
      };
      const result = validateTruckData(data);
      expect(result.success).toBe(false);
    });

    it('fails when cuisine_type is not array', () => {
      const data = { name: 'Test Truck', cuisine_type: 'Vegan' };
      const result = validateTruckData(data);
      expect(result.success).toBe(false);
    });

    it('accepts optional fields', () => {
      const data = { name: 'Test Truck', cuisine_type: [] };
      const result = validateTruckData(data);
      expect(result.success).toBe(true);
    });
  });

  describe('validatePartialTruckData', () => {
    it('accepts partial data', () => {
      const data = { cuisine_type: ['Vegan'] };
      const result = validatePartialTruckData(data);
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = validatePartialTruckData({});
      expect(result.success).toBe(true);
    });

    it('returns warnings for invalid fields', () => {
      const data = { name: 'Valid Name', cuisine_type: 'not-an-array' };
      const result = validatePartialTruckData(data);
      expect(result.success).toBe(false);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('MenuItemSchema', () => {
    it('validates valid menu item', () => {
      const item = { name: 'Burger', price: 9.99 };
      const result = MenuItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('allows optional price', () => {
      const item = { name: 'Burger' };
      const result = MenuItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('fails when name is empty', () => {
      const item = { name: '' };
      const result = MenuItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('fails when price is negative', () => {
      const item = { name: 'Burger', price: -1 };
      const result = MenuItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });
  });

  describe('MenuCategorySchema', () => {
    it('validates valid category', () => {
      const category = {
        category: 'Main Dishes',
        items: [{ name: 'Burger' }],
      };
      const result = MenuCategorySchema.safeParse(category);
      expect(result.success).toBe(true);
    });

    it('fails when category name is empty', () => {
      const category = { category: '', items: [{ name: 'Burger' }] };
      const result = MenuCategorySchema.safeParse(category);
      expect(result.success).toBe(false);
    });

    it('fails when items array is empty', () => {
      const category = { category: 'Main', items: [] };
      const result = MenuCategorySchema.safeParse(category);
      expect(result.success).toBe(false);
    });
  });

  describe('ContactInfoSchema', () => {
    it('validates valid contact info', () => {
      const contact = { email: 'test@test.com', phone: '555-1234' };
      const result = ContactInfoSchema.safeParse(contact);
      expect(result.success).toBe(true);
    });

    it('allows optional fields', () => {
      const result = ContactInfoSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('allows undefined', () => {
      const result = ContactInfoSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('SocialMediaSchema', () => {
    it('validates valid social media', () => {
      const social = { facebook: 'https://facebook.com/test', instagram: '@test' };
      const result = SocialMediaSchema.safeParse(social);
      expect(result.success).toBe(true);
    });

    it('fails for invalid facebook URL', () => {
      const social = { facebook: 'not-a-url' };
      const result = SocialMediaSchema.safeParse(social);
      expect(result.success).toBe(false);
    });
  });

  describe('OperatingHoursSchema', () => {
    it('validates valid hours', () => {
      const hours = {
        monday: { open: '9:00', close: '17:00' },
        tuesday: null,
      };
      const result = OperatingHoursSchema.safeParse(hours);
      expect(result.success).toBe(true);
    });

    it('fails for invalid time format', () => {
      const hours = { monday: { open: '9am', close: '5pm' } };
      const result = OperatingHoursSchema.safeParse(hours);
      expect(result.success).toBe(false);
    });
  });

  describe('LocationSchema', () => {
    it('validates valid location', () => {
      const location = {
        address: '123 Main St',
        city: 'SF',
        state: 'CA',
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const result = LocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it('fails for latitude out of range', () => {
      const location = { latitude: 100 };
      const result = LocationSchema.safeParse(location);
      expect(result.success).toBe(false);
    });

    it('fails for longitude out of range', () => {
      const location = { longitude: 200 };
      const result = LocationSchema.safeParse(location);
      expect(result.success).toBe(false);
    });
  });
});