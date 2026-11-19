/**
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

interface RpcCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
}

const rpcCalls: RpcCall[] = [];
let rpcResult: { data: unknown[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
};

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabasePublicReader: () => ({
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return { abortSignal: () => Promise.resolve(rpcResult) };
    },
  }),
}));

type ImportedModule = typeof import('@/lib/services/publicTruckData.server');

let publicTruckData: ImportedModule;

beforeAll(async () => {
  publicTruckData = await import('@/lib/services/publicTruckData.server');
});

beforeEach(() => {
  rpcCalls.length = 0;
  rpcResult = { data: [], error: null };
});

describe('getPublicTruckByIdentifier', () => {
  it('returns the full profile row, including fields the slim catalog omits', async () => {
    const profile = {
      id: 'truck-a',
      name: 'Truck A',
      slug: 'truck-a',
      menu: [{ name: 'Tacos' }],
      contact_info: { phone: '555-0100' },
      social_media: { instagram: 'trucka' },
      street_address: '1 Main St',
      specialties: ['Al pastor'],
    };
    rpcResult = { data: [profile], error: null };

    const row = await publicTruckData.getPublicTruckByIdentifier('truck-a');

    expect(rpcCalls).toEqual([
      { name: 'get_public_truck_by_identifier', args: { p_identifier: 'truck-a' } },
    ]);
    expect(row?.menu).toEqual([{ name: 'Tacos' }]);
    expect(row?.contact_info).toEqual({ phone: '555-0100' });
    expect(row?.street_address).toBe('1 Main St');
  });

  it('returns null when no truck matches', async () => {
    await expect(publicTruckData.getPublicTruckByIdentifier('missing')).resolves.toBeNull();
  });

  it('throws the rpc error', async () => {
    rpcResult = { data: null, error: { message: 'boom' } };

    await expect(publicTruckData.getPublicTruckByIdentifier('truck-a')).rejects.toEqual({
      message: 'boom',
    });
  });
});
