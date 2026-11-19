import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import {
  EmailSchema,
  PhoneSchema,
  UrlSchema,
  CoordinatesSchema,
  PriceRangeSchema,
  ContactInfoSchema,
  SocialMediaSchema,
  DailyOperatingHoursSchema,
  OperatingHoursSchema,
  toJSON,
} from '@/lib/validation/schemas/v1/common';

describe('common validation schemas', () => {
  describe('EmailSchema', () => {
    it('should accept valid email', () => {
      const result = EmailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should accept email with subdomain', () => {
      const result = EmailSchema.safeParse('user@mail.example.com');
      expect(result.success).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = EmailSchema.safeParse('user+tag@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = EmailSchema.safeParse('notanemail');
      expect(result.success).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = EmailSchema.safeParse('user@');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = EmailSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject email without at sign', () => {
      const result = EmailSchema.safeParse('userexample.com');
      expect(result.success).toBe(false);
    });
  });

  describe('PhoneSchema', () => {
    it('should accept valid phone', () => {
      const result = PhoneSchema.safeParse('555-1234');
      expect(result.success).toBe(true);
    });

    it('should accept phone with parentheses', () => {
      const result = PhoneSchema.safeParse('(555) 123-4567');
      expect(result.success).toBe(true);
    });

    it('should accept empty optional phone', () => {
      const result = PhoneSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('UrlSchema', () => {
    it('should accept valid http URL', () => {
      const result = UrlSchema.safeParse('http://example.com');
      expect(result.success).toBe(true);
    });

    it('should accept valid https URL', () => {
      const result = UrlSchema.safeParse('https://example.com/path');
      expect(result.success).toBe(true);
    });

    it('should accept URL with query params', () => {
      const result = UrlSchema.safeParse('https://example.com?foo=bar');
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = UrlSchema.safeParse('not a url');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = UrlSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject URL without protocol', () => {
      const result = UrlSchema.safeParse('example.com');
      expect(result.success).toBe(false);
    });
  });

  describe('CoordinatesSchema', () => {
    it('should accept valid coordinates', () => {
      const result = CoordinatesSchema.safeParse({ lat: 32.7, lng: -79.9 });
      expect(result.success).toBe(true);
    });

    it('should accept boundary lat values', () => {
      expect(CoordinatesSchema.safeParse({ lat: -90, lng: 0 }).success).toBe(true);
      expect(CoordinatesSchema.safeParse({ lat: 90, lng: 0 }).success).toBe(true);
    });

    it('should accept boundary lng values', () => {
      expect(CoordinatesSchema.safeParse({ lat: 0, lng: -180 }).success).toBe(true);
      expect(CoordinatesSchema.safeParse({ lat: 0, lng: 180 }).success).toBe(true);
    });

    it('should reject lat out of range', () => {
      const result = CoordinatesSchema.safeParse({ lat: 91, lng: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject lng out of range', () => {
      const result = CoordinatesSchema.safeParse({ lat: 0, lng: 181 });
      expect(result.success).toBe(false);
    });

    it('should reject missing lat', () => {
      const result = CoordinatesSchema.safeParse({ lng: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject missing lng', () => {
      const result = CoordinatesSchema.safeParse({ lat: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe('PriceRangeSchema', () => {
    it('should accept string price range', () => {
      const result = PriceRangeSchema.safeParse('$');
      expect(result.success).toBe(true);
    });

    it('should accept number price range', () => {
      const result = PriceRangeSchema.safeParse(2);
      expect(result.success).toBe(true);
    });

    it('should accept tuple price range', () => {
      const result = PriceRangeSchema.safeParse([1, 2]);
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const result = PriceRangeSchema.safeParse({ foo: 'bar' });
      expect(result.success).toBe(false);
    });
  });

  describe('ContactInfoSchema', () => {
    it('should accept valid contact info', () => {
      const result = ContactInfoSchema.safeParse({
        phone: '555-1234',
        email: 'test@example.com',
        website: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should accept partial contact info', () => {
      const result = ContactInfoSchema.safeParse({ phone: '555-1234' });
      expect(result.success).toBe(true);
    });

    it('should accept undefined', () => {
      const result = ContactInfoSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = ContactInfoSchema.safeParse({ email: 'notanemail' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid website', () => {
      const result = ContactInfoSchema.safeParse({ website: 'not a url' });
      expect(result.success).toBe(false);
    });
  });

  describe('SocialMediaSchema', () => {
    it('should accept valid social media', () => {
      const result = SocialMediaSchema.safeParse({
        instagram: '@tacotruck',
        facebook: 'TacoTruck',
      });
      expect(result.success).toBe(true);
    });

    it('should accept undefined and return default', () => {
      const result = SocialMediaSchema.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('should accept empty object and return default', () => {
      const result = SocialMediaSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });
  });

  describe('DailyOperatingHoursSchema', () => {
    it('should accept open and close times', () => {
      const result = DailyOperatingHoursSchema.safeParse({
        open: '09:00',
        close: '17:00',
      });
      expect(result.success).toBe(true);
    });

    it('should accept closed hours', () => {
      const result = DailyOperatingHoursSchema.safeParse({ closed: true });
      expect(result.success).toBe(true);
    });

    it('should accept empty object with closed default', () => {
      const result = DailyOperatingHoursSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.closed).toBe(true);
      }
    });
  });

  describe('OperatingHoursSchema', () => {
    it('should accept full week hours', () => {
      const result = OperatingHoursSchema.safeParse({
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { closed: true },
        sunday: { closed: true },
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimal hours', () => {
      const result = OperatingHoursSchema.safeParse({
        monday: { open: '09:00', close: '17:00' },
      });
      expect(result.success).toBe(true);
    });

    it('should default all days to closed', () => {
      const result = OperatingHoursSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.monday.closed).toBe(true);
        expect(result.data.sunday.closed).toBe(true);
      }
    });
  });

  describe('toJSON', () => {
    it('should return JSON-like metadata', () => {
      const result = toJSON(EmailSchema, 'Email');
      expect(result.$schema).toBe('zod');
      expect(result.title).toBe('Email');
      expect(result.type).toBe('unknown');
    });

    it('should use default title when not provided', () => {
      const result = toJSON(EmailSchema);
      expect(result.title).toBe('Schema');
    });
  });
});
