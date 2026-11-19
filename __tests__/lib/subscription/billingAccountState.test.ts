import { describe, it, expect } from '@jest/globals';
import {
  deriveBillingAccountState,
  hasActiveBillingAccount,
  type BillingAccountInput,
} from '@/lib/subscription/billingAccountState';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-10T12:00:00Z');
const futureEndsAt = new Date(NOW.getTime() + 10 * DAY_MS).toISOString();
const pastEndsAt = new Date(NOW.getTime() - 2 * DAY_MS).toISOString();

function input(overrides: Partial<BillingAccountInput>): BillingAccountInput {
  return {
    subscriptionTier: 'free',
    stripeSubscriptionId: null,
    subscriptionEndsAt: null,
    trialCanceledAt: null,
    ...overrides,
  };
}

describe('deriveBillingAccountState', () => {
  it('never-pro free user sees an owner-tools upgrade offer, not an error or expired message', () => {
    const state = deriveBillingAccountState(input({ subscriptionTier: 'free' }), NOW);
    expect(state.kind).toBe('never_pro');
  });

  it('active local trial shows remaining access', () => {
    const state = deriveBillingAccountState(
      input({ subscriptionTier: 'pro', subscriptionEndsAt: futureEndsAt }),
      NOW,
    );
    expect(state.kind).toBe('trial_active');
    if (state.kind === 'trial_active') {
      expect(state.daysRemaining).toBe(10);
      expect(state.trialEndsAt).toBe(futureEndsAt);
    }
  });

  it('canceled local trial retains access through the end date', () => {
    const canceledAt = new Date(NOW.getTime() - 1 * DAY_MS).toISOString();
    const state = deriveBillingAccountState(
      input({
        subscriptionTier: 'pro',
        subscriptionEndsAt: futureEndsAt,
        trialCanceledAt: canceledAt,
      }),
      NOW,
    );
    expect(state.kind).toBe('trial_canceled');
    if (state.kind === 'trial_canceled') {
      expect(state.trialEndsAt).toBe(futureEndsAt);
    }
  });

  it('expired local trial shows renewal state', () => {
    const state = deriveBillingAccountState(
      input({ subscriptionTier: 'pro', subscriptionEndsAt: pastEndsAt }),
      NOW,
    );
    expect(state.kind).toBe('trial_expired');
  });

  it('expired local trial after cron downgrade (free tier, past date) still shows renewal state', () => {
    const state = deriveBillingAccountState(
      input({ subscriptionTier: 'free', subscriptionEndsAt: pastEndsAt }),
      NOW,
    );
    expect(state.kind).toBe('trial_expired');
  });

  it('active Stripe subscriber is classified as paid', () => {
    const state = deriveBillingAccountState(
      input({ subscriptionTier: 'pro', stripeSubscriptionId: 'sub_123' }),
      NOW,
    );
    expect(state.kind).toBe('paid');
  });

  it('enterprise/comped user is active without Stripe identifiers or expiration', () => {
    const state = deriveBillingAccountState(input({ subscriptionTier: 'enterprise' }), NOW);
    expect(state.kind).toBe('enterprise');
  });
});

describe('hasActiveBillingAccount', () => {
  it('does not treat an expired raw Pro tier as a current plan', () => {
    expect(hasActiveBillingAccount({ kind: 'trial_expired', trialEndsAt: pastEndsAt })).toBe(
      false,
    );
  });

  it.each([
    { kind: 'enterprise' } as const,
    { kind: 'paid', stripeSubscriptionId: 'sub_active' } as const,
    { kind: 'trial_active', trialEndsAt: futureEndsAt, daysRemaining: 10 } as const,
    { kind: 'trial_canceled', trialEndsAt: futureEndsAt, daysRemaining: 10 } as const,
  ])('recognizes $kind as current', (state) => {
    expect(hasActiveBillingAccount(state)).toBe(true);
  });
});
