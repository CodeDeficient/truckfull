/**
 * Truck Profile Image Utilities Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  TRUCKFULL_DEFAULT_LOGO,
  getTruckProfileImage,
  getTruckProfileImageFromUrl,
} from '@/lib/utils/truckProfileImage';

describe('truckProfileImage', () => {
  describe('TRUCKFULL_DEFAULT_LOGO', () => {
    it('should have correct default logo path', () => {
      expect(TRUCKFULL_DEFAULT_LOGO).toBe('/truckfull-fallback-512.webp');
    });
  });

  describe('getTruckProfileImage', () => {
    it('should return truck photo_url when available', () => {
      const truck = {
        social_media: {
          photo_url: 'https://example.com/truck.jpg',
        },
      };
      expect(getTruckProfileImage(truck)).toBe('https://example.com/truck.jpg');
    });

    it('should pass Supabase URLs through for next/image optimization', () => {
      const truck = {
        social_media: {
          photo_url: 'https://project.supabase.co/storage/v1/object/public/truck-profile-images/85d90e6f-85ea-45ff-9ad0-35a6ea454b3c-profile.jpg',
        },
      };
      const result = getTruckProfileImage(truck);
      expect(result).toBe('https://project.supabase.co/storage/v1/object/public/truck-profile-images/85d90e6f-85ea-45ff-9ad0-35a6ea454b3c-profile.jpg');
    });

    it('should return default logo when photo_url is null', () => {
      const truck = {
        social_media: {
          photo_url: null,
        },
      };
      expect(getTruckProfileImage(truck)).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should return default logo when photo_url is undefined', () => {
      const truck = {
        social_media: {
          photo_url: undefined,
        },
      };
      expect(getTruckProfileImage(truck)).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should return default logo when social_media is null', () => {
      const truck = {
        social_media: null,
      };
      expect(getTruckProfileImage(truck)).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should return default logo when social_media is undefined', () => {
      const truck = {
        social_media: undefined,
      };
      expect(getTruckProfileImage(truck)).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should return default logo when truck is null', () => {
      expect(getTruckProfileImage(null)).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should return default logo when truck is undefined', () => {
      expect(getTruckProfileImage(undefined)).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should return default logo when truck has no social_media property', () => {
      const truck = {};
      expect(getTruckProfileImage(truck)).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should handle empty string photo_url as falsy', () => {
      const truck = {
        social_media: {
          photo_url: '',
        },
      };
      expect(getTruckProfileImage(truck)).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should handle whitespace-only photo_url as truthy', () => {
      const truck = {
        social_media: {
          photo_url: '   ',
        },
      };
      expect(getTruckProfileImage(truck)).toBe('   ');
    });
  });

  describe('getTruckProfileImageFromUrl', () => {
    it('should return the URL when provided', () => {
      expect(getTruckProfileImageFromUrl('https://example.com/truck.jpg')).toBe(
        'https://example.com/truck.jpg'
      );
    });

    it('should return default logo when url is null', () => {
      expect(getTruckProfileImageFromUrl(null)).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should return default logo when url is undefined', () => {
      expect(getTruckProfileImageFromUrl(undefined)).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should return default logo when url is empty string', () => {
      expect(getTruckProfileImageFromUrl('')).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should return default logo when url is not provided', () => {
      expect(getTruckProfileImageFromUrl()).toBe(TRUCKFULL_DEFAULT_LOGO);
    });

    it('should handle whitespace-only url as truthy', () => {
      expect(getTruckProfileImageFromUrl('   ')).toBe('   ');
    });

    it('should pass Supabase URLs through unchanged via getTruckProfileImageFromUrl', () => {
      const url = 'https://project.supabase.co/storage/v1/object/public/truck-profile-images/test.jpg';
      const result = getTruckProfileImageFromUrl(url);
      expect(result).toBe(url);
    });

    it('should handle URL with special characters and append transform', () => {
      expect(getTruckProfileImageFromUrl('https://example.com/truck?id=123&name=test')).toBe(
        'https://example.com/truck?id=123&name=test'
      );
    });
  });
});
