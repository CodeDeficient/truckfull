import { test, expect } from '@playwright/test';

const TRUCK_ID = '00000000-0000-4000-8000-000000000001';

test.describe('POST /api/trucks/current-schedules overrides', () => {
  test('returns dated overrides when an override end date is requested', async ({ request }) => {
    const response = await request.post('/api/trucks/current-schedules', {
      data: {
        truckIds: [TRUCK_ID],
        fromDate: '2026-10-14',
        toDate: '2026-10-15',
        overridesToDate: '2026-10-21',
      },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ recurrences: {}, overrides: [] });
  });

  test('omits overrides when no override end date is requested', async ({ request }) => {
    const response = await request.post('/api/trucks/current-schedules', {
      data: { truckIds: [TRUCK_ID], fromDate: '2026-10-14', toDate: '2026-10-15' },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ recurrences: {} });
  });

  test('rejects an override range wider than ten days', async ({ request }) => {
    const response = await request.post('/api/trucks/current-schedules', {
      data: {
        truckIds: [TRUCK_ID],
        fromDate: '2026-10-14',
        toDate: '2026-10-15',
        overridesToDate: '2026-12-21',
      },
    });

    expect(response.status()).toBe(400);
  });
});
