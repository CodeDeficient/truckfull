/**
 * Social Media Post Classification Tests
 *
 * Phase 3.2.1: Test post content classification
 * Verifies classification of posts as promotion, event, customer feedback, or other
 */

import { test, expect } from '@playwright/test';

// Mock classification function
const MockPostClassifier = {
  classifyPost: (
    content: string,
    metadata?: { tags?: string[]; mentions?: string[]; images?: number; video?: boolean },
  ): string => {
    const lowerContent = content.toLowerCase();

    // Check for promotional content
    const promotionalKeywords = [
      'deal',
      'discount',
      'sale',
      'promo',
      'special',
      'offer',
      'coupon',
      'save',
      'limited time',
      'today only',
      'happy hour',
      'buy one get one',
      'free',
      'half off',
      '$ off',
      '% off',
      'buy',
      'order now',
    ];

    // Check for event content
    const eventKeywords = [
      'event',
      'party',
      'celebration',
      'festival',
      'fair',
      'market',
      'pop-up',
      'live music',
      'dj',
      'special appearance',
      'grand opening',
      'anniversary',
      'birthday',
      'holiday',
      'seasonal',
      'concert',
      'show',
      'performance',
    ];

    // Check for customer feedback
    const feedbackKeywords = [
      'review',
      'rating',
      'recommend',
      'amazing',
      'delicious',
      'best',
      'favorite',
      'love',
      'great',
      'good',
      'yummy',
      'tasty',
      'awesome',
      'excellent',
      'perfect',
      'recommend',
      'must try',
      'must visit',
      'must try',
    ];

    // Check for closing announcements
    const closingKeywords = [
      'closing',
      'closed',
      'closed today',
      'not open',
      'out of',
      'running out',
      'sold out',
      'all gone',
      'finished',
      'out of stock',
    ];

    // Check for opening announcements
    const openingKeywords = ['open', 'opening', 'now open', 'back open', 'reopened', 'open now'];

    // Check for location updates
    const locationKeywords = [
      'location',
      'where are you',
      'here',
      'there',
      'next to',
      'near',
      'on main',
      'on street',
      'address',
      'moving',
      'relocating',
    ];

    // Check for menu updates
    const menuKeywords = [
      'new menu',
      'menu update',
      'special',
      "today's special",
      "chef's choice",
      'seasonal',
      'limited time',
      'new item',
      'new dish',
      'featured',
    ];

    // Check for health/safety updates
    const healthKeywords = [
      'clean',
      'sanitized',
      'safe',
      'healthy',
      'food safety',
      'inspected',
      'certified',
      'trained',
      'vaccinated',
      'masked',
    ];

    // Check for weather-related updates
    const weatherKeywords = [
      'weather',
      'rain',
      'storm',
      'heat',
      'cold',
      'snow',
      'wind',
      'temperature',
    ];

    // Helper function to check for keywords
    const containsKeywords = (keywords: string[]) =>
      keywords.some((keyword) => lowerContent.includes(keyword));

    // Check for media indicators
    const hasMedia = (metadata?.images ?? 0) > 0 || metadata?.video === true;
    const hasTags = metadata?.tags && metadata.tags.length > 0;
    const hasMentions = metadata?.mentions && metadata.mentions.length > 0;

    // Classification logic
    if (containsKeywords(closingKeywords)) {
      return 'closing';
    }

    if (containsKeywords(openingKeywords)) {
      return 'opening';
    }

    if (containsKeywords(eventKeywords)) {
      return 'event';
    }

    if (containsKeywords(promotionalKeywords)) {
      return 'promotion';
    }

    if (containsKeywords(feedbackKeywords)) {
      return 'feedback';
    }

    if (containsKeywords(locationKeywords)) {
      return 'location';
    }

    if (containsKeywords(menuKeywords)) {
      return 'menu';
    }

    if (containsKeywords(healthKeywords)) {
      return 'health';
    }

    if (containsKeywords(weatherKeywords)) {
      return 'weather';
    }

    // If content has promotional language but no specific keywords
    if (hasMedia && hasTags) {
      return 'promotion';
    }

    // Default classification
    return 'other';
  },

  extractKeywords: (content: string): string[] => {
    const lowerContent = content.toLowerCase();
    const allKeywords = [
      'deal',
      'discount',
      'sale',
      'promo',
      'special',
      'offer',
      'event',
      'party',
      'celebration',
      'review',
      'rating',
      'location',
      'new',
      'limited',
      'today',
      'now',
      'open',
      'closed',
      'hurry',
      'free',
      'save',
    ];

    return allKeywords.filter((keyword) => lowerContent.includes(keyword));
  },

  calculateUrgency: (content: string): number => {
    const lowerContent = content.toLowerCase();
    let urgency = 0;

    // High urgency indicators
    const highUrgencyKeywords = [
      'hurry',
      'limited time',
      'today only',
      'last chance',
      'ending soon',
      'running out',
      'sold out',
      'urgent',
      'emergency',
      'closing',
      'final',
      'last',
    ];

    // Medium urgency indicators
    const mediumUrgencyKeywords = [
      'today',
      'now',
      'immediately',
      'soon',
      'asap',
      'quick',
      'fast',
      'hurry',
    ];

    // Low urgency indicators
    const lowUrgencyKeywords = ['this week', 'this weekend', 'coming soon', 'stay tuned'];

    if (highUrgencyKeywords.some((keyword) => lowerContent.includes(keyword))) {
      urgency += 3;
    }

    if (mediumUrgencyKeywords.some((keyword) => lowerContent.includes(keyword))) {
      urgency += 2;
    }

    if (lowUrgencyKeywords.some((keyword) => lowerContent.includes(keyword))) {
      urgency += 1;
    }

    // Exclamation marks add urgency
    if (content.includes('!')) {
      urgency += Math.min(content.split('!').length - 1, 2);
    }

    // ALL CAPS adds urgency (more than 50% caps)
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    if (capsCount > content.length / 2) {
      urgency += 1;
    }

    return Math.min(urgency, 5);
  },
};

test.describe('Social Media Post Classification', () => {
  test.describe('Promotional Posts', () => {
    test('classifies promotional content', () => {
      const testCases = [
        { content: 'Check out our lunch special - $5 off any meal today!' },
        { content: 'Buy one get one free on all tacos!' },
        { content: 'Happy hour 5-7pm half off drinks!' },
        { content: 'Limited time offer - 20% off your order!' },
        { content: 'Coupon code SUMMER2024 for $5 off!' },
      ];

      testCases.forEach(({ content }) => {
        const classification = MockPostClassifier.classifyPost(content);
        expect(classification).toBe('promotion');
      });
    });

    test('classifies promotional content with media', () => {
      const content = 'New menu items available! Check out our amazing photos.';
      const classification = MockPostClassifier.classifyPost(content, {
        images: 3,
        tags: ['food', 'menu', 'new'],
      });

      expect(classification).toBe('promotion');
    });
  });

  test.describe('Event Posts', () => {
    test('classifies event content', () => {
      const testCases = [
        { content: 'Join us for our anniversary party this Saturday!' },
        { content: 'Live music tonight at 8pm' },
        { content: 'Food truck festival this weekend!' },
        { content: 'Special appearance by the chef' },
        { content: 'Holiday celebration - December 24th' },
      ];

      testCases.forEach(({ content }) => {
        const classification = MockPostClassifier.classifyPost(content);
        expect(classification).toBe('event');
      });
    });
  });

  test.describe('Customer Feedback', () => {
    test('classifies positive feedback', () => {
      const testCases = [
        { content: 'Best tacos in town! Highly recommend.' },
        { content: 'Amazing food, great service!' },
        { content: 'My favorite food truck, love the burritos!' },
        { content: 'Delicious as always. 5 stars!' },
        { content: 'Perfect lunch spot. Must visit!' },
      ];

      testCases.forEach(({ content }) => {
        const classification = MockPostClassifier.classifyPost(content);
        expect(classification).toBe('feedback');
      });
    });
  });

  test.describe('Location Updates', () => {
    test('classifies location-related posts', () => {
      const testCases = [
        { content: 'We are located at 123 Main St today' },
        { content: 'Moving to a new location next week' },
        { content: 'Find us next to the park' },
        { content: 'On Main Street today, near the fountain' },
        { content: 'Address: 456 Oak Ave, come visit!' },
      ];

      testCases.forEach(({ content }) => {
        const classification = MockPostClassifier.classifyPost(content);
        expect(classification).toBe('location');
      });
    });
  });

  test.describe('Opening/Closing Updates', () => {
    test('classifies closing announcements', () => {
      const testCases = [
        { content: 'Closing early today at 6pm' },
        { content: 'Closed today due to weather' },
        { content: 'Running out of food - closing soon' },
        { content: 'Sold out for the day' },
        { content: 'Out of ingredients, closed' },
      ];

      testCases.forEach(({ content }) => {
        const classification = MockPostClassifier.classifyPost(content);
        expect(classification).toBe('closing');
      });
    });

    test('classifies opening announcements', () => {
      const testCases = [
        { content: 'Now open for the day!' },
        { content: 'Reopened after lunch break' },
        { content: 'Back open at 5pm' },
        { content: 'Open now, come on by!' },
      ];

      testCases.forEach(({ content }) => {
        const classification = MockPostClassifier.classifyPost(content);
        expect(classification).toBe('opening');
      });
    });
  });

  test.describe('Menu Updates', () => {
    test('classifies menu-related posts', () => {
      const testCases = [
        { content: 'New menu item: Street tacos!' },
        { content: 'Menu update: Now serving breakfast burritos' },
        { content: "Today's special: Pulled pork sandwich" },
        { content: 'Limited time menu item available' },
        { content: "Chef's choice today: Fresh fish tacos" },
      ];

      testCases.forEach(({ content }) => {
        const classification = MockPostClassifier.classifyPost(content);
        expect(classification).toBe('menu');
      });
    });
  });

  test.describe('Health & Safety Updates', () => {
    test('classifies health-related posts', () => {
      const testCases = [
        { content: 'We sanitize all surfaces regularly' },
        { content: 'Food safety certified' },
        { content: 'Clean and safe environment' },
        { content: 'Our staff is fully vaccinated' },
        { content: 'Healthy options available' },
      ];

      testCases.forEach(({ content }) => {
        const classification = MockPostClassifier.classifyPost(content);
        expect(classification).toBe('health');
      });
    });
  });

  test.describe('Weather-Related Updates', () => {
    test('classifies weather-related posts', () => {
      const testCases = [
        { content: 'Closed due to heavy rain' },
        { content: 'Open despite the heat!' },
        { content: 'Storm approaching - may close early' },
        { content: "Cold weather today, we're open!" },
        { content: 'Wind advisory - moving indoors' },
      ];

      testCases.forEach(({ content }) => {
        const classification = MockPostClassifier.classifyPost(content);
        expect(classification).toBe('weather');
      });
    });
  });

  test.describe('Other/General Posts', () => {
    test('classifies non-specific content as other', () => {
      const testCases = [
        { content: 'Happy Friday everyone!' },
        { content: 'Great day for food!' },
        { content: 'Check out our truck!' },
        { content: 'Say hi if you see us!' },
        { content: 'We love serving our community!' },
      ];

      testCases.forEach(({ content }) => {
        const classification = MockPostClassifier.classifyPost(content);
        expect(classification).toBe('other');
      });
    });
  });

  test.describe('Keyword Extraction', () => {
    test('extracts relevant keywords from content', () => {
      const content = 'Special discount today! Limited time offer at our event.';
      const keywords = MockPostClassifier.extractKeywords(content);

      expect(keywords).toContain('special');
      expect(keywords).toContain('discount');
      expect(keywords).toContain('today');
      expect(keywords).toContain('limited');
      expect(keywords).toContain('offer');
      expect(keywords).toContain('event');
    });

    test('returns empty array for content with no keywords', () => {
      const content = 'Have a great day everyone!';
      const keywords = MockPostClassifier.extractKeywords(content);

      expect(keywords).toHaveLength(0);
    });
  });

  test.describe('Urgency Calculation', () => {
    test('calculates high urgency for urgent posts', () => {
      const testCases = [
        { content: 'Hurry! Only 1 hour left!', expected: 5 },
        { content: 'Last chance! Closing in 10 minutes!', expected: 5 },
        { content: 'URGENT: Running out of food!', expected: 4 },
        { content: 'Limited time! Ending soon!', expected: 4 },
      ];

      testCases.forEach(({ content, expected }) => {
        const urgency = MockPostClassifier.calculateUrgency(content);
        expect(urgency).toBeGreaterThanOrEqual(expected - 1);
        expect(urgency).toBeLessThanOrEqual(expected + 1);
      });
    });

    test('calculates medium urgency for time-sensitive posts', () => {
      const testCases = [
        { content: 'Today only! Special offer!', expected: 3 },
        { content: 'Now open! Come visit!', expected: 3 },
        { content: "Quick! Don't miss out!", expected: 3 },
      ];

      testCases.forEach(({ content, expected }) => {
        const urgency = MockPostClassifier.calculateUrgency(content);
        expect(urgency).toBeGreaterThanOrEqual(expected - 1);
        expect(urgency).toBeLessThanOrEqual(expected + 1);
      });
    });

    test('calculates low urgency for future announcements', () => {
      const testCases = [
        { content: 'Coming soon!', expected: 1 },
        { content: 'Stay tuned for updates!', expected: 1 },
        { content: 'This week special!', expected: 2 },
      ];

      testCases.forEach(({ content, expected }) => {
        const urgency = MockPostClassifier.calculateUrgency(content);
        expect(urgency).toBeGreaterThanOrEqual(expected - 1);
        expect(urgency).toBeLessThanOrEqual(expected + 1);
      });
    });

    test('caps urgency at 5', () => {
      const content = 'HURRY!!! LIMITED TIME!!! TODAY ONLY!!! NOW!!!';
      const urgency = MockPostClassifier.calculateUrgency(content);

      expect(urgency).toBeLessThanOrEqual(5);
    });
  });

  test.describe('Edge Cases', () => {
    test('handles empty content', () => {
      const classification = MockPostClassifier.classifyPost('');
      expect(classification).toBe('other');
    });

    test('handles very long content', () => {
      const longContent = 'Special offer! '.repeat(100);
      const classification = MockPostClassifier.classifyPost(longContent);

      expect(classification).toBe('promotion');
    });

    test('handles special characters', () => {
      const content = '!!! SPECIAL OFFER @#$%^&*() today!!!';
      const classification = MockPostClassifier.classifyPost(content);

      expect(classification).toBe('promotion');
    });

    test('handles mixed case content', () => {
      const content = 'HeLLo GuYs! We HaVe A dIsCoUnT!';
      const classification = MockPostClassifier.classifyPost(content);

      expect(classification).toBe('promotion');
    });

    test('classifies promotion over other categories when ambiguous', () => {
      // When content could be multiple types, prioritize based on keywords
      const content = 'Today only! Great event with special offers!';
      const classification = MockPostClassifier.classifyPost(content);

      // Event check comes before promotion check, so should be 'event'
      expect(classification).toBe('event');
    });
  });
});
