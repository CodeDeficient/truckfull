import { test, expect } from '@playwright/test';

test.describe('Event Applications API - Null Organizer Handling', () => {
  test('should handle applications with inaccessible organizers gracefully', async ({
    request,
  }) => {
    const response = await request.get('/api/events/applications');

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('applications');

    const applications = data.applications as Array<{
      id: string;
      event?: { organizer?: unknown };
    }>;

    for (const application of applications) {
      expect(application).toHaveProperty('id');
      expect(application).toHaveProperty('event');

      if (application.event?.organizer) {
        expect(application.event.organizer).toHaveProperty('business_name');
        expect(application.event.organizer).toHaveProperty('rating_avg');
        expect(application.event.organizer).toHaveProperty('rating_count');
        expect(application.event.organizer).toHaveProperty('verification_status');
        expect(application.event.organizer).toHaveProperty('user_id');
      }
    }
  });

  test('should handle owned events with inaccessible organizers gracefully', async ({
    request,
  }) => {
    const response = await request.get('/api/events/applications?include_owned=true');

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('owned_events');

    const ownedEvents = data.owned_events as Array<{ id: string; organizer?: unknown }>;

    for (const event of ownedEvents) {
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
