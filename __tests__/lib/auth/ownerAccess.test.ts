import { describe, it, expect } from '@jest/globals';
import { computeEntitlementActive, type EntitlementInput } from '@/lib/auth/ownerAccess';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-10T12:00:00Z');
const futureEndsAt = new Date(NOW.getTime() + 10 * DAY_MS).toISOString();
const pastEndsAt = new Date(NOW.getTime() - 2 * DAY_MS).toISOString();

function input(overrides: Partial<EntitlementInput>): EntitlementInput {
  return {
    subscriptionTier: 'free',
    stripeSubscriptionId: null,
    subscriptionEndsAt: null,
    ...overrides,
  };
}

describe('computeEntitlementActive', () => {
  it('grants access to an enterprise profile with no Stripe id and no expiration', () => {
    const active = computeEntitlementActive(
      input({ subscriptionTier: 'enterprise', stripeSubscriptionId: null, subscriptionEndsAt: null }),
      NOW,
    );
    expect(active).toBe(true);
  });

  it('grants access to an enterprise profile with a past expiration date', () => {
    const active = computeEntitlementActive(
      input({ subscriptionTier: 'enterprise', subscriptionEndsAt: pastEndsAt }),
      NOW,
    );
    expect(active).toBe(true);
  });

  it('grants access to a paid pro profile by Stripe subscription id alone', () => {
    const active = computeEntitlementActive(
      input({ subscriptionTier: 'pro', stripeSubscriptionId: 'sub_123', subscriptionEndsAt: null }),
      NOW,
    );
    expect(active).toBe(true);
  });

  it('grants access to an active local pro trial with a future end date', () => {
    const active = computeEntitlementActive(
      input({ subscriptionTier: 'pro', stripeSubscriptionId: null, subscriptionEndsAt: futureEndsAt }),
      NOW,
    );
    expect(active).toBe(true);
  });

  it('denies an expired local pro trial (past end date, no Stripe subscription)', () => {
    const active = computeEntitlementActive(
      input({ subscriptionTier: 'pro', stripeSubscriptionId: null, subscriptionEndsAt: pastEndsAt }),
      NOW,
    );
    expect(active).toBe(false);
  });

  it('denies a pro profile with no Stripe subscription and no end date', () => {
    const active = computeEntitlementActive(
      input({ subscriptionTier: 'pro', stripeSubscriptionId: null, subscriptionEndsAt: null }),
      NOW,
    );
    expect(active).toBe(false);
  });

  it('denies a free profile', () => {
    const active = computeEntitlementActive(
      input({ subscriptionTier: 'free' }),
      NOW,
    );
    expect(active).toBe(false);
  });

  it('denies a deprecated starter profile even with a future end date', () => {
    const active = computeEntitlementActive(
      input({ subscriptionTier: 'starter', subscriptionEndsAt: futureEndsAt }),
      NOW,
    );
    expect(active).toBe(false);
  });

  it('denies an invalid end-date timestamp (fail closed)', () => {
    const active = computeEntitlementActive(
      input({ subscriptionTier: 'pro', subscriptionEndsAt: 'not-a-timestamp' }),
      NOW,
    );
    expect(active).toBe(false);
  });

  it('does not let a Stripe customer id confer access', () => {
    const active = computeEntitlementActive(
      input({ subscriptionTier: 'pro', stripeSubscriptionId: null, subscriptionEndsAt: null }),
      NOW,
    );
    expect(active).toBe(false);
  });
});