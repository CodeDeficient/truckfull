import { describe, expect, it } from '@jest/globals';
import {
  type CanonicalSubscription,
  type ProfileBillingState,
  computeSubscriptionProfileUpdate,
  deriveTrialSurvival,
} from '@/lib/stripe/subscriptionReconcile';

function sub(overrides: Partial<CanonicalSubscription> = {}): CanonicalSubscription {
  return {
    id: 'sub_1',
    customerId: 'cus_1',
    status: 'active',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    tier: 'pro',
    ...overrides,
  };
}

function profile(overrides: Partial<ProfileBillingState> = {}): ProfileBillingState {
  return {
    subscriptionTier: 'free',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialGrant: null,
    ...overrides,
  };
}

describe('deriveTrialSurvival', () => {
  const now = new Date('2026-09-03T12:00:00Z');

  it('reports pro with the trial end date while the trial is live', () => {
    expect(deriveTrialSurvival('2026-09-02T12:00:00Z', now, 30)).toStrictEqual({
      survives: true,
      tier: 'pro',
      endsAt: '2026-10-02T12:00:00.000Z',
    });
  });

  it('reports dead when the trial has lapsed', () => {
    expect(deriveTrialSurvival('2026-08-01T12:00:00Z', now, 30)).toStrictEqual({
      survives: false,
      tier: 'free',
      endsAt: null,
    });
  });

  it('reports dead with no trial grant', () => {
    expect(deriveTrialSurvival(null, now, 30)).toStrictEqual({
      survives: false,
      tier: 'free',
      endsAt: null,
    });
  });
});

describe('computeSubscriptionProfileUpdate', () => {
  it('binds and grants pro for an active subscription', () => {
    const update = computeSubscriptionProfileUpdate(
      sub(),
      profile({ trialGrant: null }),
      new Date('2026-09-03T12:00:00Z'),
    );
    expect(update).toStrictEqual({
      subscription_tier: 'pro',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      subscription_ends_at: null,
    });
  });

  it('an active subscription with scheduled cancellation shows its period end', () => {
    const update = computeSubscriptionProfileUpdate(
      sub({
        cancelAtPeriodEnd: true,
        currentPeriodEnd: '2026-10-03T12:00:00.000Z',
      }),
      profile({ trialGrant: null }),
      new Date('2026-09-03T12:00:00Z'),
    );
    expect(update).toMatchObject({
      subscription_tier: 'pro',
      subscription_ends_at: '2026-10-03T12:00:00.000Z',
    });
  });

  it('rebinds identity for past_due but grants nothing', () => {
    const update = computeSubscriptionProfileUpdate(
      sub({ status: 'past_due' }),
      profile({ subscriptionTier: 'pro', trialGrant: null }),
      new Date(),
    );
    expect(update).toStrictEqual({
      subscription_tier: 'free',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      subscription_ends_at: null,
    });
  });

  it('a canceled subscription releases the binding entirely', () => {
    const update = computeSubscriptionProfileUpdate(
      sub({ status: 'canceled' }),
      profile({ subscriptionTier: 'pro', trialGrant: null }),
      new Date(),
    );
    expect(update).toStrictEqual({
      subscription_tier: 'free',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_ends_at: update?.subscription_ends_at,
    });
    expect(update?.subscription_ends_at).toBeTruthy();
  });

  it('a live trial survives revocation and stays pro until the trial ends', () => {
    const now = new Date('2026-09-03T12:00:00Z');
    const update = computeSubscriptionProfileUpdate(
      sub({ status: 'paused' }),
      profile({ subscriptionTier: 'pro', trialGrant: '2026-09-02T12:00:00Z' }),
      now,
    );
    expect(update).toMatchObject({
      subscription_tier: 'pro',
      subscription_ends_at: '2026-10-02T12:00:00.000Z',
    });
  });

  it('no live trial and no subscription resolves to free', () => {
    const update = computeSubscriptionProfileUpdate(
      sub({ status: 'canceled' }),
      profile({ trialGrant: null }),
      new Date(),
    );
    expect(update?.subscription_tier).toBe('free');
  });

  it('only keeps an earlier trial end date when reconciling over it', () => {
    const update = computeSubscriptionProfileUpdate(
      sub({ status: 'canceled' }),
      profile({ subscriptionTier: 'pro', trialGrant: '2026-09-02T12:00:00Z' }),
      new Date('2026-09-03T12:00:00Z'),
    );
    // Trial survives the revocation, but does not get extended.
    expect(update?.subscription_tier).toBe('pro');
    expect(update?.subscription_ends_at).toBe('2026-10-02T12:00:00.000Z');
  });

  it('reconciliation is idempotent: same inputs, same output', () => {
    const now = new Date('2026-09-03T12:00:00Z');
    const first = computeSubscriptionProfileUpdate(sub({ status: 'active' }), profile(), now);
    const second = computeSubscriptionProfileUpdate(sub({ status: 'active' }), profile(), now);
    expect(first).toStrictEqual(second);
  });
});
