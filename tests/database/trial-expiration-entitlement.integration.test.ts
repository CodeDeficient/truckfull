/**
 * @jest-environment node
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { Pool, type PoolClient } from 'pg';

const databaseUrl = process.env.LOCAL_DATABASE_URL;
const runLocal = Boolean(databaseUrl);
const describeDb = runLocal ? describe : describe.skip;

if (runLocal) {
  const parsedDatabaseUrl = new URL(databaseUrl!);
  if (parsedDatabaseUrl.hostname !== '127.0.0.1' || parsedDatabaseUrl.port !== '54322') {
    throw new Error('Trial expiration tests only run against local Supabase on 127.0.0.1:54322');
  }
}

const pool = runLocal ? new Pool({ connectionString: databaseUrl, max: 4 }) : null;
const EXPIRED_PRO_ID = 'e1000000-0000-4000-8000-000000000001';
const EXPIRING_TRIAL_ID = 'e1000000-0000-4000-8000-000000000002';
const EXPIRED_AT = '2026-09-01T12:00:00.000Z';
const EXPIRATION_NOTE = 'Automated downgrade: non-Stripe Pro subscription expired';

async function runAsAuthenticated(
  profileId: string,
  action: (client: PoolClient) => Promise<void>,
): Promise<void> {
  const client = await pool!.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ role: 'authenticated', sub: profileId }),
    ]);
    await client.query('SET LOCAL ROLE authenticated');
    await action(client);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  if (!runLocal) return;
  for (const [id, email] of [
    [EXPIRED_PRO_ID, 'expired-pro-rls@example.invalid'],
    [EXPIRING_TRIAL_ID, 'expiring-trial-rpc@example.invalid'],
  ]) {
    await pool!.query(
      `INSERT INTO auth.users (id, email) VALUES ($1::uuid, $2) ON CONFLICT (id) DO NOTHING`,
      [id, email],
    );
    await pool!.query(
      `INSERT INTO public.profiles (id, email, role)
       VALUES ($1::uuid, $2, 'customer') ON CONFLICT (id) DO NOTHING`,
      [id, email],
    );
  }
  await pool!.query(`SELECT set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ role: 'service_role' }),
  ]);
  await pool!.query(
    `UPDATE public.profiles
     SET subscription_tier = 'pro', stripe_subscription_id = NULL,
         subscription_started_at = $2::timestamptz - interval '30 days',
         subscription_ends_at = $2::timestamptz
     WHERE id = ANY($1::uuid[])`,
    [[EXPIRED_PRO_ID, EXPIRING_TRIAL_ID], EXPIRED_AT],
  );
  await pool!.query(`SELECT set_config('request.jwt.claims', '', false)`);
  const trafficNodes = await pool!.query(`SELECT count(*)::int AS count FROM public.traffic_nodes`);
  expect(trafficNodes.rows[0].count).toBeGreaterThan(0);
});

afterAll(async () => {
  if (!runLocal) return;
  await pool!.query(`DELETE FROM public.subscription_history WHERE user_id = ANY($1::uuid[])`, [
    [EXPIRED_PRO_ID, EXPIRING_TRIAL_ID],
  ]);
  await pool!.query(`DELETE FROM public.profiles WHERE id = ANY($1::uuid[])`, [
    [EXPIRED_PRO_ID, EXPIRING_TRIAL_ID],
  ]);
  await pool!.query(`DELETE FROM auth.users WHERE id = ANY($1::uuid[])`, [
    [EXPIRED_PRO_ID, EXPIRING_TRIAL_ID],
  ]);
  await pool!.end();
});

describeDb('trial expiration and traffic-node entitlement', () => {
  test('expired Pro without Stripe cannot view traffic nodes before the expiry job runs', async () => {
    await runAsAuthenticated(EXPIRED_PRO_ID, async (client) => {
      const result = await client.query(`SELECT count(*)::int AS count FROM public.traffic_nodes`);
      expect(result.rows[0].count).toBe(0);
    });
  });

  test('expiration preserves the end timestamp and is idempotent', async () => {
    const client = await pool!.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT public.expire_free_trials()`);
      const firstProfile = await client.query(
        `SELECT subscription_tier, subscription_ends_at
         FROM public.profiles WHERE id = $1::uuid`,
        [EXPIRING_TRIAL_ID],
      );
      expect(firstProfile.rows[0].subscription_tier).toBe('free');
      expect(new Date(firstProfile.rows[0].subscription_ends_at).toISOString()).toBe(EXPIRED_AT);

      await client.query(`SELECT public.expire_free_trials()`);
      const secondProfile = await client.query(
        `SELECT subscription_tier, subscription_ends_at
         FROM public.profiles WHERE id = $1::uuid`,
        [EXPIRING_TRIAL_ID],
      );
      expect(secondProfile.rows).toEqual(firstProfile.rows);

      const history = await client.query(
        `SELECT count(*)::int AS count
         FROM public.subscription_history
         WHERE user_id = $1::uuid AND notes = $2`,
        [EXPIRING_TRIAL_ID, EXPIRATION_NOTE],
      );
      expect(history.rows[0].count).toBe(1);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
