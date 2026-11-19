import { test, expect } from '@playwright/test';

test.describe('Events API - Null Organizer Handling', () => {
  test('should handle events with inaccessible organizers gracefully', async ({ request }) => {
    const response = await request.get('/api/events?status=published');

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('events');

    const events = data.events as Array<{ id: string; organizer?: unknown }>;

    for (const event of events) {
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('organizer');

      if (event.organizer) {
        expect(event.organizer).toHaveProperty('business_name');
        expect(event.organizer).toHaveProperty('rating_avg');
        expect(event.organizer).toHaveProperty('rating_count');
        expect(event.organizer).toHaveProperty('verification_status');
        expect(event.organizer).toHaveProperty('user_id');
      }
    }
  });
});
