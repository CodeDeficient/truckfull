import { test, expect } from '@playwright/test';

const INTERNAL_FIELDS = [
  'owner_id',
  'user_id',
  'claimed_by',
  'verification_notes',
  'verification_documents',
  'facebook_page_id',
];

test.describe('GET /api/trucks/public', () => {
  test('returns a page of listable trucks without internal fields', async ({ request }) => {
    const response = await request.get('/api/trucks/public?limit=20');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.trucks)).toBe(true);
    expect(body.trucks.length).toBeGreaterThan(0);
    expect(body.trucks.length).toBeLessThanOrEqual(20);

    for (const truck of body.trucks) {
      expect(typeof truck.id).toBe('string');
      expect(truck.data_quality_score).toBeGreaterThanOrEqual(0);
      expect(['shadowbanned', 'rejected']).not.toContain(truck.verification_status);
      for (const field of INTERNAL_FIELDS) {
        expect(truck).not.toHaveProperty(field);
      }
    }
  });

  test('orders trucks by quality score, highest first', async ({ request }) => {
    const response = await request.get('/api/trucks/public?limit=50');
    const { trucks } = await response.json();
    const scores = trucks.map((truck: { data_quality_score: number }) => truck.data_quality_score);

    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
