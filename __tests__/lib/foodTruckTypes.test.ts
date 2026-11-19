import { describe, it, expect } from '@jest/globals';
import type {
  ContactInfo,
  SocialMedia,
  CurrentLocation,
  OperatingHours,
} from '../../lib/foodTruckTypes';
import { CUISINE_TYPES } from '../../lib/foodTruckTypes';

describe('foodTruckTypes', () => {
  describe('CUISINE_TYPES', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(CUISINE_TYPES)).toBe(true);
      expect(CUISINE_TYPES.length).toBeGreaterThan(0);
    });

    it('should contain expected cuisine types', () => {
      expect(CUISINE_TYPES).toContain('American');
      expect(CUISINE_TYPES).toContain('Mexican');
      expect(CUISINE_TYPES).toContain('Italian');
      expect(CUISINE_TYPES).toContain('Chinese');
      expect(CUISINE_TYPES).toContain('Japanese');
      expect(CUISINE_TYPES).toContain('Indian');
      expect(CUISINE_TYPES).toContain('Thai');
      expect(CUISINE_TYPES).toContain('BBQ');
      expect(CUISINE_TYPES).toContain('Vegan');
      expect(CUISINE_TYPES).toContain('Vegetarian');
    });

    it('should have all string entries', () => {
      CUISINE_TYPES.forEach((cuisine) => {
        expect(typeof cuisine).toBe('string');
      });
    });

    it('should not have duplicates', () => {
      const uniqueCuisines = new Set(CUISINE_TYPES);
      expect(uniqueCuisines.size).toBe(CUISINE_TYPES.length);
    });
  });

  describe('ContactInfo interface', () => {
    it('should allow optional phone', () => {
      const contact: ContactInfo = { phone: '555-1234' };
      expect(contact.phone).toBe('555-1234');
    });

    it('should allow optional email', () => {
      const contact: ContactInfo = { email: 'test@example.com' };
      expect(contact.email).toBe('test@example.com');
    });

    it('should allow optional website', () => {
      const contact: ContactInfo = { website: 'https://example.com' };
      expect(contact.website).toBe('https://example.com');
    });

    it('should allow empty object', () => {
      const contact: ContactInfo = {};
      expect(contact.phone).toBeUndefined();
    });
  });

  describe('SocialMedia interface', () => {
    it('should allow optional facebook', () => {
      const social: SocialMedia = { facebook: 'https://facebook.com/page' };
      expect(social.facebook).toBe('https://facebook.com/page');
    });

    it('should allow optional instagram', () => {
      const social: SocialMedia = { instagram: 'https://instagram.com/user' };
      expect(social.instagram).toBe('https://instagram.com/user');
    });

    it('should allow optional twitter', () => {
      const social: SocialMedia = { twitter: 'https://twitter.com/user' };
      expect(social.twitter).toBe('https://twitter.com/user');
    });
  });

  describe('CurrentLocation interface', () => {
    it('should allow address', () => {
      const loc: CurrentLocation = { address: '123 Main St' };
      expect(loc.address).toBe('123 Main St');
    });

    it('should allow lat and lng', () => {
      const loc: CurrentLocation = { lat: 40.7128, lng: -74.006 };
      expect(loc.lat).toBe(40.7128);
      expect(loc.lng).toBe(-74.006);
    });
  });

  describe('OperatingHours interface', () => {
    it('should allow day-specific hours', () => {
      const hours: OperatingHours = {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
      };
      expect(hours.monday?.open).toBe('09:00');
      expect(hours.monday?.closed).toBe(false);
    });

    it('should allow closed day', () => {
      const hours: OperatingHours = {
        sunday: { open: '', close: '', closed: true },
      };
      expect(hours.sunday?.closed).toBe(true);
    });

    it('should allow indexing with string', () => {
      const hours: OperatingHours = {};
      const day = 'monday';
      hours[day] = { open: '09:00', close: '17:00', closed: false };
      expect(hours.monday?.open).toBe('09:00');
    });
  });
});