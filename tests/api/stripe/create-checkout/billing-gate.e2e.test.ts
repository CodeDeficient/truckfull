import { expect, test } from '@playwright/test';

/**
 * Billing fail-closed gate regression test.
 *
 * When billing is disabled (NEXT_PUBLIC_BILLING_ENABLED is not "true"), the
 * create-checkout route must reject before any auth lookup, founding
 * reservation, or Stripe call. An unauthenticated request is enough to prove
 * the gate short-circuits: a 403 with the paused message (rather than 401 or
 * a Stripe attempt) demonstrates fail-closed behavior at the very top of the
 * route.
 *
 * Requires billing to be disabled in the dev-server environment (the default:
 * the variable is absent). Note this guard reads the Playwright runner's
 * environment, not the dev server's — they match only when both source the
 * same .env. If they diverge, a skipped/failed mismatch is possible; the 403
 * assertions below remain the real check of fail-closed behavior.
 *
 * Runs in the `api` Playwright project, which needs no auth setup.
 */
test.skip(
  process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true',
  'Requires NEXT_PUBLIC_BILLING_ENABLED to be unset (billing disabled)',
);
test('create-checkout rejects with paused message when billing is disabled', async ({
  request,
}) => {
  const response = await request.post('/api/stripe/create-checkout', {
    data: { tier: 'pro', isFoundingMember: true, interval: 'month' },
  });
  expect(response.status()).toBe(403);
  const body = (await response.json()) as { error: string };
  expect(body.error).toMatch(/not accepting payments/i);
});

/**
 * The gate is evaluated before parsing auth or body. A malformed body must
 * still yield the paused 403, not a 500 or auth error, confirming the guard
 * is the first thing the route does.
 */
test('create-checkout rejects before reading the body when billing is disabled', async ({
  request,
}) => {
  const response = await request.post('/api/stripe/create-checkout', {
    data: {},
  });
  expect(response.status()).toBe(403);
  const body = (await response.json()) as { error: string };
  expect(body.error).toMatch(/not accepting payments/i);
});
