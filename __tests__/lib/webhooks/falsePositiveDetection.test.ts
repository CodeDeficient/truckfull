import { describe, it, expect } from '@jest/globals';
import { detectFalsePositive } from '@/lib/webhooks/falsePositiveDetection';
import type { ParsedPost } from '@/lib/webhooks/types';

describe('detectFalsePositive', () => {
  it('should identify posts unrelated to food trucks', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: 'Check out our new car dealership! We have the best prices on all vehicles.',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectFalsePositive(post);
    expect(result.isFalsePositive).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should detect non-food related keywords', () => {
    const post: ParsedPost = {
      id: '2',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/2',
      content: 'Join us for a real estate seminar this weekend. Learn how to invest in properties.',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectFalsePositive(post);
    expect(result.isFalsePositive).toBe(true);
    expect(result.reasons).toContain('No food-related keywords');
  });

  it('should identify legitimate food truck posts', () => {
    const post: ParsedPost = {
      id: '3',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/3',
      content:
        'We will be serving delicious tacos and burritos at the downtown park today from 11am to 3pm.',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectFalsePositive(post);
    expect(result.isFalsePositive).toBe(false);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('should detect posts about food but not food trucks', () => {
    const post: ParsedPost = {
      id: '4',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/4',
      content: 'New restaurant opening! Come dine with us at our brick and mortar location.',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectFalsePositive(post);
    expect(result.isFalsePositive).toBe(true);
    expect(result.reasons).toContain('Brick and mortar restaurant, not food truck');
  });

  it('should detect personal posts unrelated to business', () => {
    const post: ParsedPost = {
      id: '5',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/5',
      content:
        'Had a great time at the beach with my family. Here are some photos from our vacation!',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectFalsePositive(post);
    expect(result.isFalsePositive).toBe(true);
    expect(result.reasons).toContain('Personal post, not business-related');
  });

  it('should detect promotional posts for other businesses', () => {
    const post: ParsedPost = {
      id: '6',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/6',
      content: 'Check out our new gym membership special! Get fit today!',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectFalsePositive(post);
    expect(result.isFalsePositive).toBe(true);
  });

  it('should identify food truck posts with proper keywords', () => {
    const post: ParsedPost = {
      id: '7',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/7',
      content: 'Food truck serving gourmet burgers and fries. Follow us for daily locations!',
      timestamp: '2024-01-01T00:00:00Z',
      extracted_data: {
        truck_name: 'Gourmet Burger Truck',
        food_items: ['burgers', 'fries'],
      },
    };

    const result = detectFalsePositive(post);
    expect(result.isFalsePositive).toBe(false);
  });

  it('should handle empty content', () => {
    const post: ParsedPost = {
      id: '8',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/8',
      content: '',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectFalsePositive(post);
    expect(result.isFalsePositive).toBe(true);
    expect(result.reasons).toContain('Empty or missing content');
  });

  it('should detect posts with only hashtags and no substance', () => {
    const post: ParsedPost = {
      id: '9',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/9',
      content: '#vibes #mood #weekend',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectFalsePositive(post);
    expect(result.isFalsePositive).toBe(true);
    expect(result.reasons).toContain('Only hashtags, no substantive content');
  });

  it('should use extracted data to validate relevance', () => {
    const post: ParsedPost = {
      id: '10',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/10',
      content: 'Serving today!',
      timestamp: '2024-01-01T00:00:00Z',
      extracted_data: {
        truck_name: 'Taco Truck',
        food_items: ['tacos', 'burritos'],
        cuisine_type: ['Mexican'],
      },
    };

    const result = detectFalsePositive(post);
    expect(result.isFalsePositive).toBe(false);
    expect(result.confidence).toBeLessThan(0.3);
  });

  it('should return confidence score between 0 and 1', () => {
    const post: ParsedPost = {
      id: '11',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/11',
      content: 'Food truck serving tacos.',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectFalsePositive(post);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
