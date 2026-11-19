import { test, expect } from '@playwright/test';

test.describe('parseFacebookPost', () => {
  test.describe('Successful Parsing', () => {
    test('should parse post with food, location, and time', async ({ request }) => {
      const response = await request.post('/api/test/parseFacebookPost', {
        data: {
          message: '🌮 Tacos all day! 11am-3pm at 123 Main St, Augusta GA',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.food_items).toContain('tacos');
      expect(data.location).toEqual({
        address: '123 Main St',
        city: 'Augusta',
        state: 'GA',
        fuzzy: false,
      });
      expect(data.times).toEqual({
        start: '11am',
        end: '3pm',
        days: [],
      });
      expect(data.confidence).toBeGreaterThanOrEqual(0.7);
    });

    test('should parse post with food items and hashtags', async ({ request }) => {
      const response = await request.post('/api/test/parseFacebookPost', {
        data: {
          message: '🍔🍕 Burgers and pizza today! #foodtruck #lunch',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.food_items).toContain('burgers');
      expect(data.food_items).toContain('pizza');
      expect(data.hashtags).toContain('#foodtruck');
      expect(data.hashtags).toContain('#lunch');
      expect(data.confidence).toBeGreaterThanOrEqual(0.7);
    });

    test('should parse post with menu items and prices', async ({ request }) => {
      const response = await request.post('/api/test/parseFacebookPost', {
        data: {
          message: 'Menu update: New burgers $8, tacos $5, fries $3',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.food_items).toContain('burgers');
      expect(data.food_items).toContain('tacos');
      expect(data.food_items).toContain('fries');
      expect(data.prices).toContainEqual({ item: 'burgers', price: 8 });
      expect(data.prices).toContainEqual({ item: 'tacos', price: 5 });
      expect(data.prices).toContainEqual({ item: 'fries', price: 3 });
    });

    test('should parse post with operating hours', async ({ request }) => {
      const response = await request.post('/api/test/parseFacebookPost', {
        data: {
          message: 'Open today: 11am-7pm',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.times).toEqual({
        start: '11am',
        end: '7pm',
        days: [],
      });
    });
  });

  test.describe('Confidence Scoring', () => {
    test('should return early with confidence < 0.7 for ambiguous posts', async ({ request }) => {
      const response = await request.post('/api/test/parseFacebookPost', {
        data: {
          message: 'Serving until sold out! Today only special.',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.confidence).toBeLessThan(0.7);
      expect(data.food_items).toHaveLength(0);
    });

    test('should handle fuzzy location detection', async ({ request }) => {
      const response = await request.post('/api/test/parseFacebookPost', {
        data: {
          message: 'Join us at the Augusta Mall food court near the fountain! 🎉',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.location?.fuzzy).toBe(true);
      expect(data.confidence).toBeLessThan(0.7);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle empty input gracefully', async ({ request }) => {
      const response = await request.post('/api/test/parseFacebookPost', {
        data: {
          message: '',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.confidence).toBe(0);
      expect(data.food_items).toHaveLength(0);
    });

    test('should handle emojis in post content', async ({ request }) => {
      const response = await request.post('/api/test/parseFacebookPost', {
        data: {
          message: '🌮🍔 Great tacos and burgers today!',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.food_items).toContain('tacos');
      expect(data.food_items).toContain('burgers');
    });

    test('should extract hashtags correctly', async ({ request }) => {
      const response = await request.post('/api/test/parseFacebookPost', {
        data: {
          message: '#foodtruck #lunch #special',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.hashtags).toEqual(['#foodtruck', '#lunch', '#special']);
    });
  });
});
