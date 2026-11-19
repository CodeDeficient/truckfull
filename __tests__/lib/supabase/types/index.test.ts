import { describe, it, expect } from '@jest/globals';
import type {
  FoodTruckLocation,
  RawMenuItemFromDB,
  OrderItem,
  OrderHistory,
  OrderWithItems,
  MobileOrder,
} from '../../lib/supabase/types/index';

describe('lib/supabase/types/index', () => {
  describe('FoodTruckLocation', () => {
    it('should accept valid location data', () => {
      const location: FoodTruckLocation = {
        lat: 40.7128,
        lng: -74.006,
        address: '123 Main St',
        timestamp: '2024-01-15T10:00:00Z',
      };
      expect(location.lat).toBe(40.7128);
      expect(location.lng).toBe(-74.006);
      expect(location.address).toBe('123 Main St');
      expect(location.timestamp).toBe('2024-01-15T10:00:00Z');
    });

    it('should allow location without address', () => {
      const location: FoodTruckLocation = {
        lat: 40.7128,
        lng: -74.006,
        timestamp: '2024-01-15T10:00:00Z',
      };
      expect(location.lat).toBe(40.7128);
      expect(location.address).toBeUndefined();
    });
  });

  describe('RawMenuItemFromDB', () => {
    it('should accept valid menu item', () => {
      const item: RawMenuItemFromDB = {
        name: 'Tacos',
        description: 'Delicious tacos',
        price: 9.99,
        dietary_tags: ['gluten-free'],
        category: 'Mexican',
      };
      expect(item.name).toBe('Tacos');
      expect(item.price).toBe(9.99);
    });

    it('should allow missing optional fields', () => {
      const item: RawMenuItemFromDB = {
        name: 'Simple Item',
      };
      expect(item.name).toBe('Simple Item');
      expect(item.description).toBeUndefined();
      expect(item.price).toBeUndefined();
    });

    it('should allow index signature', () => {
      const item: RawMenuItemFromDB = {
        name: 'Item',
        customField: 'custom value',
      };
      expect((item as Record<string, unknown>)['customField']).toBe('custom value');
    });
  });

  describe('OrderItem', () => {
    it('should accept valid order item', () => {
      const item: OrderItem = {
        id: 'item-1',
        name: 'Burger',
        quantity: 2,
        price: 12.99,
      };
      expect(item.id).toBe('item-1');
      expect(item.quantity).toBe(2);
      expect(item.price).toBe(12.99);
    });
  });

  describe('OrderHistory', () => {
    it('should accept valid order history', () => {
      const order: OrderHistory = {
        id: 'order-1',
        orderId: 'ORD-001',
        status: 'pending',
        totalAmount: 25.99,
        items: [
          { id: 'item-1', name: 'Tacos', quantity: 2, price: 10.99 },
        ],
        date: '2024-01-15',
        time: '12:00',
        truckName: 'Taco Truck',
        truckId: 'truck-1',
      };
      expect(order.orderId).toBe('ORD-001');
      expect(order.status).toBe('pending');
      expect(order.items.length).toBe(1);
    });

    it('should allow optional estimatedDelivery', () => {
      const order: OrderHistory = {
        id: 'order-1',
        orderId: 'ORD-001',
        status: 'preparing',
        totalAmount: 25.99,
        items: [],
        date: '2024-01-15',
        time: '12:00',
        truckName: 'Taco Truck',
        estimatedDelivery: '12:30',
      };
      expect(order.estimatedDelivery).toBe('12:30');
    });
  });

  describe('OrderWithItems', () => {
    it('should extend OrderHistory', () => {
      const order: OrderWithItems = {
        id: 'order-1',
        orderId: 'ORD-001',
        status: 'delivered',
        totalAmount: 30.99,
        items: [
          { id: 'item-1', name: 'Pizza', quantity: 1, price: 15.99 },
          { id: 'item-2', name: 'Salad', quantity: 1, price: 15.0 },
        ],
        date: '2024-01-15',
        time: '18:00',
        truckName: 'Pizza Truck',
      };
      expect(order.items.length).toBe(2);
    });
  });

  describe('MobileOrder', () => {
    it('should accept valid mobile order', () => {
      const order: MobileOrder = {
        id: 'mobile-1',
        orderId: 'MOB-001',
        date: '2024-01-15',
        time: '12:00',
        status: 'ready',
        total: '$25.99',
        items: 3,
        truck: 'Food Truck',
      };
      expect(order.orderId).toBe('MOB-001');
      expect(order.total).toBe('$25.99');
    });

    it('should allow optional estimatedDelivery', () => {
      const order: MobileOrder = {
        id: 'mobile-1',
        orderId: 'MOB-001',
        date: '2024-01-15',
        time: '12:00',
        status: 'out-for-delivery',
        total: '$25.99',
        items: 3,
        truck: 'Food Truck',
        estimatedDelivery: '12:30',
      };
      expect(order.estimatedDelivery).toBe('12:30');
    });
  });
});