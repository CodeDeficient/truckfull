import { describe, it, expect } from '@jest/globals';
import { validateDataQuality } from '@/lib/webhooks/dataQuality';
import type { ParsedPost } from '@/lib/webhooks/types';

describe('validateDataQuality', () => {
  it('should validate complete and valid data', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: {
        truck_name: 'Taco Truck',
        location: {
          address: '123 Main St, San Francisco, CA',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        food_items: ['tacos', 'burritos'],
        cuisine_type: ['Mexican'],
        time: {
          start: '11:00',
          end: '15:00',
          date: '2024-01-01',
        },
        contact_info: {
          phone: '555-123-4567',
          email: 'taco@truck.com',
          website: 'https://tacotruck.example.com',
        },
      },
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing truck name', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: {
        location: {
          address: '123 Main St',
        },
      },
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'truck_name')).toBe(true);
  });

  it('should detect missing location', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be serving tacos today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: {
        truck_name: 'Taco Truck',
      },
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'location')).toBe(true);
  });

  it('should detect invalid coordinates', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: {
        truck_name: 'Taco Truck',
        location: {
          latitude: 999,
          longitude: 999,
        },
      },
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'coordinates')).toBe(true);
  });

  it('should detect missing food items', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: {
        truck_name: 'Taco Truck',
        location: {
          address: '123 Main St',
        },
      },
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'food_items')).toBe(true);
  });

  it('should detect invalid time format', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: {
        truck_name: 'Taco Truck',
        location: {
          address: '123 Main St',
        },
        food_items: ['tacos'],
        time: {
          start: 'invalid',
          end: '15:00',
        },
      },
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'time')).toBe(true);
  });

  it('should detect missing extracted_data', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'extracted_data')).toBe(true);
  });

  it('should detect empty food items list', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: {
        truck_name: 'Taco Truck',
        location: {
          address: '123 Main St',
        },
        food_items: [],
      },
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'food_items')).toBe(true);
  });

  it('should validate partial data with warnings', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: {
        truck_name: 'Taco Truck',
        location: {
          address: '123 Main St',
        },
        food_items: ['tacos'],
        cuisine_type: [],
      },
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(true);
    expect(result.errors.some((e) => e.severity === 'warning')).toBe(true);
  });

  it('should handle null values gracefully', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: null as unknown as ParsedPost['extracted_data'],
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect incomplete address', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: {
        truck_name: 'Taco Truck',
        location: {
          address: 'Main',
        },
        food_items: ['tacos'],
      },
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'address')).toBe(true);
  });

  it('should validate end time is after start time', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'We will be at downtown park today.',
      timestamp: '2024-01-01T12:00:00Z',
      extracted_data: {
        truck_name: 'Taco Truck',
        location: {
          address: '123 Main St',
        },
        food_items: ['tacos'],
        time: {
          start: '15:00',
          end: '11:00',
          date: '2024-01-01',
        },
      },
    };

    const result = validateDataQuality(post);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'time')).toBe(true);
  });
});
