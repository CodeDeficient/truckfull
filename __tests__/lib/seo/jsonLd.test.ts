import { describe, it, expect } from '@jest/globals';
import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import {
  generateFoodTruckJsonLd,
  jsonLdScriptContent,
} from '@/lib/seo/jsonLd';

describe('jsonLd', () => {
  describe('generateFoodTruckJsonLd', () => {
    const baseTruck: FoodTruckDomain = {
      id: 'truck-1',
      name: 'Sample Tacos',
      description: 'Best tacos in town',
      current_location: { lat: 40.7128, lng: -74.006 },
      operating_hours: null,
      menu_items: [],
      cuisine_type: ['Mexican', 'Tacos'],
      price_range: '$$',
      average_rating: 4.5,
      review_count: 100,
      contact_info: { phone: '555-1234', website: 'https://sampletacos.example.com' },
      social_media: {
        facebook: 'https://facebook.com/sampletacos',
        instagram: 'https://instagram.com/sampletacos',
      },
    };

    it('should generate basic JSON-LD structure', () => {
      const jsonLd = generateFoodTruckJsonLd(baseTruck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(jsonLd['@type']).toBe('FoodEstablishment');
      expect(jsonLd.name).toBe('Sample Tacos');
      expect(jsonLd.url).toBe('https://truckfull.com/truck/taco-express');
    });

    it('should include description when present', () => {
      const jsonLd = generateFoodTruckJsonLd(baseTruck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.description).toBe('Best tacos in town');
    });

    it('should include image from image_url', () => {
      const truck = { ...baseTruck, image_url: 'https://example.com/image.jpg' };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.image).toBe('https://example.com/image.jpg');
    });

    it('should include image from social_media photo_url', () => {
      const truck = {
        ...baseTruck,
        social_media: { ...baseTruck.social_media, photo_url: 'https://example.com/photo.jpg' },
      };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.image).toBe('https://example.com/photo.jpg');
    });

    it('should include geo coordinates', () => {
      const jsonLd = generateFoodTruckJsonLd(baseTruck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.geo).toEqual({
        '@type': 'GeoCoordinates',
        latitude: 40.7128,
        longitude: -74.006,
      });
    });

    it('should include address for domain type with city', () => {
      const truck = { ...baseTruck, city: 'New York', state: 'NY' };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.address).toEqual({
        '@type': 'PostalAddress',
        addressLocality: 'New York',
        addressRegion: 'NY',
        addressCountry: 'US',
      });
    });

    it('should include telephone from contact_info', () => {
      const jsonLd = generateFoodTruckJsonLd(baseTruck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.telephone).toBe('555-1234');
    });

    it('should include servesCuisine', () => {
      const jsonLd = generateFoodTruckJsonLd(baseTruck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.servesCuisine).toEqual(['Mexican', 'Tacos']);
    });

    it('should include priceRange', () => {
      const jsonLd = generateFoodTruckJsonLd(baseTruck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.priceRange).toBe('$$');
    });

    it('should include sameAs social links', () => {
      const jsonLd = generateFoodTruckJsonLd(baseTruck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.sameAs).toContain('https://facebook.com/sampletacos');
      expect(jsonLd.sameAs).toContain('https://instagram.com/sampletacos');
      expect(jsonLd.sameAs).toContain('https://sampletacos.example.com');
    });

    it('should include aggregateRating when available', () => {
      const jsonLd = generateFoodTruckJsonLd(baseTruck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.aggregateRating).toEqual({
        '@type': 'AggregateRating',
        ratingValue: 4.5,
        reviewCount: 100,
      });
    });

    it('should handle truck without description', () => {
      const truck = { ...baseTruck, description: undefined };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.description).toBeUndefined();
    });

    it('should handle truck without location', () => {
      const truck = { ...baseTruck, current_location: null };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.geo).toBeUndefined();
    });

    it('should handle truck without contact_info phone', () => {
      const truck = { ...baseTruck, contact_info: { website: 'https://example.com' } };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.telephone).toBeUndefined();
    });

    it('should handle truck with empty cuisine_type', () => {
      const truck = { ...baseTruck, cuisine_type: [] };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.servesCuisine).toBeUndefined();
    });

    it('should handle FoodTruck type', () => {
      const foodTruck: FoodTruck = {
        id: 'truck-2',
        name: 'Burger Palace',
        slug: 'burger-palace',
        description: 'Best burgers',
        current_location: { lat: 34.0522, lng: -118.2437 },
        operating_hours: null,
        menu_items: [],
        cuisine_type: ['American', 'Burgers'],
        price_range: '$$',
        contact_info: { phone: '555-5678' },
        social_media: {},
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        verified_at: null,
        status: 'live',
      };
      const jsonLd = generateFoodTruckJsonLd(foodTruck, 'https://truckfull.com/truck/burger-palace');
      expect(jsonLd.name).toBe('Burger Palace');
      expect(jsonLd.telephone).toBe('555-5678');
    });

    it('should not include aggregateRating when average_rating missing', () => {
      const truck = { ...baseTruck, average_rating: undefined };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.aggregateRating).toBeUndefined();
    });

    it('should not include aggregateRating when review_count missing', () => {
      const truck = { ...baseTruck, review_count: undefined };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.aggregateRating).toBeUndefined();
    });

    it('should handle only website in sameAs', () => {
      const truck = {
        ...baseTruck,
        contact_info: { website: 'https://example.com' },
        social_media: {},
      };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.sameAs).toEqual(['https://example.com']);
    });

    it('should include openingHoursSpecification when operating_hours are present', () => {
      const truck = {
        ...baseTruck,
        operating_hours: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '09:00', close: '17:00' },
        },
      };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.openingHoursSpecification).toBeDefined();
      expect(jsonLd.openingHoursSpecification).toHaveLength(2);
      expect(jsonLd.openingHoursSpecification![0]).toEqual({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday'],
        opens: '09:00',
        closes: '17:00',
      });
    });

    it('should include menu items in JSON-LD when menu_items exist', () => {
      const truck = {
        ...baseTruck,
        menu_items: [
          { name: 'Taco al Pastor', price: 4.5, description: 'Spicy pork taco' },
          { name: 'Guacamole', price: 3.0 },
        ],
      };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.hasMenu).toBeDefined();
      expect(jsonLd.hasMenu!['@type']).toBe('Menu');
      expect(jsonLd.hasMenu!.hasMenuSection).toHaveLength(1);
      expect(jsonLd.hasMenu!.hasMenuSection[0]['@type']).toBe('MenuSection');
      expect(jsonLd.hasMenu!.hasMenuSection[0].name).toBe('Menu');
      const menuItems = jsonLd.hasMenu!.hasMenuSection[0].hasMenuItem;
      expect(menuItems).toHaveLength(2);
      expect(menuItems[0].name).toBe('Taco al Pastor');
      expect(menuItems[0].offers!.price).toBe('4.50');
      expect(menuItems[1].name).toBe('Guacamole');
      expect(menuItems[1].description).toBeUndefined();
    });

    it('should include menu items with description in JSON-LD', () => {
      const truck = {
        ...baseTruck,
        menu_items: [
          { name: 'Taco al Pastor', price: 4.5, description: 'Spicy pork taco' },
        ],
      };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      const item = jsonLd.hasMenu!.hasMenuSection[0].hasMenuItem[0];
      expect(item.description).toBe('Spicy pork taco');
    });

    it('should omit hasMenu from JSON-LD when no menu_items', () => {
      const truck = { ...baseTruck, menu_items: [] };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.hasMenu).toBeUndefined();
    });

    it('should omit hasMenu when menu_items is null', () => {
      const truck = { ...baseTruck, menu_items: null as unknown as typeof baseTruck.menu_items };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.hasMenu).toBeUndefined();
    });

    it('should group menu items by category into separate sections', () => {
      const truck = {
        ...baseTruck,
        menu_items: [
          { name: 'Burger', price: 10, category: 'Entrees' },
          { name: 'Fries', price: 5, category: 'Sides' },
        ],
      };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.hasMenu!.hasMenuSection).toHaveLength(2);
      expect(jsonLd.hasMenu!.hasMenuSection[0].name).toBe('Entrees');
      expect(jsonLd.hasMenu!.hasMenuSection[0].hasMenuItem[0].name).toBe('Burger');
      expect(jsonLd.hasMenu!.hasMenuSection[1].name).toBe('Sides');
      expect(jsonLd.hasMenu!.hasMenuSection[1].hasMenuItem[0].name).toBe('Fries');
    });

    it('should format integer prices as decimal with toFixed(2)', () => {
      const truck = {
        ...baseTruck,
        menu_items: [
          { name: 'Burger', price: 10 },
        ],
      };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.hasMenu!.hasMenuSection[0].hasMenuItem[0].offers!.price).toBe('10.00');
    });

    it('should include sameAs with social links when available', () => {
      const truck = {
        ...baseTruck,
        social_media: {
          facebook: 'https://facebook.com/sampletacos',
          instagram: 'https://instagram.com/sampletacos',
        },
      };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.sameAs).toContain('https://facebook.com/sampletacos');
      expect(jsonLd.sameAs).toContain('https://instagram.com/sampletacos');
    });

    it('should include website in sameAs when contact_info has website', () => {
      const truck = {
        ...baseTruck,
        contact_info: { website: 'https://sampletacos.example.com' },
      };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.sameAs).toContain('https://sampletacos.example.com');
    });

    it('should omit sameAs when no social links or website', () => {
      const truck = {
        ...baseTruck,
        contact_info: {},
        social_media: {},
      };
      const jsonLd = generateFoodTruckJsonLd(truck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.sameAs).toBeUndefined();
    });

    it('should omit openingHoursSpecification when operating_hours is null', () => {
      const jsonLd = generateFoodTruckJsonLd(baseTruck, 'https://truckfull.com/truck/taco-express');
      expect(jsonLd.openingHoursSpecification).toBeUndefined();
    });
  });

  describe('jsonLdScriptContent', () => {
    it('should stringify JSON-LD data', () => {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'FoodEstablishment',
        name: 'Test',
      };
      const content = jsonLdScriptContent(data);
      expect(content).toBe(JSON.stringify(data));
    });
  });
});
