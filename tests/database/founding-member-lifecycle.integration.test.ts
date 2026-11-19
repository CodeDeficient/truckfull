/**
 * @jest-environment node
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import { Pool } from 'pg';

interface ReservationResult {
  readonly outcome: 'active' | 'reserved' | 'unavailable';
  readonly reservation_id: string | null;
  readonly offer: 'founding_monthly' | 'founding_yearly' | null;
  readonly expires_at: Date | null;
  readonly total: number;
  readonly active: number;
  readonly reserved: number;
  readonly remaining: number;
}

interface ActivationResult {
  readonly outcome: 'activated' | 'already_active' | 'conflict';
  readonly reason: string | null;
}

interface ReconciliationResult {
  readonly outcome: 'activated' | 'already_active' | 'reconciled' | 'conflict';
  readonly reason: string | null;
}

const databaseUrl = process.env.LOCAL_DATABASE_URL;

const runLocal = Boolean(databaseUrl);
const describeDb = runLocal ? describe : describe.skip;

if (runLocal) {
  const parsedDatabaseUrl = new URL(databaseUrl!);
  if (parsedDatabaseUrl.hostname !== '127.0.0.1' || parsedDatabaseUrl.port !== '54322') {
    throw new Error('Founding lifecycle tests only run against local Supabase on 127.0.0.1:54322');
  }
}

const pool = runLocal ? new Pool({ connectionString: databaseUrl, max: 50 }) : null;
const PROFILE_PREFIX = 'a1000000-0000-4000-8000-';

function profileId(index: number): string {
  return `${PROFILE_PREFIX}${index.toString().padStart(12, '0')}`;
}

async function seedProfiles(count: number): Promise<void> {
  const ids = Array.from({ length: count }, (_, index) => profileId(index + 1));
  await pool!.query(
    `INSERT INTO auth.users (id, email)
     SELECT id, 'founding-test-' || row_number() OVER () || '@example.invalid'
     FROM unnest($1::uuid[]) AS id
     ON CONFLICT (id) DO NOTHING`,
    [ids],
  );
  await pool!.query(
    `INSERT INTO public.profiles (id, email)
     SELECT id, 'founding-test-' || row_number() OVER () || '@example.invalid'
     FROM unnest($1::uuid[]) AS id
     ON CONFLICT (id) DO NOTHING`,
    [ids],
  );
}

async function reserve(index: number, offer = 'founding_monthly'): Promise<ReservationResult> {
  const result = await pool!.query<ReservationResult>(
    'SELECT * FROM public.reserve_founding_member_slot($1, $2)',
    [profileId(index), offer],
  );
  return result.rows[0];
}

async function activate(
  index: number,
  reservationId: string,
  checkoutSessionId = `cs_test_${index}`,
  offer = 'founding_monthly',
): Promise<ActivationResult> {
  const result = await pool!.query<ActivationResult>(
    'SELECT * FROM public.activate_founding_membership($1, $2, $3, $4, $5, $6)',
    [
      reservationId,
      profileId(index),
      checkoutSessionId,
      offer,
      `cus_test_${index}`,
      `sub_test_${index}`,
    ],
  );
  return result.rows[0];
}

async function bind(reservationId: string, checkoutSessionId: string): Promise<boolean> {
  const result = await pool!.query<{ bound: boolean }>(
    'SELECT public.bind_founding_reservation($1, $2) AS bound',
    [reservationId, checkoutSessionId],
  );
  return result.rows[0].bound;
}

async function reconcile(
  index: number,
  reservationId: string,
  checkoutSessionId = `cs_test_${index}`,
  offer = 'founding_monthly',
): Promise<ReconciliationResult> {
  const result = await pool!.query<ReconciliationResult>(
    'SELECT * FROM public.reconcile_verified_founding_membership($1, $2, $3, $4, $5, $6)',
    [reservationId, profileId(index), checkoutSessionId, offer, `cus_test_${index}`, `sub_test_${index}`],
  );
  return result.rows[0];
}

async function expire(reservationId: string, checkoutSessionId: string | null): Promise<boolean> {
  const result = await pool!.query<{ expired: boolean }>(
    'SELECT public.expire_founding_reservation($1, $2) AS expired',
    [reservationId, checkoutSessionId],
  );
  return result.rows[0].expired;
}

beforeAll(async () => {
  if (runLocal) await seedProfiles(50);
});

beforeEach(async () => {
  if (runLocal) await pool!.query('DELETE FROM public.founding_members');
});

afterAll(async () => {
  if (!runLocal) return;
  await pool!.query('DELETE FROM public.founding_members');
  await pool!.query("DELETE FROM public.profiles WHERE id::text LIKE 'a1000000-0000-4000-8000-%'");
  await pool!.query("DELETE FROM auth.users WHERE id::text LIKE 'a1000000-0000-4000-8000-%'");
  await pool!.end();
});

describeDb('founding-member reservation lifecycle', () => {
  test('reserves one of the configured spots and returns a reservation identifier', async () => {
    const result = await reserve(1);

    expect(result.outcome).toBe('reserved');
    expect(result.reservation_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.offer).toBe('founding_monthly');
    expect(result.total).toBe(40);
    expect(result.remaining).toBe(39);
    expect(result.expires_at?.getTime()).toBeGreaterThan(Date.now() + 25 * 60 * 60 * 1000);
  });

  test('returns the same unexpired reservation for the same profile', async () => {
    const first = await reserve(1);
    const second = await reserve(1);

    expect(second.outcome).toBe('reserved');
    expect(second.reservation_id).toBe(first.reservation_id);
    expect(second.reserved).toBe(1);
  });

  test('returns an existing permanent entitlement without consuming another spot', async () => {
    const reservation = await reserve(1);
    await bind(reservation.reservation_id!, 'cs_test_1');
    await activate(1, reservation.reservation_id!);

    const returning = await reserve(1, 'founding_yearly');

    expect(returning.outcome).toBe('active');
    expect(returning.active).toBe(1);
    expect(returning.reserved).toBe(0);
    expect(returning.remaining).toBe(39);
  });

  test('activates a bound reservation idempotently', async () => {
    const reservation = await reserve(1);
    const reservationId = reservation.reservation_id!;
    expect(await bind(reservationId, 'cs_test_1')).toBe(true);

    expect(await activate(1, reservationId)).toMatchObject({ outcome: 'activated', reason: null });
    expect(await activate(1, reservationId)).toMatchObject({
      outcome: 'already_active',
      reason: null,
    });

    const row = await pool!.query(
      'SELECT status, checkout_session_id, stripe_customer_id, stripe_subscription_id FROM public.founding_members WHERE profile_id = $1',
      [profileId(1)],
    );
    expect(row.rows[0]).toMatchObject({
      status: 'active',
      checkout_session_id: 'cs_test_1',
      stripe_customer_id: 'cus_test_1',
      stripe_subscription_id: 'sub_test_1',
    });
  });

  test('rejects activation when the reservation belongs to another profile', async () => {
    const reservation = await reserve(1);
    await bind(reservation.reservation_id!, 'cs_test_1');
    const result = await activate(2, reservation.reservation_id!);

    expect(result).toMatchObject({ outcome: 'conflict', reason: 'reservation_mismatch' });
  });

  test('rejects activation when the paid offer differs from the reservation', async () => {
    const reservation = await reserve(1);
    await bind(reservation.reservation_id!, 'cs_test_1');

    const result = await activate(1, reservation.reservation_id!, 'cs_test_1', 'founding_yearly');

    expect(result).toMatchObject({ outcome: 'conflict', reason: 'offer_mismatch' });
  });

  test('expires an abandoned reservation and releases its spot', async () => {
    const reservation = await reserve(1);
    await pool!.query('SELECT public.expire_founding_reservation($1, $2)', [
      reservation.reservation_id,
      null,
    ]);

    const status = await pool!.query<ReservationResult>(
      'SELECT * FROM public.get_founding_member_status()',
    );
    expect(status.rows[0]).toMatchObject({ active: 0, reserved: 0, remaining: 40 });
  });

  test('does not expire a reservation bound to a different checkout session', async () => {
    const reservation = await reserve(1);
    await bind(reservation.reservation_id!, 'cs_test_1');

    const expired = await expire(reservation.reservation_id!, 'cs_test_2');

    expect(expired).toBe(false);
    const row = await pool!.query(
      'SELECT status, checkout_session_id FROM public.founding_members WHERE profile_id = $1',
      [profileId(1)],
    );
    expect(row.rows[0]).toMatchObject({ status: 'reserved', checkout_session_id: 'cs_test_1' });
  });

  test('does not expire a bound reservation when no session id is given', async () => {
    const reservation = await reserve(1);
    await bind(reservation.reservation_id!, 'cs_test_1');

    const expired = await expire(reservation.reservation_id!, null);

    expect(expired).toBe(false);
    const row = await pool!.query(
      'SELECT status, checkout_session_id FROM public.founding_members WHERE profile_id = $1',
      [profileId(1)],
    );
    expect(row.rows[0]).toMatchObject({ status: 'reserved', checkout_session_id: 'cs_test_1' });
  });

  test('expires a reservation when the checkout session matches', async () => {
    const reservation = await reserve(1);
    await bind(reservation.reservation_id!, 'cs_test_1');

    const expired = await expire(reservation.reservation_id!, 'cs_test_1');

    expect(expired).toBe(true);
    const row = await pool!.query(
      'SELECT status FROM public.founding_members WHERE profile_id = $1',
      [profileId(1)],
    );
    expect(row.rows[0]).toMatchObject({ status: 'expired' });
  });

  test('activates a reservation whose TTL lapsed when the session matches', async () => {
    const reservation = await reserve(1);
    await bind(reservation.reservation_id!, 'cs_test_1');
    await pool!.query(
      "UPDATE public.founding_members SET expires_at = statement_timestamp() - INTERVAL '1 hour' WHERE profile_id = $1",
      [profileId(1)],
    );

    const result = await activate(1, reservation.reservation_id!);

    expect(result).toMatchObject({ outcome: 'activated', reason: null });
    const row = await pool!.query(
      'SELECT status, expires_at FROM public.founding_members WHERE profile_id = $1',
      [profileId(1)],
    );
    expect(row.rows[0]).toMatchObject({ status: 'active', expires_at: null });
  });

  test('rejects a different-offer re-reserve on an unbound reservation and keeps the stored offer', async () => {
    const first = await reserve(1, 'founding_yearly');
    const second = await reserve(1, 'founding_monthly');

    expect(second.outcome).toBe('offer_mismatch');
    expect(second.reservation_id).toBe(first.reservation_id);
    expect(second.offer).toBe('founding_yearly');
    const row = await pool!.query(
      'SELECT offer, checkout_session_id, status FROM public.founding_members WHERE profile_id = $1',
      [profileId(1)],
    );
    expect(row.rows[0]).toMatchObject({ offer: 'founding_yearly', status: 'reserved' });
  });

  test('rejects the reversed offer order symmetrically', async () => {
    const first = await reserve(1, 'founding_monthly');
    const second = await reserve(1, 'founding_yearly');

    expect(second.outcome).toBe('offer_mismatch');
    expect(second.reservation_id).toBe(first.reservation_id);
    expect(second.offer).toBe('founding_monthly');
    const row = await pool!.query(
      'SELECT offer, status FROM public.founding_members WHERE profile_id = $1',
      [profileId(1)],
    );
    expect(row.rows[0]).toMatchObject({ offer: 'founding_monthly', status: 'reserved' });
  });

  test('rejects a different-offer re-reserve on a bound reservation and leaves the session bound', async () => {
    const first = await reserve(1, 'founding_monthly');
    await bind(first.reservation_id!, 'cs_test_1');

    const second = await reserve(1, 'founding_yearly');

    expect(second.outcome).toBe('offer_mismatch');
    expect(second.reservation_id).toBe(first.reservation_id);
    expect(second.offer).toBe('founding_monthly');
    const row = await pool!.query(
      'SELECT offer, checkout_session_id, status FROM public.founding_members WHERE profile_id = $1',
      [profileId(1)],
    );
    expect(row.rows[0]).toMatchObject({
      offer: 'founding_monthly',
      checkout_session_id: 'cs_test_1',
      status: 'reserved',
    });
  });

  test('extends the reservation TTL on re-reserve so a fresh session fits', async () => {
    const first = await reserve(1);
    await pool!.query(
      "UPDATE public.founding_members SET expires_at = statement_timestamp() + INTERVAL '1 hour' WHERE profile_id = $1",
      [profileId(1)],
    );

    const second = await reserve(1);

    expect(second.outcome).toBe('reserved');
    expect(second.reservation_id).toBe(first.reservation_id);
    expect(second.expires_at).not.toBeNull();
    const remainingMs = new Date(second.expires_at!).getTime() - Date.now();
    expect(remainingMs).toBeGreaterThan(25 * 60 * 60 * 1000);
  });

  test('keeps the original TTL on a bound reservation when re-reserving', async () => {
    const first = await reserve(1);
    await bind(first.reservation_id!, 'cs_test_1');
    await pool!.query(
      "UPDATE public.founding_members SET expires_at = statement_timestamp() + INTERVAL '1 hour' WHERE profile_id = $1",
      [profileId(1)],
    );

    const second = await reserve(1);

    expect(second.outcome).toBe('reserved');
    expect(second.reservation_id).toBe(first.reservation_id);
    expect(second.expires_at).not.toBeNull();
    const remainingMs = new Date(second.expires_at!).getTime() - Date.now();
    expect(remainingMs).toBeLessThan(2 * 60 * 60 * 1000);
  });

  test('allows exactly the fortieth allocation and rejects the forty-first', async () => {
    for (let index = 1; index <= 40; index += 1) await reserve(index);

    const overflow = await reserve(41);

    expect(overflow).toMatchObject({ outcome: 'unavailable', remaining: 0, reserved: 40 });
  });

  test('serializes parallel claims for the final spot', async () => {
    for (let index = 1; index <= 39; index += 1) await reserve(index);

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) => reserve(index + 40)),
    );

    expect(results.filter((result) => result.outcome === 'reserved')).toHaveLength(1);
    expect(results.filter((result) => result.outcome === 'unavailable')).toHaveLength(9);

    const status = await pool!.query<ReservationResult>(
      'SELECT * FROM public.get_founding_member_status()',
    );
    expect(status.rows[0]).toMatchObject({ active: 0, reserved: 40, remaining: 0 });
  });

  test('prevents public roles from mutating founding allocations directly', async () => {
    const grants = await pool!.query<{ grantee: string; privilege_type: string }>(
      `SELECT grantee, privilege_type
       FROM information_schema.role_table_grants
       WHERE table_schema = 'public'
         AND table_name = 'founding_members'
         AND grantee IN ('anon', 'authenticated')
       ORDER BY grantee, privilege_type`,
    );

    expect(grants.rows).toEqual([{ grantee: 'authenticated', privilege_type: 'SELECT' }]);
  });

  describeDb('reconcile_verified_founding_membership', () => {
    test('activates a live bound reservation', async () => {
      const reservation = await reserve(1);
      await bind(reservation.reservation_id!, 'cs_test_1');

      const result = await reconcile(1, reservation.reservation_id!);

      expect(result).toMatchObject({ outcome: 'activated', reason: null });
      const rows = await pool!.query(
        'SELECT status, offer, checkout_session_id, stripe_customer_id, stripe_subscription_id FROM public.founding_members WHERE profile_id = $1',
        [profileId(1)],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({
        status: 'active',
        offer: 'founding_monthly',
        checkout_session_id: 'cs_test_1',
        stripe_customer_id: 'cus_test_1',
        stripe_subscription_id: 'sub_test_1',
      });
    });

    test('returns already_active on duplicate invocation', async () => {
      const reservation = await reserve(1);
      await bind(reservation.reservation_id!, 'cs_test_1');
      await reconcile(1, reservation.reservation_id!);

      const repeat = await reconcile(1, reservation.reservation_id!);

      expect(repeat.outcome).toBe('already_active');
      const rows = await pool!.query(
        'SELECT status FROM public.founding_members WHERE profile_id = $1',
        [profileId(1)],
      );
      expect(rows.rows).toHaveLength(1);
    });

    test('activates a TTL-lapsed bound reservation', async () => {
      const reservation = await reserve(1);
      await bind(reservation.reservation_id!, 'cs_test_1');
      await pool!.query(
        "UPDATE public.founding_members SET expires_at = statement_timestamp() - INTERVAL '1 hour' WHERE profile_id = $1",
        [profileId(1)],
      );

      const result = await reconcile(1, reservation.reservation_id!);

      expect(result.outcome).toBe('activated');
      const row = await pool!.query(
        'SELECT status, expires_at FROM public.founding_members WHERE profile_id = $1',
        [profileId(1)],
      );
      expect(row.rows[0]).toMatchObject({ status: 'active', expires_at: null });
    });

    test('reconciles an explicitly expired reservation to active', async () => {
      const reservation = await reserve(1);
      await bind(reservation.reservation_id!, 'cs_test_1');
      await pool!.query('SELECT public.expire_founding_reservation($1, $2)', [
        reservation.reservation_id,
        'cs_test_1',
      ]);

      const result = await reconcile(1, reservation.reservation_id!);

      expect(result.outcome).toBe('reconciled');
      const row = await pool!.query(
        'SELECT status, checkout_session_id FROM public.founding_members WHERE profile_id = $1',
        [profileId(1)],
      );
      expect(row.rows[0]).toMatchObject({ status: 'active', checkout_session_id: 'cs_test_1' });
    });

    test('reconciles a replaced reservation whose id no longer exists', async () => {
      const reservation = await reserve(1);
      await bind(reservation.reservation_id!, 'cs_test_1');
      await pool!.query(
        "UPDATE public.founding_members SET expires_at = statement_timestamp() - INTERVAL '1 hour' WHERE profile_id = $1",
        [profileId(1)],
      );
      await reserve(1, 'founding_yearly');

      const result = await reconcile(1, reservation.reservation_id!, 'cs_test_1', 'founding_monthly');

      expect(result.outcome).toBe('reconciled');
      const rows = await pool!.query(
        'SELECT status, offer, checkout_session_id FROM public.founding_members WHERE profile_id = $1',
        [profileId(1)],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({
        status: 'active',
        offer: 'founding_monthly',
        checkout_session_id: 'cs_test_1',
      });
    });

    test('supersedes a newer pending reservation for the same profile', async () => {
      const oldReservation = await reserve(1);
      await bind(oldReservation.reservation_id!, 'cs_test_1');
      await pool!.query(
        "UPDATE public.founding_members SET expires_at = statement_timestamp() - INTERVAL '1 hour' WHERE profile_id = $1",
        [profileId(1)],
      );
      await reserve(1, 'founding_yearly');
      const current = await pool!.query<{ reservation_id: string }>(
        'SELECT reservation_id FROM public.founding_members WHERE profile_id = $1',
        [profileId(1)],
      );
      await bind(current.rows[0].reservation_id, 'cs_test_newer');

      const result = await reconcile(1, oldReservation.reservation_id!, 'cs_test_1', 'founding_monthly');

      expect(result.outcome).toBe('reconciled');
      const rows = await pool!.query(
        'SELECT status, offer, checkout_session_id FROM public.founding_members WHERE profile_id = $1',
        [profileId(1)],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({
        status: 'active',
        offer: 'founding_monthly',
        checkout_session_id: 'cs_test_1',
      });
    });

    test('keeps one active entitlement when the profile is already active', async () => {
      const reservation = await reserve(1);
      await bind(reservation.reservation_id!, 'cs_test_1');
      await activate(1, reservation.reservation_id!);

      const result = await reconcile(1, reservation.reservation_id!);

      expect(result.outcome).toBe('already_active');
      const rows = await pool!.query(
        'SELECT status FROM public.founding_members WHERE profile_id = $1',
        [profileId(1)],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({ status: 'active' });
    });

    test('creates an entitlement when no row exists for the profile', async () => {
      const result = await reconcile(1, crypto.randomUUID(), 'cs_test_1', 'founding_monthly');

      expect(result.outcome).toBe('reconciled');
      const rows = await pool!.query(
        'SELECT status, offer, checkout_session_id FROM public.founding_members WHERE profile_id = $1',
        [profileId(1)],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({
        status: 'active',
        offer: 'founding_monthly',
        checkout_session_id: 'cs_test_1',
      });
    });

    test('rejects a reservation belonging to another profile without mutating either', async () => {
      const foreign = await reserve(2);
      const before = await pool!.query('SELECT * FROM public.founding_members');

      const result = await reconcile(1, foreign.reservation_id!, 'cs_test_1');

      expect(result).toMatchObject({ outcome: 'conflict', reason: 'reservation_profile_mismatch' });
      const after = await pool!.query('SELECT * FROM public.founding_members');
      expect(after.rows).toEqual(before.rows);
    });

    test('rejects an offer that is not a founding offer', async () => {
      await expect(reconcile(1, crypto.randomUUID(), 'cs_test_1', 'standard_monthly')).rejects.toThrow();
    });

    test('rejects a missing profile id', async () => {
      await expect(
        pool!.query<ReconciliationResult>(
          'SELECT * FROM public.reconcile_verified_founding_membership($1, $2, $3, $4, $5, $6)',
          [crypto.randomUUID(), null, 'cs_test_1', 'founding_monthly', 'cus_test_1', 'sub_test_1'],
        ),
      ).rejects.toThrow();
    });

    test('rejects a blank checkout session id', async () => {
      await expect(reconcile(1, crypto.randomUUID(), '   ')).rejects.toThrow();
    });

    test('leaves expires_at NULL on every reconciled active row', async () => {
      const reservation = await reserve(1);
      await bind(reservation.reservation_id!, 'cs_test_1');
      await pool!.query(
        "UPDATE public.founding_members SET expires_at = statement_timestamp() - INTERVAL '1 hour' WHERE profile_id = $1",
        [profileId(1)],
      );

      await reconcile(1, reservation.reservation_id!);

      const row = await pool!.query(
        'SELECT expires_at FROM public.founding_members WHERE profile_id = $1',
        [profileId(1)],
      );
      expect(row.rows[0].expires_at).toBeNull();
    });
  });
});
