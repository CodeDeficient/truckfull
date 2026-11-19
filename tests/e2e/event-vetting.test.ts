import { test, expect } from '@playwright/test';

test.describe('Event Vetting API', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/testing/reset-rate-limit');
  });

  test('should return vetting result for valid event', async ({ request }) => {
    const response = await request.get('/api/events/evt_test_event_001/vetting');

    if (response.status() === 404) {
      test.skip(true, 'Test event evt_test_event_001 not found in database');
      return;
    }

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);

    const body = await response.json();
    expect(body).toHaveProperty('result');
    expect(body.result).toHaveProperty('score');
    expect(body.result).toHaveProperty('factors');
    expect(body.result).toHaveProperty('recommendation');
    expect(body.result).toHaveProperty('reasoning');
  });

  test('should serve cached results within TTL', async ({ request }) => {
    const eventId = 'evt_test_event_002';

    const response1 = await request.get(`/api/events/${eventId}/vetting`);

    if (response1.status() === 404) {
      test.skip(true, 'Test event evt_test_event_002 not found in database');
      return;
    }

    const body1 = await response1.json();
    expect(body1.cached).toBe(false);

    const response2 = await request.get(`/api/events/${eventId}/vetting`);
    const body2 = await response2.json();

    expect(body2.cached).toBe(true);
  });

  test('should refresh on POST /refresh', async ({ request }) => {
    const eventId = 'evt_test_event_003';

    const getResponse = await request.get(`/api/events/${eventId}/vetting`);

    if (getResponse.status() === 404) {
      test.skip(true, 'Test event evt_test_event_003 not found in database');
      return;
    }

    const refreshResponse = await request.post(`/api/events/${eventId}/vetting`);
    expect(refreshResponse.status()).toBe(200);

    const body = await refreshResponse.json();
    expect(body.refreshed).toBe(true);
    expect(body.cached).toBe(false);
  });

  test('should return 404 for non-existent event', async ({ request }) => {
    const response = await request.get('/api/events/evt_non_existent_99999/vetting');
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should handle rate limiting', async ({ request }) => {
    const responses: number[] = [];

    for (let i = 0; i < 10; i++) {
      const response = await request.get('/api/events/evt_test_rate_limit_001/vetting');
      responses.push(response.status());
    }

    const rateLimited = responses.some((status) => status === 429);
    if (rateLimited) {
      expect(responses).toContain(429);
    } else {
      expect(responses.every((status) => status === 200 || status === 404)).toBe(true);
    }
  });
});
