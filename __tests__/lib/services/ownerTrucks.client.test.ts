/**
 * @jest-environment node
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fetchOwnerTrucks } from '@/lib/services/ownerTrucks.client';

describe('fetchOwnerTrucks', () => {
  const realFetch = globalThis.fetch;
  let requestedUrls: string[] = [];

  afterEach(() => {
    globalThis.fetch = realFetch;
    requestedUrls = [];
  });

  function respondWith(response: Response): void {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      return response;
    }) as typeof fetch;
  }

  it('returns the trucks from the owner trucks API', async () => {
    respondWith(Response.json({ trucks: [{ id: 'truck-1' }, { id: 'truck-2' }] }));

    const trucks = await fetchOwnerTrucks();

    expect(requestedUrls).toEqual(['/api/owner/trucks']);
    expect(trucks.map((truck) => truck.id)).toEqual(['truck-1', 'truck-2']);
  });

  it('throws when the API rejects the request', async () => {
    respondWith(Response.json({ error: 'Not authenticated' }, { status: 401 }));

    await expect(fetchOwnerTrucks()).rejects.toThrow('Owner trucks API returned 401');
  });
});
