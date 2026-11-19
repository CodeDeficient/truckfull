/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockSanitize = jest.fn((str: string) => str);

jest.unstable_mockModule('sanitize-html', () => ({
  __esModule: true,
  default: mockSanitize,
}));

let BaseValidationSchemas: typeof import('@/lib/validation/securitySchemas').BaseValidationSchemas;

beforeEach(async () => {
  jest.resetModules();
  mockSanitize.mockImplementation((str: string) => str);
  const mod = await import('@/lib/validation/securitySchemas');
  BaseValidationSchemas = mod.BaseValidationSchemas;
});

describe('securitySchemas', () => {
  describe('BaseValidationSchemas', () => {
    describe('SafeString', () => {
      it('should validate string within length bounds', async () => {
        const schema = BaseValidationSchemas.SafeString(1, 10);
        const result = await schema.parseAsync('hello');
        expect(result).toBe('hello');
      });

      it('should reject string shorter than minLength', async () => {
        const schema = BaseValidationSchemas.SafeString(3, 10);
        await expect(schema.parseAsync('ab')).rejects.toThrow();
      });

      it('should reject string longer than maxLength', async () => {
        const schema = BaseValidationSchemas.SafeString(1, 5);
        await expect(schema.parseAsync('abcdef')).rejects.toThrow();
      });
    });

    describe('SafeText', () => {
      it('should validate text within length bounds', async () => {
        const schema = BaseValidationSchemas.SafeText(1, 100);
        const result = await schema.parseAsync('Some text content');
        expect(result).toBe('Some text content');
      });

      it('should reject text shorter than minLength', async () => {
        const schema = BaseValidationSchemas.SafeText(10, 1000);
        await expect(schema.parseAsync('short')).rejects.toThrow();
      });
    });

    describe('SafeUUID', () => {
      it('should validate valid UUID', async () => {
        const schema = BaseValidationSchemas.SafeUUID();
        const result = await schema.parseAsync('550e8400-e29b-41d4-a716-446655440000');
        expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      });

      it('should lowercase UUID', async () => {
        const schema = BaseValidationSchemas.SafeUUID();
        const result = await schema.parseAsync('550E8400-E29B-41D4-A716-446655440000');
        expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
      });

      it('should reject invalid UUID format', async () => {
        const schema = BaseValidationSchemas.SafeUUID();
        await expect(schema.parseAsync('not-a-uuid')).rejects.toThrow();
      });

      it('should reject empty string', async () => {
        const schema = BaseValidationSchemas.SafeUUID();
        await expect(schema.parseAsync('')).rejects.toThrow();
      });
    });

    describe('SafeEmail', () => {
      it('should validate valid email', async () => {
        const schema = BaseValidationSchemas.SafeEmail();
        const result = await schema.parseAsync('Test@Example.COM');
        expect(result).toBe('test@example.com');
      });

      it('should lowercase email', async () => {
        const schema = BaseValidationSchemas.SafeEmail();
        const result = await schema.parseAsync('USER@TEST.COM');
        expect(result).toBe('user@test.com');
      });

      it('should reject invalid email format', async () => {
        const schema = BaseValidationSchemas.SafeEmail();
        await expect(schema.parseAsync('not-an-email')).rejects.toThrow();
      });

      it('should reject email without @ symbol', async () => {
        const schema = BaseValidationSchemas.SafeEmail();
        await expect(schema.parseAsync('test.example.com')).rejects.toThrow();
      });
    });

    describe('SafeURL', () => {
      it('should validate valid HTTP URL', async () => {
        const schema = BaseValidationSchemas.SafeURL();
        const result = await schema.parseAsync('http://example.com');
        expect(result).toBe('http://example.com');
      });

      it('should validate valid HTTPS URL', async () => {
        const schema = BaseValidationSchemas.SafeURL();
        const result = await schema.parseAsync('https://example.com/path');
        expect(result).toBe('https://example.com/path');
      });

      it('should reject invalid protocol', async () => {
        const schema = BaseValidationSchemas.SafeURL();
        await expect(schema.parseAsync('ftp://example.com')).rejects.toThrow();
      });

      it('should reject javascript protocol', async () => {
        const schema = BaseValidationSchemas.SafeURL();
        await expect(schema.parseAsync('javascript:alert(1)')).rejects.toThrow();
      });

      it('should reject invalid URL', async () => {
        const schema = BaseValidationSchemas.SafeURL();
        await expect(schema.parseAsync('not a url')).rejects.toThrow();
      });
    });

    describe('SafeInteger', () => {
      it('should validate integer within bounds', async () => {
        const schema = BaseValidationSchemas.SafeInteger(0, 100);
        const result = await schema.parseAsync(42);
        expect(result).toBe(42);
      });

      it('should floor decimal values', async () => {
        const schema = BaseValidationSchemas.SafeDecimal(0, 100, 0);
        const result = await schema.parseAsync(42.9);
        expect(result).toBe(43);
      });

      it('should reject value below min', async () => {
        const schema = BaseValidationSchemas.SafeInteger(0, 100);
        await expect(schema.parseAsync(-1)).rejects.toThrow();
      });

      it('should reject value above max', async () => {
        const schema = BaseValidationSchemas.SafeInteger(0, 100);
        await expect(schema.parseAsync(101)).rejects.toThrow();
      });

      it('should reject non-integer', async () => {
        const schema = BaseValidationSchemas.SafeInteger();
        await expect(schema.parseAsync(3.14)).rejects.toThrow();
      });
    });

    describe('SafeDecimal', () => {
      it('should validate decimal with precision', async () => {
        const schema = BaseValidationSchemas.SafeDecimal(0, 100, 2);
        const result = await schema.parseAsync(12.345);
        expect(result).toBe(12.35);
      });

      it('should reject value below min', async () => {
        const schema = BaseValidationSchemas.SafeDecimal(0, 100);
        await expect(schema.parseAsync(-0.01)).rejects.toThrow();
      });

      it('should reject value above max', async () => {
        const schema = BaseValidationSchemas.SafeDecimal(0, 100);
        await expect(schema.parseAsync(100.01)).rejects.toThrow();
      });
    });
  });

  describe('FoodTruckValidationSchemas', () => {
    let FoodTruckValidationSchemas: typeof import('@/lib/validation/securitySchemas').FoodTruckValidationSchemas;

    beforeEach(async () => {
      const mod = await import('@/lib/validation/securitySchemas');
      FoodTruckValidationSchemas = mod.FoodTruckValidationSchemas;
    });

    describe('Create', () => {
      it('should validate valid truck data', async () => {
        const result = await FoodTruckValidationSchemas.Create.parseAsync({
          name: 'Taco Truck',
        });
        expect(result.name).toBe('Taco Truck');
      });

      it('should reject name shorter than 2 chars', async () => {
        await expect(
          FoodTruckValidationSchemas.Create.parseAsync({ name: 'A' })
        ).rejects.toThrow();
      });
    });

    describe('Update', () => {
      it('should validate valid update data', async () => {
        const result = await FoodTruckValidationSchemas.Update.parseAsync({
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Updated Name',
        });
        expect(result.name).toBe('Updated Name');
      });

      it('should require valid UUID for id', async () => {
        await expect(
          FoodTruckValidationSchemas.Update.parseAsync({ id: 'invalid' })
        ).rejects.toThrow();
      });

      it('should allow partial update without name', async () => {
        const result = await FoodTruckValidationSchemas.Update.parseAsync({
          id: '550e8400-e29b-41d4-a716-446655440000',
          description: 'New description',
        });
        expect(result.description).toBe('New description');
      });

      it('should validate current_location', async () => {
        const result = await FoodTruckValidationSchemas.Create.parseAsync({
          name: 'Truck',
          current_location: {
            lat: 33.749,
            lng: -84.388,
            address: 'Atlanta, GA',
          },
        });
        expect(result.current_location?.lat).toBe(33.749);
      });

      it('should reject invalid latitude in current_location', async () => {
        await expect(
          FoodTruckValidationSchemas.Create.parseAsync({
            name: 'Truck',
            current_location: {
              lat: 100,
              lng: -84.388,
            },
          })
        ).rejects.toThrow();
      });

      it('should validate contact_info', async () => {
        const result = await FoodTruckValidationSchemas.Create.parseAsync({
          name: 'Truck',
          contact_info: {
            phone: '555-1234',
            email: 'test@example.com',
            website: 'https://example.com',
          },
        });
        expect(result.contact_info?.email).toBe('test@example.com');
      });
    });
  });

  describe('UserProfileValidationSchemas', () => {
    let UserProfileValidationSchemas: typeof import('@/lib/validation/securitySchemas').UserProfileValidationSchemas;

    beforeEach(async () => {
      const mod = await import('@/lib/validation/securitySchemas');
      UserProfileValidationSchemas = mod.UserProfileValidationSchemas;
    });

    describe('Update', () => {
      it('should validate partial update', async () => {
        const result = await UserProfileValidationSchemas.Update.parseAsync({
          full_name: 'John Doe',
        });
        expect(result.full_name).toBe('John Doe');
      });

      it('should validate email update', async () => {
        const result = await UserProfileValidationSchemas.Update.parseAsync({
          email: 'test@example.com',
        });
        expect(result.email).toBe('test@example.com');
      });
    });

    describe('Create', () => {
      it('should validate required email', async () => {
        const result = await UserProfileValidationSchemas.Create.parseAsync({
          email: 'test@example.com',
        });
        expect(result.email).toBe('test@example.com');
      });
    });
  });

  describe('MenuItemValidationSchemas', () => {
    let MenuItemValidationSchemas: typeof import('@/lib/validation/securitySchemas').MenuItemValidationSchemas;

    beforeEach(async () => {
      const mod = await import('@/lib/validation/securitySchemas');
      MenuItemValidationSchemas = mod.MenuItemValidationSchemas;
    });

    describe('Create', () => {
      it('should validate valid menu item', async () => {
        const result = await MenuItemValidationSchemas.Create.parseAsync({
          truck_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Tacos',
          price: 9.99,
        });
        expect(result.name).toBe('Tacos');
      });

      it('should reject negative price', async () => {
        await expect(
          MenuItemValidationSchemas.Create.parseAsync({
            truck_id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Tacos',
            price: -1,
          })
        ).rejects.toThrow();
      });

      it('should accept optional category', async () => {
        const result = await MenuItemValidationSchemas.Create.parseAsync({
          truck_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Tacos',
          price: 9.99,
          category: 'Mexican',
        });
        expect(result.category).toBe('Mexican');
      });

      it('should accept dietary_info array', async () => {
        const result = await MenuItemValidationSchemas.Create.parseAsync({
          truck_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Tacos',
          price: 9.99,
          dietary_info: ['vegetarian', 'gluten-free'],
        });
        expect(result.dietary_info).toContain('vegetarian');
      });

      it('should limit cuisine types to 10', async () => {
        await expect(
          MenuItemValidationSchemas.Create.parseAsync({
            truck_id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Truck',
            cuisine_type: Array(15).fill('type'),
          })
        ).rejects.toThrow();
      });
    });

    describe('Update', () => {
      it('should allow partial updates', async () => {
        const result = await MenuItemValidationSchemas.Update.parseAsync({
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Updated Tacos',
        });
        expect(result.name).toBe('Updated Tacos');
      });

      it('should allow updating price only', async () => {
        const result = await MenuItemValidationSchemas.Update.parseAsync({
          id: '550e8400-e29b-41d4-a716-446655440000',
          price: 12.99,
        });
        expect(result.price).toBe(12.99);
      });

      it('should require valid UUID for id', async () => {
        await expect(
          MenuItemValidationSchemas.Update.parseAsync({ id: 'invalid' })
        ).rejects.toThrow();
      });
    });
  });

  describe('OrderValidationSchemas', () => {
    let OrderValidationSchemas: typeof import('@/lib/validation/securitySchemas').OrderValidationSchemas;

    beforeEach(async () => {
      const mod = await import('@/lib/validation/securitySchemas');
      OrderValidationSchemas = mod.OrderValidationSchemas;
    });

    describe('Create', () => {
      it('should validate valid order', async () => {
        const result = await OrderValidationSchemas.Create.parseAsync({
          truck_id: '550e8400-e29b-41d4-a716-446655440000',
          items: [{ id: '1', name: 'Taco', quantity: 2, price: 3.99 }],
          total_amount: 7.98,
          customer_name: 'John',
          customer_email: 'john@example.com',
        });
        expect(result.customer_name).toBe('John');
      });

      it('should require at least one item', async () => {
        await expect(
          OrderValidationSchemas.Create.parseAsync({
            truck_id: '550e8400-e29b-41d4-a716-446655440000',
            items: [],
            total_amount: 0,
            customer_name: 'John',
            customer_email: 'john@example.com',
          })
        ).rejects.toThrow();
      });

      it('should validate delivery address', async () => {
        const result = await OrderValidationSchemas.Create.parseAsync({
          truck_id: '550e8400-e29b-41d4-a716-446655440000',
          items: [{ id: '1', name: 'Taco', quantity: 1, price: 3.99 }],
          total_amount: 3.99,
          customer_name: 'John',
          customer_email: 'john@example.com',
          delivery_address: {
            street: '123 Main St',
            city: 'Atlanta',
            state: 'GA',
            zip: '30301',
          },
        });
        expect(result.delivery_address?.city).toBe('Atlanta');
      });

      it('should validate state format (2 chars)', async () => {
        await expect(
          OrderValidationSchemas.Create.parseAsync({
            truck_id: '550e8400-e29b-41d4-a716-446655440000',
            items: [{ id: '1', name: 'Taco', quantity: 1, price: 3.99 }],
            total_amount: 3.99,
            customer_name: 'John',
            customer_email: 'john@example.com',
            delivery_address: {
              street: '123 Main St',
              city: 'Atlanta',
              state: 'Georgia',
              zip: '30301',
            },
          })
        ).rejects.toThrow();
      });

      it('should validate zip code format', async () => {
        await expect(
          OrderValidationSchemas.Create.parseAsync({
            truck_id: '550e8400-e29b-41d4-a716-446655440000',
            items: [{ id: '1', name: 'Taco', quantity: 1, price: 3.99 }],
            total_amount: 3.99,
            customer_name: 'John',
            customer_email: 'john@example.com',
            delivery_address: {
              street: '123 Main St',
              city: 'Atlanta',
              state: 'GA',
              zip: 'invalid',
            },
          })
        ).rejects.toThrow();
      });

      it('should accept optional special instructions', async () => {
        const result = await OrderValidationSchemas.Create.parseAsync({
          truck_id: '550e8400-e29b-41d4-a716-446655440000',
          items: [{ id: '1', name: 'Taco', quantity: 1, price: 3.99 }],
          total_amount: 3.99,
          customer_name: 'John',
          customer_email: 'john@example.com',
          special_instructions: 'Extra salsa please',
        });
        expect(result.special_instructions).toBe('Extra salsa please');
      });

      it('should limit items to 50', async () => {
        const items = Array(51).fill(null).map((_, i) => ({
          id: String(i),
          name: 'Taco',
          quantity: 1,
          price: 3.99,
        }));
        await expect(
          OrderValidationSchemas.Create.parseAsync({
            truck_id: '550e8400-e29b-41d4-a716-446655440000',
            items,
            total_amount: 199.49,
            customer_name: 'John',
            customer_email: 'john@example.com',
          })
        ).rejects.toThrow();
      });
    });
  });

  describe('ReviewValidationSchemas', () => {
    let ReviewValidationSchemas: typeof import('@/lib/validation/securitySchemas').ReviewValidationSchemas;

    beforeEach(async () => {
      const mod = await import('@/lib/validation/securitySchemas');
      ReviewValidationSchemas = mod.ReviewValidationSchemas;
    });

    describe('Create', () => {
      it('should validate valid review', async () => {
        const result = await ReviewValidationSchemas.Create.parseAsync({
          truck_id: '550e8400-e29b-41d4-a716-446655440000',
          rating: 5,
          review_text: 'Great food!',
        });
        expect(result.rating).toBe(5);
      });

      it('should reject rating below 1', async () => {
        await expect(
          ReviewValidationSchemas.Create.parseAsync({
            truck_id: '550e8400-e29b-41d4-a716-446655440000',
            rating: 0,
          })
        ).rejects.toThrow();
      });

      it('should reject rating above 5', async () => {
        await expect(
          ReviewValidationSchemas.Create.parseAsync({
            truck_id: '550e8400-e29b-41d4-a716-446655440000',
            rating: 6,
          })
        ).rejects.toThrow();
      });
    });
  });

  describe('SearchValidationSchemas', () => {
    let SearchValidationSchemas: typeof import('@/lib/validation/securitySchemas').SearchValidationSchemas;

    beforeEach(async () => {
      const mod = await import('@/lib/validation/securitySchemas');
      SearchValidationSchemas = mod.SearchValidationSchemas;
    });

    describe('Query', () => {
      it('should validate search with all params', async () => {
        const result = await SearchValidationSchemas.Query.parseAsync({
          q: 'tacos',
          lat: 40.7128,
          lng: -74.006,
          radius: 10,
          limit: 20,
        });
        expect(result.q).toBe('tacos');
        expect(result.lat).toBe(40.7128);
      });

      it('should accept empty query', async () => {
        const result = await SearchValidationSchemas.Query.parseAsync({});
        expect(result).toEqual({});
      });

      it('should reject invalid latitude', async () => {
        await expect(
          SearchValidationSchemas.Query.parseAsync({ lat: 100 })
        ).rejects.toThrow();
      });
    });
  });

  describe('SecurityValidationSchemas', () => {
    let SecurityValidationSchemas: typeof import('@/lib/validation/securitySchemas').SecurityValidationSchemas;

    beforeEach(async () => {
      const mod = await import('@/lib/validation/securitySchemas');
      SecurityValidationSchemas = mod.SecurityValidationSchemas;
    });

    describe('SafeId', () => {
      it('should accept alphanumeric with hyphens and underscores', async () => {
        const schema = SecurityValidationSchemas.SafeId();
        const result = await schema.parseAsync('user-123_abc');
        expect(result).toBe('user-123_abc');
      });

      it('should reject special characters', async () => {
        const schema = SecurityValidationSchemas.SafeId();
        await expect(schema.parseAsync('user@123!')).rejects.toThrow();
      });
    });

    describe('SafeSearchQuery', () => {
      it('should accept safe characters', async () => {
        const schema = SecurityValidationSchemas.SafeSearchQuery();
        const result = await schema.parseAsync('tacos, burgers & pizza!');
        expect(result).toBe('tacos, burgers & pizza!');
      });

      it('should reject potentially dangerous characters', async () => {
        const schema = SecurityValidationSchemas.SafeSearchQuery();
        await expect(schema.parseAsync("tacos'; DROP TABLE--")).rejects.toThrow();
      });
    });

    describe('SafeFilename', () => {
      it('should accept valid filename', async () => {
        const schema = SecurityValidationSchemas.SafeFilename();
        const result = await schema.parseAsync('image_123.png');
        expect(result).toBe('image_123.png');
      });

      it('should reject filename with path traversal', async () => {
        const schema = SecurityValidationSchemas.SafeFilename();
        await expect(schema.parseAsync('../../../etc/passwd')).rejects.toThrow();
      });
    });
  });
});
