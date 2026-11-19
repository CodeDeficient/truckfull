/**
 * @jest-environment node
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { Pool } from 'pg';

/**
 * Role-escalation integration tests (issue #1482).
 *
 * Verify that a non-service_role client cannot self-escalate profiles.role
 * through direct PostgREST-style access. RLS only limits which ROW a user can
 * touch; the profiles UPDATE policy is `auth.uid() = id` with a table-level
 * GRANT ALL, and the only pre-existing column guard covered billing fields.
 * A user could therefore set their own role to 'admin' and pass every admin
 * authorization check in the app.
 *
 * The guard mirrors the billing guard (20260903000000): a BEFORE
 * INSERT OR UPDATE trigger that is a no-op for service_role and trusted
 * database administrators, forces role to 'customer' on client INSERT, and
 * rejects role CHANGES by other clients on UPDATE (same-value writes such as
 * `SET role = 'customer'` remain allowed, matching billing semantics).
 *
 * Two harnesses:
 *
 * 1. `runAsRealRole` does SET LOCAL ROLE, reproducing the real authorization
 *    boundary an authenticated client faces: schema USAGE, table grants, RLS,
 *    and the trigger all apply.
 *
 * 2. `pool` (postgres superuser) exercises the trusted-administrator path.
 *
 * Never runs against staging or production.
 */

const databaseUrl = process.env.LOCAL_DATABASE_URL;
const runLocal = Boolean(databaseUrl);
const describeDb = runLocal ? describe : describe.skip;

if (runLocal) {
  const parsedDatabaseUrl = new URL(databaseUrl!);
  if (parsedDatabaseUrl.hostname !== '127.0.0.1' || parsedDatabaseUrl.port !== '54322') {
    throw new Error('Role-escalation tests only run against local Supabase on 127.0.0.1:54322');
  }
}

const pool = runLocal ? new Pool({ connectionString: databaseUrl, max: 10 }) : null;

const PROFILE_ID = 'b3000000-0000-4000-8000-000000000001';
const PROFILE_EMAIL = 'role-escalation-test@example.invalid';

interface Client {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number }>;
}

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

async function currentRole(): Promise<string> {
  const { rows } = await pool!.query<{ role: string }>(
    `SELECT role FROM public.profiles WHERE id = $1::uuid`,
    [PROFILE_ID],
  );
  return rows[0].role;
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

describeDb('role escalation guard (real role boundary)', () => {
  test('real authenticated client cannot self-escalate role to admin', async () => {
    await expect(
      runAsRealRole('authenticated', PROFILE_ID, async (c) => {
        await c.query(`UPDATE public.profiles SET role = 'admin' WHERE id = $1::uuid`, [
          PROFILE_ID,
        ]);
      }),
    ).rejects.toThrow(/profiles\.role is not modifiable/);
    expect(await currentRole()).toBe('customer');
  });

  test('real authenticated client cannot self-escalate role to food_truck_owner', async () => {
    await expect(
      runAsRealRole('authenticated', PROFILE_ID, async (c) => {
        await c.query(`UPDATE public.profiles SET role = 'food_truck_owner' WHERE id = $1::uuid`, [
          PROFILE_ID,
        ]);
      }),
    ).rejects.toThrow(/profiles\.role is not modifiable/);
    expect(await currentRole()).toBe('customer');
  });

  test('real authenticated client can update a non-role field', async () => {
    await expect(
      runAsRealRole('authenticated', PROFILE_ID, async (c) => {
        const res = await c.query(
          `UPDATE public.profiles SET full_name = 'Legit Name' WHERE id = $1::uuid`,
          [PROFILE_ID],
        );
        expect(res.rowCount).toBe(1);
      }),
    ).resolves.toBeUndefined();
    expect(await currentRole()).toBe('customer');
  });

  test('real authenticated client can write role to its current value (no-op)', async () => {
    await expect(
      runAsRealRole('authenticated', PROFILE_ID, async (c) => {
        const res = await c.query(
          `UPDATE public.profiles SET role = 'customer' WHERE id = $1::uuid`,
          [PROFILE_ID],
        );
        expect(res.rowCount).toBe(1);
      }),
    ).resolves.toBeUndefined();
    expect(await currentRole()).toBe('customer');
  });

  test('real authenticated client insert is forced to customer despite requesting admin', async () => {
    const freshId = 'b3000000-0000-4000-8000-000000000098';
    const freshEmail = 'role-escalation-insert@example.invalid';
    try {
      await pool!.query(
        `INSERT INTO auth.users (id, email) VALUES ($1::uuid, $2) ON CONFLICT (id) DO NOTHING`,
        [freshId, freshEmail],
      );
      await runAsRealRole('authenticated', freshId, async (c) => {
        const res = await c.query(
          `INSERT INTO public.profiles (id, email, role) VALUES ($1::uuid, $2, 'admin') RETURNING role`,
          [freshId, freshEmail],
        );
        expect(res.rows[0].role).toBe('customer');
      });
    } finally {
      await pool!.query(`DELETE FROM public.profiles WHERE id = $1::uuid`, [freshId]);
      await pool!.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [freshId]);
    }
  });

  test('real service_role client can change role (admin invite path)', async () => {
    await runAsRealRole('service_role', PROFILE_ID, async (c) => {
      const res = await c.query(
        `UPDATE public.profiles SET role = 'food_truck_owner' WHERE id = $1::uuid`,
        [PROFILE_ID],
      );
      expect(res.rowCount).toBe(1);
    });
    expect(await currentRole()).toBe('food_truck_owner');
    await runAsRealRole('service_role', PROFILE_ID, async (c) => {
      await c.query(`UPDATE public.profiles SET role = 'customer' WHERE id = $1::uuid`, [
        PROFILE_ID,
      ]);
    });
  });
});

describeDb('role escalation guard (trusted db administrator)', () => {
  test('postgres session can change role (migration/dashboard path)', async () => {
    const res = await pool!.query(`UPDATE public.profiles SET role = 'admin' WHERE id = $1::uuid`, [
      PROFILE_ID,
    ]);
    expect(res.rowCount).toBe(1);
    expect(await currentRole()).toBe('admin');
    await pool!.query(`UPDATE public.profiles SET role = 'customer' WHERE id = $1::uuid`, [
      PROFILE_ID,
    ]);
  });
});
