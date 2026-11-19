/**
 * Tests for lib/mappers/domain.ts
 * Specifically tests menu format detection and preservation
 */

import { fromDomainToFoodTruck, fromFoodTruckRow } from '../domain';
import type { FoodTruckDomain, MenuItem, MenuCategory } from '@/lib/types';
import { generateFoodTruckJsonLd } from '@/lib/seo/jsonLd';

describe('domain mapper', () => {
  describe('groupMenuItemsByCategory', () => {
    // Helper to create a minimal domain object for testing
    const createMockDomain = (menuItems: MenuItem[]): FoodTruckDomain => ({
      id: 'test-id',
      name: 'Test Truck',
      description: 'Test Description',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_location: null,
      operating_hours: null,
      menu_items: menuItems,
      cuisine_type: [],
      price_range: '$',
      specialties: [],
      data_quality_score: 0.5,
      verification_status: 'pending',
      source_url: '',
      last_synced_at: new Date().toISOString(),
      average_rating: 0,
      review_count: 0,
      contact_info: {},
      social_media: {},
      is_active: true,
      owner_id: null,
    });

    it('should preserve already-grouped menu format', () => {
      // This is the format we store in the database
      const groupedMenu: MenuCategory[] = [
        {
          name: 'Specialty Burgers',
          items: [{ name: 'WTF Burger', price: 15, description: 'Delicious burger' }],
        },
        {
          name: 'Sandwiches',
          items: [
            { name: 'Chicken Sandwich', price: 12 },
            { name: 'Philly Cheese', price: 14 },
          ],
        },
        {
          name: 'Drinks',
          items: [{ name: 'WTF Punch', price: 4 }],
        },
      ];

      // Cast as MenuItem[] to simulate how it comes from the database
      const domain = createMockDomain(groupedMenu as unknown as MenuItem[]);
      const result = fromDomainToFoodTruck(domain);

      // Verify categories are preserved
      expect(result.menu).toHaveLength(3);
      expect(result.menu![0].name).toBe('Specialty Burgers');
      expect(result.menu![0].items).toHaveLength(1);
      expect(result.menu![0].items[0].name).toBe('WTF Burger');
      expect(result.menu![1].name).toBe('Sandwiches');
      expect(result.menu![1].items).toHaveLength(2);
      expect(result.menu![2].name).toBe('Drinks');
    });

    it('should NOT put grouped categories under "Other"', () => {
      // This was the bug - grouped categories were being treated as items
      const groupedMenu: MenuCategory[] = [
        { name: 'Burgers', items: [{ name: 'Burger', price: 10 }] },
        { name: 'Sides', items: [{ name: 'Fries', price: 5 }] },
      ];

      const domain = createMockDomain(groupedMenu as unknown as MenuItem[]);
      const result = fromDomainToFoodTruck(domain);

      // Should NOT have an "Other" category
      const otherCategory = result.menu?.find((cat) => cat.name === 'Other');
      expect(otherCategory).toBeUndefined();

      // Should have the original categories
      expect(result.menu?.map((c) => c.name)).toEqual(['Burgers', 'Sides']);
    });

    it('should group flat menu items by category', () => {
      // Legacy flat format with category field on each item
      const flatMenu: MenuItem[] = [
        { name: 'Burger', price: 10, category: 'Burgers' },
        { name: 'Hot Dog', price: 8, category: 'Burgers' },
        { name: 'Fries', price: 5, category: 'Sides' },
        { name: 'Soda', price: 3, category: 'Drinks' },
      ];

      const domain = createMockDomain(flatMenu);
      const result = fromDomainToFoodTruck(domain);

      expect(result.menu).toHaveLength(3);

      const burgers = result.menu?.find((c) => c.name === 'Burgers');
      expect(burgers?.items).toHaveLength(2);

      const sides = result.menu?.find((c) => c.name === 'Sides');
      expect(sides?.items).toHaveLength(1);
    });

    it('should default to "Other" for flat items without category', () => {
      const flatMenuNoCategory: MenuItem[] = [
        { name: 'Mystery Item', price: 10 },
        { name: 'Another Item', price: 5 },
      ];

      const domain = createMockDomain(flatMenuNoCategory);
      const result = fromDomainToFoodTruck(domain);

      expect(result.menu).toHaveLength(1);
      expect(result.menu![0].name).toBe('Other');
      expect(result.menu![0].items).toHaveLength(2);
    });

    it('should handle empty menu', () => {
      const domain = createMockDomain([]);
      const result = fromDomainToFoodTruck(domain);

      expect(result.menu).toHaveLength(0);
    });

    it('should preserve a canonical persisted slug', () => {
      const domain = { ...createMockDomain([]), slug: 'legacy-canonical-slug' };

      expect(fromDomainToFoodTruck(domain).slug).toBe('legacy-canonical-slug');
    });

    it('should generate a slug when the persisted slug is blank', () => {
      const domain = { ...createMockDomain([]), slug: '  ' };

      expect(fromDomainToFoodTruck(domain).slug).toBe('test-truck');
    });

    it('should use the truck ID when both persisted and generated slugs are blank', () => {
      const domain = { ...createMockDomain([]), name: '!!!', slug: '' };

      expect(fromDomainToFoodTruck(domain).slug).toBe('test-id');
    });
  });

  describe('fromFoodTruckRow', () => {
    const baseRow = {
      id: 'truck-1',
      name: 'Taco Mama',
      slug: 'taco-mama',
      description: 'Great tacos',
      cuisine_type: ['Mexican'],
      city: 'Augusta',
      state: 'GA',
      price_range: '$$',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      current_location: null,
      operating_hours: null,
      menu: null,
      contact_info: {},
      social_media: {},
      is_active: true,
      owner_id: null,
      data_quality_score: 0,
      verification_status: 'pending',
      last_synced_at: '2026-01-01T00:00:00Z',
      average_rating: 4.5,
      review_count: 12,
      view_count: 0,
      menu_items: null,
      has_menu: false,
      source_url: null,
      specialties: null,
      is_claimed: null,
      subscription_tier: null,
      claimed_at: null,
      claimed_by: null,
      claim_verification_method: null,
      street_address: null,
      zip: null,
      default_lat: null,
      default_lng: null,
      live_gps_lat: null,
      live_gps_lng: null,
      live_gps_accuracy: null,
      live_gps_timestamp: null,
      status: null,
      exact_location: null,
      city_location: null,
      location_geog: null,
      verification_documents: null,
      verification_notes: null,
      verification_requested_at: null,
      verified_at: null,
      verified_by: null,
      review_status: null,
    };

    it('maps slug from the row', () => {
      const result = fromFoodTruckRow(baseRow);
      expect(result.slug).toBe('taco-mama');
    });

    it('maps slug as undefined when row slug is null', () => {
      const result = fromFoodTruckRow({ ...baseRow, slug: null });
      expect(result.slug).toBeUndefined();
    });

    it('maps city and state from the row', () => {
      const result = fromFoodTruckRow(baseRow);
      expect(result.city).toBe('Augusta');
      expect(result.state).toBe('GA');
    });

    it('maps city and state as undefined when null', () => {
      const result = fromFoodTruckRow({ ...baseRow, city: null, state: null });
      expect(result.city).toBeUndefined();
      expect(result.state).toBeUndefined();
    });

    it('maps price_range from the row', () => {
      const result = fromFoodTruckRow(baseRow);
      expect(result.price_range).toBe('$$');
    });

    it('maps price_range as undefined when null', () => {
      const result = fromFoodTruckRow({ ...baseRow, price_range: null });
      expect(result.price_range).toBeUndefined();
    });

    it('preserves existing fields (id, name, description)', () => {
      const result = fromFoodTruckRow(baseRow);
      expect(result.id).toBe('truck-1');
      expect(result.name).toBe('Taco Mama');
      expect(result.description).toBe('Great tacos');
    });

    it('retains average_rating and review_count from the row', () => {
      const result = fromFoodTruckRow(baseRow);
      expect(result.average_rating).toBe(4.5);
      expect(result.review_count).toBe(12);
    });

    it('produces aggregateRating JSON-LD when rating > 0', () => {
      const truck = fromFoodTruckRow(baseRow);
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.food/taco-mama');
      expect(jsonLd.aggregateRating).toBeDefined();
      expect(jsonLd.aggregateRating!.ratingValue).toBe(4.5);
      expect(jsonLd.aggregateRating!.reviewCount).toBe(12);
    });
  });
});
