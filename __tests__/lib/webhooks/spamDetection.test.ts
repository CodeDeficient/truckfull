import { describe, it, expect } from '@jest/globals';
import { detectSpam } from '@/lib/webhooks/spamDetection';
import type { ParsedPost } from '@/lib/webhooks/types';

describe('detectSpam', () => {
  it('should detect excessive emojis', () => {
    const post: ParsedPost = {
      id: '1',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/1',
      content: '🔥🔥🔥 AMAZING FOOD TRUCK 🔥🔥🔥 COME EAT HERE 🔥🔥🔥',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectSpam(post);
    expect(result.isSpam).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.reasons).toContain('Excessive emojis');
  });

  it('should detect all caps text', () => {
    const post: ParsedPost = {
      id: '2',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/2',
      content: 'AMAZING FOOD TRUCK HERE NOW COME EAT BEST FOOD EVER',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectSpam(post);
    expect(result.isSpam).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.reasons).toContain('All caps text');
  });

  it('should detect bot-like posting patterns', () => {
    const post: ParsedPost = {
      id: '3',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/3',
      content: '🚀🚀🚀 SPECIAL OFFER TODAY ONLY CLICK HERE NOW 🚀🚀🚀',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectSpam(post);
    expect(result.isSpam).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should detect repeated phrases', () => {
    const post: ParsedPost = {
      id: '4',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/4',
      content:
        'Come eat at our food truck. Come eat at our food truck. Come eat at our food truck.',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectSpam(post);
    expect(result.isSpam).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.reasons).toContain('Repeated phrases');
  });

  it('should identify legitimate posts', () => {
    const post: ParsedPost = {
      id: '5',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/5',
      content:
        'We will be at the downtown park today from 11am to 3pm serving tacos and burritos. Come say hi!',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectSpam(post);
    expect(result.isSpam).toBe(false);
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.reasons).toHaveLength(0);
  });

  it('should handle empty content', () => {
    const post: ParsedPost = {
      id: '6',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/6',
      content: '',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectSpam(post);
    expect(result.isSpam).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('should handle null content', () => {
    const post: ParsedPost = {
      id: '7',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/7',
      content: '',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectSpam(post);
    expect(result.isSpam).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('should return confidence score between 0 and 1', () => {
    const post: ParsedPost = {
      id: '8',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/8',
      content: 'We will be serving food today.',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectSpam(post);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should detect suspicious URLs', () => {
    const post: ParsedPost = {
      id: '9',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/9',
      content: 'Click here for FREE food truck specials: https://bit.ly/suspicious-link',
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectSpam(post);
    expect(result.isSpam).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('should detect excessive punctuation', () => {
    const post: ParsedPost = {
      id: '10',
      platform: 'facebook',
      post_url: 'https://facebook.com/post/10',
      content: "Come to our food truck!!! The best food ever!!! Don't miss out!!!",
      timestamp: '2024-01-01T00:00:00Z',
    };

    const result = detectSpam(post);
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toContain('Excessive punctuation');
  });
});
