import { describe, it, expect, jest } from '@jest/globals';

import { checkSavedStatus } from '@/hooks/useSaveLead';

describe('checkSavedStatus', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns true when saved-leads API returns an existing lead', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        leads: [{ id: 'lead-1', event_id: 'event-1', truck_id: 'truck-1' }],
      }),
    });

    const result = await checkSavedStatus('event-1', 'truck-1');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/events/saved-leads?event_id=event-1&truck_id=truck-1'),
    );
  });

  it('returns false when saved-leads API returns empty array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ leads: [] }),
    });

    const result = await checkSavedStatus('event-1', 'truck-1');
    expect(result).toBe(false);
  });

  it('returns false when API returns 401 (unauthenticated)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const result = await checkSavedStatus('event-1', 'truck-1');
    expect(result).toBe(false);
  });

  it('returns false when fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await checkSavedStatus('event-1', 'truck-1');
    expect(result).toBe(false);
  });

  it('returns false when truckId is empty', async () => {
    const result = await checkSavedStatus('event-1', '');
    expect(result).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
