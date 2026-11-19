import { describe, expect, it } from '@jest/globals';
import {
  claimConfirmationForApply,
  confirmUpdate,
  getPendingConfirmations,
  rejectUpdate,
} from '@/lib/services/confirmationQueue';
import { createFakeSupabaseClient, type FakeSupabaseFactory } from '@/__tests__/fakes/fakeSupabase';
import type { getSupabaseAdmin } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

function adminClient(fake: FakeSupabaseFactory): AdminClient {
  return fake.client as unknown as AdminClient;
}

async function readConfirmation(
  fake: FakeSupabaseFactory,
  confirmationId: string,
): Promise<Record<string, unknown>> {
  const { data } = await fake.client
    .from('facebook_post_confirmations')
    .select('id, status, updated_at')
    .eq('id', confirmationId)
    .single();
  return data as Record<string, unknown>;
}

function seedConfirmation(fake: FakeSupabaseFactory, status: string, updatedAt: string): void {
  fake.seedTable('facebook_post_confirmations', [
    {
      id: 'confirmation-1',
      truck_id: 'truck-1',
      facebook_post_id: 'post-1',
      update_type: 'schedule',
      proposed_data: {},
      low_confidence_reason: null,
      status,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updated_at: updatedAt,
    },
  ]);
}

describe('confirmation state transitions', () => {
  it('claims a pending confirmation atomically', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, 'pending', new Date().toISOString());

    const result = await claimConfirmationForApply('confirmation-1', adminClient(fake));

    expect(result).toEqual({ success: true });
    expect(await readConfirmation(fake, 'confirmation-1')).toMatchObject({ status: 'applying' });
  });

  it('does not reclaim a fresh applying confirmation', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, 'applying', new Date().toISOString());

    const result = await claimConfirmationForApply('confirmation-1', adminClient(fake));

    expect(result).toEqual({ success: false, error: 'Confirmation already applying' });
  });

  it('reclaims an applying confirmation after the stale claim window', async () => {
    const fake = createFakeSupabaseClient();
    const staleUpdatedAt = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    seedConfirmation(fake, 'applying', staleUpdatedAt);

    const result = await claimConfirmationForApply('confirmation-1', adminClient(fake));

    expect(result).toEqual({ success: true });
    const confirmation = await readConfirmation(fake, 'confirmation-1');
    expect(confirmation.status).toBe('applying');
    expect(confirmation.updated_at).not.toBe(staleUpdatedAt);
  });

  it('lists stale applying confirmations so an abandoned claim can be recovered', async () => {
    const fake = createFakeSupabaseClient();
    const now = Date.now();
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'stale-confirmation',
        truck_id: 'truck-1',
        status: 'applying',
        updated_at: new Date(now - 11 * 60 * 1000).toISOString(),
        expires_at: new Date(now + 60 * 60 * 1000).toISOString(),
        created_at: new Date(now - 12 * 60 * 1000).toISOString(),
      },
      {
        id: 'fresh-confirmation',
        truck_id: 'truck-1',
        status: 'applying',
        updated_at: new Date(now - 2 * 60 * 1000).toISOString(),
        expires_at: new Date(now + 60 * 60 * 1000).toISOString(),
        created_at: new Date(now - 2 * 60 * 1000).toISOString(),
      },
      {
        id: 'pending-confirmation',
        truck_id: 'truck-1',
        status: 'pending',
        updated_at: new Date(now - 2 * 60 * 1000).toISOString(),
        expires_at: new Date(now + 60 * 60 * 1000).toISOString(),
        created_at: new Date(now - 1 * 60 * 1000).toISOString(),
      },
    ]);

    const result = await getPendingConfirmations('truck-1', adminClient(fake));

    expect(result.map((confirmation) => confirmation.id)).toEqual([
      'pending-confirmation',
      'stale-confirmation',
    ]);
  });

  it('reclaims an expired stale applying confirmation past its expiry deadline', async () => {
    const fake = createFakeSupabaseClient();
    const staleUpdatedAt = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const expiredAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'confirmation-1',
        truck_id: 'truck-1',
        facebook_post_id: 'post-1',
        update_type: 'schedule',
        proposed_data: {},
        low_confidence_reason: null,
        status: 'applying',
        expires_at: expiredAt,
        updated_at: staleUpdatedAt,
      },
    ]);

    const result = await claimConfirmationForApply('confirmation-1', adminClient(fake));

    expect(result).toEqual({ success: true });
    expect(await readConfirmation(fake, 'confirmation-1')).toMatchObject({ status: 'applying' });
  });

  it('does not claim an unexpired applying confirmation whose claim is not stale', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, 'applying', new Date().toISOString());

    const result = await claimConfirmationForApply('confirmation-1', adminClient(fake));

    expect(result).toEqual({ success: false, error: 'Confirmation already applying' });
  });

  it('does not reject a confirmation that is actively being applied', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, 'applying', new Date().toISOString());

    const result = await rejectUpdate('confirmation-1', adminClient(fake));

    expect(result).toEqual({ success: false, error: 'Confirmation already applying' });
    expect(await readConfirmation(fake, 'confirmation-1')).toMatchObject({ status: 'applying' });
  });

  it('rejects an abandoned applying confirmation after the stale claim window', async () => {
    const fake = createFakeSupabaseClient();
    const staleUpdatedAt = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    seedConfirmation(fake, 'applying', staleUpdatedAt);

    const result = await rejectUpdate('confirmation-1', adminClient(fake));

    expect(result).toEqual({ success: true });
    expect(await readConfirmation(fake, 'confirmation-1')).toMatchObject({ status: 'rejected' });
  });

  it('reports the actual state when confirmation is not applying', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, 'pending', new Date().toISOString());

    const result = await confirmUpdate('confirmation-1', adminClient(fake));

    expect(result).toEqual({
      success: false,
      error: 'Confirmation is not applying (status: pending)',
    });
  });

  it('marks an applying confirmation as confirmed after application succeeds', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, 'applying', new Date().toISOString());

    const result = await confirmUpdate('confirmation-1', adminClient(fake));

    expect(result).toEqual({ success: true });
    expect(await readConfirmation(fake, 'confirmation-1')).toMatchObject({ status: 'confirmed' });
  });
});
