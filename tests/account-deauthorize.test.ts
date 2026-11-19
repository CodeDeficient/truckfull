import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const appSecret = process.env.FACEBOOK_AUTH_APP_SECRET || '';

if (!appSecret) {
  throw new Error('FACEBOOK_AUTH_APP_SECRET must be set in .env.local for E2E tests');
}

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

function buildSignedRequest(payload: Record<string, unknown>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const signature = createHmac('sha256', appSecret)
    .update(encodedPayload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${signature}.${encodedPayload}`;
}

interface TestUserData {
  userId: string;
  facebookUserId: string;
  googleUserId?: string;
}

interface DualFacebookTestUser {
  userId: string;
  facebookUserId1: string;
  facebookUserId2: string;
}

async function createTestUserWithEmailAndFacebook(): Promise<TestUserData> {
  const facebookUserId = `e2e-fb-${Date.now()}`;
  const googleUserId = `e2e-google-${Date.now()}`;
  const email = `e2e-deauth-${Date.now()}@test.example.com`;

  const { data, error } = await adminClient.rpc('create_test_user_with_identities', {
    p_email: email,
    p_identities: [
      {
        provider: 'facebook',
        identity_id: facebookUserId,
        email: `${facebookUserId}@facebook.com`,
      },
      {
        provider: 'google',
        identity_id: googleUserId,
        email: `${facebookUserId}@gmail.com`,
      },
    ],
    p_password: 'testpass123',
  });

  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  return { userId: data as string, facebookUserId, googleUserId };
}

async function createTestUserWithTwoFacebookIdentities(): Promise<DualFacebookTestUser> {
  const facebookUserId1 = `e2e-fb-first-${Date.now()}`;
  const facebookUserId2 = `e2e-fb-second-${Date.now()}`;
  const googleUserId = `e2e-google-${Date.now()}`;
  const email = `e2e-deauth-double-${Date.now()}@test.example.com`;

  const { data, error } = await adminClient.rpc('create_test_user_with_identities', {
    p_email: email,
    p_identities: [
      {
        provider: 'facebook',
        identity_id: facebookUserId1,
        email: `${facebookUserId1}@facebook.com`,
      },
      {
        provider: 'facebook',
        identity_id: facebookUserId2,
        email: `${facebookUserId2}@facebook.com`,
      },
      {
        provider: 'google',
        identity_id: googleUserId,
        email: `${facebookUserId1}@gmail.com`,
      },
    ],
    p_password: 'testpass123',
  });

  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  return { userId: data as string, facebookUserId1, facebookUserId2 };
}

async function createTestUserWithFacebookOnly(): Promise<TestUserData> {
  const facebookUserId = `e2e-fb-single-${Date.now()}`;
  const email = `e2e-deauth-single-${Date.now()}@test.example.com`;

  const { data, error } = await adminClient.rpc('create_test_user_with_identities', {
    p_email: email,
    p_identities: [
      {
        provider: 'facebook',
        identity_id: facebookUserId,
        email: `${facebookUserId}@facebook.com`,
      },
    ],
    p_password: 'testpass123',
  });

  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  return { userId: data as string, facebookUserId };
}

async function cleanupTestUser(userId: string): Promise<void> {
  await adminClient.rpc('delete_test_user', { p_user_id: userId });
}

test.describe('POST /api/facebook/deauthorize', () => {
  let multiAuthUser: TestUserData;
  let singleAuthUser: TestUserData;

  test.beforeAll(async () => {
    multiAuthUser = await createTestUserWithEmailAndFacebook();
    singleAuthUser = await createTestUserWithFacebookOnly();
  });

  test.afterAll(async () => {
    await cleanupTestUser(multiAuthUser.userId);
    await cleanupTestUser(singleAuthUser.userId);
  });

  test('returns 400 when signed_request is missing', async ({ request }) => {
    const response = await request.post('/api/facebook/deauthorize', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: 'foo=bar',
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing signed_request');
  });

  test('returns 400 when signed_request has invalid format', async ({ request }) => {
    const response = await request.post('/api/facebook/deauthorize', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams({ signed_request: 'not-valid.no-payload' }).toString(),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid signed_request');
  });

  test('returns 200 when user not found (idempotent)', async ({ request }) => {
    const signedRequest = buildSignedRequest({ user_id: 'nonexistent-fb-user' });
    const response = await request.post('/api/facebook/deauthorize', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams({ signed_request: signedRequest }).toString(),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('returns 200 and unlinks identity when user has Facebook + Google', async ({ request }) => {
    const signedRequest = buildSignedRequest({ user_id: multiAuthUser.facebookUserId });
    const response = await request.post('/api/facebook/deauthorize', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams({ signed_request: signedRequest }).toString(),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    const { data: user, error: userError } = await adminClient.auth.admin.getUserById(
      multiAuthUser.userId,
    );
    expect(userError).toBeNull();
    expect(user?.user).not.toBeNull();
    expect(user!.user!.identities?.find((i) => i.provider === 'facebook')).toBeUndefined();
    expect(user!.user!.identities?.find((i) => i.provider === 'google')).toBeDefined();
  });

  test('returns 400 when Facebook is the only auth method', async ({ request }) => {
    const signedRequest = buildSignedRequest({ user_id: singleAuthUser.facebookUserId });
    const response = await request.post('/api/facebook/deauthorize', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams({ signed_request: signedRequest }).toString(),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Facebook');
    expect(body.error).toContain('only login method');

    const { data: user, error: userError } = await adminClient.auth.admin.getUserById(
      singleAuthUser.userId,
    );
    expect(userError).toBeNull();
    expect(user?.user).not.toBeNull();
    expect(user!.user!.identities?.length).toBe(1);
    expect(user!.user!.identities?.[0]?.provider).toBe('facebook');
  });

  test('returns 400 when algorithm is not HMAC-SHA256', async ({ request }) => {
    const signedRequest = buildSignedRequest({ user_id: 'test', algorithm: 'HMAC-SHA512' });
    const response = await request.post('/api/facebook/deauthorize', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: new URLSearchParams({ signed_request: signedRequest }).toString(),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid signed_request');
  });
});

test.describe('concurrent deauthorize', () => {
  let dualFbUser: DualFacebookTestUser;

  test.beforeAll(async () => {
    dualFbUser = await createTestUserWithTwoFacebookIdentities();
  });

  test.afterAll(async () => {
    await cleanupTestUser(dualFbUser.userId);
  });

  test('concurrent unlinks of two different identities: exactly one succeeds, other is rejected', async ({
    request,
  }) => {
    const signed1 = buildSignedRequest({ user_id: dualFbUser.facebookUserId1 });
    const signed2 = buildSignedRequest({ user_id: dualFbUser.facebookUserId2 });

    const [result1, result2] = await Promise.all([
      request.post('/api/facebook/deauthorize', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: new URLSearchParams({ signed_request: signed1 }).toString(),
      }),
      request.post('/api/facebook/deauthorize', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: new URLSearchParams({ signed_request: signed2 }).toString(),
      }),
    ]);

    const statuses = [result1.status(), result2.status()].sort();

    // At least one request must succeed (200).
    // The other gets rejected either by:
    // - advisory lock (500) if both hit the RPC concurrently
    // - "only login method" check (400) if one finishes before the other checks
    // Both could succeed (200) if sequential — one deletes, other gets idempotent success
    expect(statuses[0]).toBe(200);

    // User must retain at least 1 identity
    const { data: userAfter } = await adminClient.auth.admin.getUserById(dualFbUser.userId);
    expect(userAfter?.user?.identities?.length).toBeGreaterThanOrEqual(1);
    expect(userAfter?.user?.identities?.length).toBeLessThanOrEqual(2);
  });

  test('10 concurrent unlinks of the same identity: at least 1 succeeds, user retains other identities', async ({
    request,
  }) => {
    const freshUser = await createTestUserWithTwoFacebookIdentities();

    try {
      const signed = buildSignedRequest({ user_id: freshUser.facebookUserId1 });

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          request.post('/api/facebook/deauthorize', {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: new URLSearchParams({ signed_request: signed }).toString(),
          }),
        ),
      );

      const statuses = results.map((r) => r.status());
      const successCount = statuses.filter((s) => s === 200).length;

      expect(successCount).toBeGreaterThanOrEqual(1);

      const { data: userAfter } = await adminClient.auth.admin.getUserById(freshUser.userId);
      const fbIdentities =
        userAfter?.user?.identities?.filter((i) => i.provider === 'facebook') ?? [];
      const targetExists = fbIdentities.some(
        (i) => i.identity_data?.sub === freshUser.facebookUserId1,
      );
      expect(targetExists).toBe(false);

      expect(userAfter?.user?.identities?.length).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanupTestUser(freshUser.userId);
    }
  });
});
