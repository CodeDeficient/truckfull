import { test, expect } from '@playwright/test';

test.describe('ocrImage', () => {
  test.describe('Successful OCR Processing', () => {
    test('should extract text from story images', async ({ request }) => {
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'https://example.com/story.jpg',
          imageType: 'story',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('food_items');
      expect(data).toHaveProperty('location');
      expect(data).toHaveProperty('times');
      expect(data).toHaveProperty('confidence');
    });

    test('should extract text from photo-only posts', async ({ request }) => {
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'https://example.com/photo.jpg',
          imageType: 'photo',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('food_items');
      expect(data).toHaveProperty('confidence');
    });

    test('should handle images with no text', async ({ request }) => {
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'https://example.com/empty.jpg',
          imageType: 'story',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.confidence).toBeLessThan(0.7);
      expect(data.food_items).toHaveLength(0);
    });
  });

  test.describe('Image Type Handling', () => {
    test('should handle story images', async ({ request }) => {
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'https://example.com/story.jpg',
          imageType: 'story',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('confidence');
    });

    test('should handle photo posts', async ({ request }) => {
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'https://example.com/photo.jpg',
          imageType: 'photo',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('confidence');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid URL', async ({ request }) => {
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'invalid-url',
          imageType: 'story',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.confidence).toBe(0);
      expect(data.food_items).toHaveLength(0);
    });

    test('should handle invalid image type', async ({ request }) => {
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'https://example.com/test.jpg',
          imageType: 'invalid-type',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.confidence).toBe(0);
    });
  });

  test.describe('Data Extraction', () => {
    test('should extract location from image text', async ({ request }) => {
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'https://example.com/location.jpg',
          imageType: 'photo',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      if (data.location) {
        expect(data.location).toHaveProperty('address');
        expect(data.location).toHaveProperty('city');
        expect(data.location).toHaveProperty('state');
        expect(data.location).toHaveProperty('fuzzy');
      }
    });

    test('should extract time from image text', async ({ request }) => {
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'https://example.com/time.jpg',
          imageType: 'story',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      if (data.times) {
        expect(data.times).toHaveProperty('start');
        expect(data.times).toHaveProperty('end');
      }
    });

    test('should extract food items from image text', async ({ request }) => {
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'https://example.com/menu.jpg',
          imageType: 'photo',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.food_items).toBeInstanceOf(Array);
    });
  });

  test.describe('Performance', () => {
    test('should complete OCR processing within reasonable time', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.post('/api/test/ocrImage', {
        data: {
          imageUrl: 'https://example.com/test.jpg',
          imageType: 'story',
        },
      });
      const duration = Date.now() - startTime;

      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(5000);
    });
  });
});
