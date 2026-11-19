import { describe, it, expect } from '@jest/globals';
import {
  transformPhotoUrl,
  TRUCKFULL_DEFAULT_LOGO,
  getTruckProfileImage,
  getTruckProfileImageFromUrl,
} from '@/lib/utils/photoTransform';

describe('transformPhotoUrl', () => {
  it('should return undefined for null input', () => {
    expect(transformPhotoUrl(null)).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    expect(transformPhotoUrl(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(transformPhotoUrl('')).toBeUndefined();
  });

  it('should pass through non-Supabase URLs unchanged', () => {
    const url = 'https://example.com/photo.jpg';
    expect(transformPhotoUrl(url)).toBe(url);
  });

  it('should pass through non-Supabase URLs with query params unchanged', () => {
    const url = 'https://cdn.example.com/img.jpg?w=200&q=80';
    expect(transformPhotoUrl(url)).toBe(url);
  });

  it('should pass through Supabase URLs unchanged for next/image optimization', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/public/truck-profile-images/test.jpg';
    expect(transformPhotoUrl(url)).toBe(url);
  });

  it('should pass through Supabase URLs with existing query params unchanged', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/public/truck-profile-images/test.jpg?existing=param';
    expect(transformPhotoUrl(url)).toBe(url);
  });

  it('should preserve the full bucket path and filename', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/public/truck-profile-images/85d90e6f-85ea-45ff-9ad0-35a6ea454b3c-profile.jpg';
    expect(transformPhotoUrl(url)).toBe(url);
  });

  it('should pass through user-avatars bucket paths unchanged', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/public/user-avatars/avatars/abc123/photo.png';
    expect(transformPhotoUrl(url)).toBe(url);
  });

  it('should accept width parameter for future use', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/public/truck-profile-images/test.jpg';
    expect(transformPhotoUrl(url, 320)).toBe(url);
  });
});

describe('TRUCKFULL_DEFAULT_LOGO', () => {
  it('should be the truck fallback image path', () => {
    expect(TRUCKFULL_DEFAULT_LOGO).toBe('/truckfull-fallback-512.webp');
  });
});

describe('getTruckProfileImage', () => {
  it('should return URL for Supabase-hosted truck photo', () => {
    const truck = {
      social_media: {
        photo_url:
          'https://project.supabase.co/storage/v1/object/public/truck-profile-images/test.jpg',
      },
    };
    const result = getTruckProfileImage(truck);
    expect(result).toBe(
      'https://project.supabase.co/storage/v1/object/public/truck-profile-images/test.jpg',
    );
  });

  it('should return default logo when photo_url is null', () => {
    expect(getTruckProfileImage({ social_media: { photo_url: null } })).toBe(
      TRUCKFULL_DEFAULT_LOGO,
    );
  });

  it('should return default logo when truck is null', () => {
    expect(getTruckProfileImage(null)).toBe(TRUCKFULL_DEFAULT_LOGO);
  });

  it('should return default logo when truck is undefined', () => {
    expect(getTruckProfileImage(undefined)).toBe(TRUCKFULL_DEFAULT_LOGO);
  });

  it('should return default logo for empty string photo_url', () => {
    expect(getTruckProfileImage({ social_media: { photo_url: '' } })).toBe(
      TRUCKFULL_DEFAULT_LOGO,
    );
  });
});

describe('getTruckProfileImageFromUrl', () => {
  it('should return URL for Supabase URL', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/public/truck-profile-images/test.jpg';
    expect(getTruckProfileImageFromUrl(url)).toBe(url);
  });

  it('should return default logo for null', () => {
    expect(getTruckProfileImageFromUrl(null)).toBe(TRUCKFULL_DEFAULT_LOGO);
  });

  it('should return default logo for undefined', () => {
    expect(getTruckProfileImageFromUrl(undefined)).toBe(TRUCKFULL_DEFAULT_LOGO);
  });

  it('should return default logo for empty string', () => {
    expect(getTruckProfileImageFromUrl('')).toBe(TRUCKFULL_DEFAULT_LOGO);
  });

  it('should pass through non-Supabase URLs unchanged', () => {
    const url = 'https://example.com/photo.jpg';
    expect(getTruckProfileImageFromUrl(url)).toBe(url);
  });
});
