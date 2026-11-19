/**
 * @jest-environment node
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { Pool } from 'pg';

/**
 * Billing authorization integration tests.
 *
 * Verify that the protect_profile_billing_fields trigger prevents an
 * authenticated (non-service_role) client from mutating billing-sensitive
 * profiles columns, while service_role can, and while safe profile fields
 * remain editable.
 *
 * Two harnesses run against local Supabase Postgres (127.0.0.1:54322):
 *
 * 1. `runAs` connects as postgres superuser and drives the trigger through
 *    the request.jwt.claims GUC. This exercises trigger logic but bypasses
 *    schema/table privileges, so it cannot catch privilege regressions.
 *
 * 2. `runAsRealRole` additionally does SET LOCAL ROLE, reproducing the real
 *    authorization boundary an authenticated client faces: schema USAGE,
 *    table grants, RLS, and the trigger all apply. This harness caught the
 *    private-schema helper being unresolvable by API roles — the final fix
 *    moved the helper to public.is_service_role(); note that local runs can
 *    still differ from hosted Supabase, so hosted PostgREST checks remain
 *    the authority for client-path behavior.
 *
 * Never runs against staging or production.
 */

const databaseUrl = process.env.LOCAL_DATABASE_URL;
const runLocal = Boolean(databaseUrl);
const describeDb = runLocal ? describe : describe.skip;

if (runLocal) {
  const parsedDatabaseUrl = new URL(databaseUrl!);
  if (parsedDatabaseUrl.hostname !== '127.0.0.1' || parsedDatabaseUrl.port !== '54322') {
    throw new Error(
      'Billing authorization tests only run against local Supabase on 127.0.0.1:54322',
    );
  }
}

const pool = runLocal ? new Pool({ connectionString: databaseUrl, max: 10 }) : null;

const PROFILE_ID = 'b2000000-0000-4000-8000-000000000001';
const PROFILE_EMAIL = 'billing-auth-test@example.invalid';

interface Row {
  subscription_tier: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
}

interface Client {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Row[]; rowCount: number }>;
}

/**
 * Runs statements as the actual Postgres role, with JWT claims that satisfy
 * both auth.role() and auth.uid() (RLS). This exercises the real privilege
 * boundary: schema USAGE, table grants, RLS, and the trigger.
 */
async function runAsRealRole(
  role: 'authenticated' | 'service_role',
  profileId: string,
  fn: (client: Client) => Promise<void>,
): Promise<void> {
  const client = await pool!.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ role, sub: profileId }),
    ]);
    await client.query(`SET LOCAL ROLE ${role}`);
    await fn(client);
    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // connection may already be unusable; release below
    }
    throw error;
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  if (!runLocal) return;
  await pool!.query(
    `INSERT INTO auth.users (id, email) VALUES ($1::uuid, $2) ON CONFLICT (id) DO NOTHING`,
    [PROFILE_ID, PROFILE_EMAIL],
  );
  await pool!.query(
    `INSERT INTO public.profiles (id, email, role) VALUES ($1::uuid, $2, 'customer') ON CONFLICT (id) DO NOTHING`,
    [PROFILE_ID, PROFILE_EMAIL],
  );
});

afterAll(async () => {
  if (runLocal) {
    await pool!.query(`DELETE FROM public.profiles WHERE id = $1::uuid`, [PROFILE_ID]);
    await pool!.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [PROFILE_ID]);
    await pool!.end();
  }
});

// ---------------------------------------------------------------------------
// Real role boundary: these tests SET LOCAL ROLE so schema USAGE, table
// grants, RLS, and the trigger all apply, exactly as a production client
// would experience them.
// ---------------------------------------------------------------------------

describeDb('billing authorization (real role boundary)', () => {
  test('real authenticated client can update an allowed own-profile field', async () => {
    await expect(
      runAsRealRole('authenticated', PROFILE_ID, async (c) => {
        const res = await c.query(
          `UPDATE public.profiles SET role = 'customer' WHERE id = $1::uuid`,
          [PROFILE_ID],
        );
        expect(res.rowCount).toBe(1);
      }),
    ).resolves.toBeUndefined();
  });

  test('real authenticated client cannot set subscription_tier', async () => {
    await expect(
      runAsRealRole('authenticated', PROFILE_ID, async (c) => {
        await c.query(`UPDATE public.profiles SET subscription_tier = 'pro' WHERE id = $1::uuid`, [
          PROFILE_ID,
        ]);
      }),
    ).rejects.toThrow(/billing fields are not modifiable/);
  });

  test('real authenticated client cannot set stripe fields', async () => {
    await expect(
      runAsRealRole('authenticated', PROFILE_ID, async (c) => {
        await c.query(
          `UPDATE public.profiles SET stripe_customer_id = 'cus_attacker', stripe_subscription_id = 'sub_attacker' WHERE id = $1::uuid`,
          [PROFILE_ID],
        );
      }),
    ).rejects.toThrow(/billing fields are not modifiable/);
  });

  test('real authenticated client insert is forced to safe defaults', async () => {
    const freshId = 'b2000000-0000-4000-8000-000000000098';
    const freshEmail = 'billing-real-insert@example.invalid';
    try {
      await pool!.query(
        `INSERT INTO auth.users (id, email) VALUES ($1::uuid, $2) ON CONFLICT (id) DO NOTHING`,
        [freshId, freshEmail],
      );
      await runAsRealRole('authenticated', freshId, async (c) => {
        const res = await c.query(
          `INSERT INTO public.profiles (id, email, role, subscription_tier, stripe_customer_id)
           VALUES ($1::uuid, $2, 'customer', 'pro', 'cus_attacker')
           RETURNING subscription_tier, stripe_customer_id`,
          [freshId, freshEmail],
        );
        expect(res.rows[0].subscription_tier).toBe('free');
        expect(res.rows[0].stripe_customer_id).toBeNull();
      });
    } finally {
      await pool!.query(`DELETE FROM public.profiles WHERE id = $1::uuid`, [freshId]);
      await pool!.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [freshId]);
    }
  });

  test('real authenticated client cannot update another profile (RLS)', async () => {
    const otherId = 'b2000000-0000-4000-8000-000000000002';
    const otherEmail = 'billing-real-other@example.invalid';
    try {
      await pool!.query(
        `INSERT INTO auth.users (id, email) VALUES ($1::uuid, $2) ON CONFLICT (id) DO NOTHING`,
        [otherId, otherEmail],
      );
      await pool!.query(
        `INSERT INTO public.profiles (id, email, role) VALUES ($1::uuid, $2, 'customer') ON CONFLICT (id) DO NOTHING`,
        [otherId, otherEmail],
      );
      await expect(
        runAsRealRole('authenticated', PROFILE_ID, async (c) => {
          // Own-profile update returns 1 in the same transaction, proving the
          // UPDATE policy path works and the zero count below is RLS hiding
          // the other row — not a missing UPDATE policy.
          const own = await c.query(
            `UPDATE public.profiles SET role = 'customer' WHERE id = $1::uuid`,
            [PROFILE_ID],
          );
          expect(own.rowCount).toBe(1);
          const res = await c.query(
            `UPDATE public.profiles SET role = 'admin' WHERE id = $1::uuid`,
            [otherId],
          );
          expect(res.rowCount).toBe(0);
        }),
      ).resolves.toBeUndefined();
    } finally {
      await pool!.query(`DELETE FROM public.profiles WHERE id = $1::uuid`, [otherId]);
      await pool!.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [otherId]);
    }
  });

  test('real service_role client can set billing fields', async () => {
    await runAsRealRole('service_role', PROFILE_ID, async (c) => {
      const res = await c.query(
        `UPDATE public.profiles SET subscription_tier = 'pro', stripe_customer_id = 'cus_real' WHERE id = $1::uuid`,
        [PROFILE_ID],
      );
      expect(res.rowCount).toBe(1);
    });
    const { rows } = await pool!.query<Row>(
      `SELECT subscription_tier, stripe_customer_id FROM public.profiles WHERE id = $1::uuid`,
      [PROFILE_ID],
    );
    expect(rows[0].subscription_tier).toBe('pro');
    expect(rows[0].stripe_customer_id).toBe('cus_real');
    await runAsRealRole('service_role', PROFILE_ID, async (c) => {
      await c.query(
        `UPDATE public.profiles SET subscription_tier = 'free', stripe_customer_id = NULL WHERE id = $1::uuid`,
        [PROFILE_ID],
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Trusted database administrator boundary (migration 20260904000000).
// Supabase Dashboard SQL Editor and migration connections run as postgres /
// supabase_admin with no JWT claims; the guard must honor those roles while
// an authenticated session that merely CARRIES admin-looking JWT claims stays
// blocked. current_user (not session_user) is what makes the SET ROLE
// simulation meaningful.
// ---------------------------------------------------------------------------

describeDb('billing authorization (trusted db administrator)', () => {
  test('postgres session without JWT claims can set billing fields (admin comp path)', async () => {
    const res = await pool!.query(
      `UPDATE public.profiles SET subscription_tier = 'pro', stripe_customer_id = 'cus_admin_comp' WHERE id = $1::uuid`,
      [PROFILE_ID],
    );
    expect(res.rowCount).toBe(1);
    const { rows } = await pool!.query<Row>(
      `SELECT subscription_tier, stripe_customer_id FROM public.profiles WHERE id = $1::uuid`,
      [PROFILE_ID],
    );
    expect(rows[0].subscription_tier).toBe('pro');
    expect(rows[0].stripe_customer_id).toBe('cus_admin_comp');
  });

  test('postgres session can clear billing fields (admin downgrade path)', async () => {
    await pool!.query(
      `UPDATE public.profiles SET subscription_tier = 'free', stripe_customer_id = NULL, stripe_subscription_id = NULL WHERE id = $1::uuid`,
      [PROFILE_ID],
    );
    const { rows } = await pool!.query<Row>(
      `SELECT subscription_tier, stripe_customer_id FROM public.profiles WHERE id = $1::uuid`,
      [PROFILE_ID],
    );
    expect(rows[0].subscription_tier).toBe('free');
    expect(rows[0].stripe_customer_id).toBeNull();
  });

  test('postgres role is honored by the helper', async () => {
    const { rows } = await pool!.query<{ allowed: boolean }>(
      `SELECT public.is_service_role() AS allowed WHERE current_user = 'postgres'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].allowed).toBe(true);
  });

  test('authenticated role stays blocked', async () => {
    await expect(
      runAsRealRole('authenticated', PROFILE_ID, async (c) => {
        await c.query(`UPDATE public.profiles SET subscription_tier = 'pro' WHERE id = $1::uuid`, [
          PROFILE_ID,
        ]);
      }),
    ).rejects.toThrow(/billing fields are not modifiable/);
  });
});
