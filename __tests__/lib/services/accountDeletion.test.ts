/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { FakeSupabaseFactory, Row } from '@/__tests__/fakes/fakeSupabase';

const fake: FakeSupabaseFactory = createFakeSupabaseClient();

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: jest.fn(() => fake.client),
}));

const { releaseOwnedTrucks } = await import('@/lib/services/accountDeletion.server');

const OWNER = 'owner-1';
const OTHER = 'owner-2';

function claimedTruck(id: string, userId: string): Row {
  return {
    id,
    owner_id: userId,
    is_claimed: true,
    claimed_at: '2026-09-01T00:00:00Z',
    claimed_by: userId,
    claim_verification_method: 'auto',
    user_id: userId,
  };
}

async function rows(table: string): Promise<Row[]> {
  const { data } = await fake.client.from(table).select('*');
  return (data ?? []) as Row[];
}

describe('releaseOwnedTrucks', () => {
  beforeEach(() => {
    fake.clearAll();
  });

  it('returns the owner listings to unclaimed and leaves other owners alone', async () => {
    fake.seedTable('food_trucks', [claimedTruck('t1', OWNER), claimedTruck('t2', OTHER)]);
    fake.seedTable('claim_verification_codes', [
      { id: 'c1', used_by: OWNER },
      { id: 'c2', used_by: OTHER },
    ]);

    await releaseOwnedTrucks(OWNER);

    const trucks = await rows('food_trucks');
    expect(trucks.find((t) => t.id === 't1')).toEqual({
      id: 't1',
      owner_id: null,
      is_claimed: false,
      claimed_at: null,
      claimed_by: null,
      claim_verification_method: null,
      user_id: null,
    });
    expect(trucks.find((t) => t.id === 't2')).toEqual(claimedTruck('t2', OTHER));
    const codes = await rows('claim_verification_codes');
    expect(codes).toEqual([
      { id: 'c1', used_by: null },
      { id: 'c2', used_by: OTHER },
    ]);
  });

  it('releases a listing that only records the owner as claimer', async () => {
    fake.seedTable('food_trucks', [
      { ...claimedTruck('t3', OWNER), owner_id: null, user_id: null },
    ]);

    await releaseOwnedTrucks(OWNER);

    const [truck] = await rows('food_trucks');
    expect(truck).toMatchObject({ is_claimed: false, claimed_by: null });
  });
});
