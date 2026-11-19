import { describe, it, expect } from '@jest/globals';
import {
  deriveTrialAccountState,
  isPortalEligible,
  TRIAL_CANCELED_NOTE,
} from '@/lib/subscription/trialState';

describe('deriveTrialAccountState', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const NOW = new Date('2026-09-10T12:00:00Z');
  const activeTrialEndsAt = new Date(NOW.getTime() + 12 * DAY_MS).toISOString();
  const expiredTrialEndsAt = new Date(NOW.getTime() - 2 * DAY_MS).toISOString();

  it('classifies an active trial: tier pro, no Stripe subscription, ends in the future', () => {
    const state = deriveTrialAccountState(
      {
        tier: 'pro',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionEndsAt: activeTrialEndsAt,
        trialCanceledAt: null,
      },
      NOW,
    );
    expect(state.kind).toBe('trial_active');
    expect(state.trialEndsAt).toBe(activeTrialEndsAt);
    if (state.kind === 'trial_active') {
      expect(state.daysRemaining).toBe(12);
    }
  });

  it('classifies a canceled trial: intent recorded, Pro preserved through trial_ends_at', () => {
    const canceledAt = new Date(NOW.getTime() - 1 * DAY_MS).toISOString();
    const state = deriveTrialAccountState(
      {
        tier: 'pro',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionEndsAt: activeTrialEndsAt,
        trialCanceledAt: canceledAt,
      },
      NOW,
    );
    expect(state.kind).toBe('trial_canceled');
    expect(state.trialEndsAt).toBe(activeTrialEndsAt);
    if (state.kind === 'trial_canceled') {
      expect(state.daysRemaining).toBe(12);
    }
  });

  it('classifies an expired trial even when the cron has not yet downgraded the profile', () => {
    const state = deriveTrialAccountState(
      {
        tier: 'pro',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionEndsAt: expiredTrialEndsAt,
        trialCanceledAt: null,
      },
      NOW,
    );
    expect(state.kind).toBe('trial_expired');
  });

  it('classifies a paid subscription by the Stripe subscription id, not the customer id', () => {
    const state = deriveTrialAccountState(
      {
        tier: 'pro',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_789',
        subscriptionEndsAt: null,
        trialCanceledAt: null,
      },
      NOW,
    );
    expect(state.kind).toBe('paid');
  });

  it('a Stripe customer id alone does NOT make the account paid', () => {
    const state = deriveTrialAccountState(
      {
        tier: 'pro',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: null,
        subscriptionEndsAt: activeTrialEndsAt,
        trialCanceledAt: null,
      },
      NOW,
    );
    expect(state.kind).toBe('trial_active');
  });

  it('classifies free accounts', () => {
    const state = deriveTrialAccountState(
      {
        tier: 'free',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionEndsAt: null,
        trialCanceledAt: null,
      },
      NOW,
    );
    expect(state.kind).toBe('free');
  });

  it('Pro with no endsAt and no Stripe sub (comped/data-drift shape) is trial_expired, not trial_active', () => {
    // provisionFreeTrial always sets subscription_ends_at, so this shape is
    // never a real active trial. It must NOT render cancel-trial UI.
    const state = deriveTrialAccountState(
      {
        tier: 'pro',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionEndsAt: null,
        trialCanceledAt: null,
      },
      NOW,
    );
    expect(state.kind).toBe('trial_expired');
  });

  it('canceled trial with no endsAt is trial_expired (nothing left to preserve)', () => {
    const state = deriveTrialAccountState(
      {
        tier: 'pro',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionEndsAt: null,
        trialCanceledAt: new Date(NOW.getTime() - 1000).toISOString(),
      },
      NOW,
    );
    expect(state.kind).toBe('trial_expired');
  });
});

describe('isPortalEligible', () => {
  it('paid subscriber with active Stripe subscription is eligible', () => {
    expect(
      isPortalEligible({
        tier: 'pro',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_789',
      }),
    ).toBe(true);
  });

  it('trial-only user with a Stripe customer ID but no subscription is NOT eligible', () => {
    expect(
      isPortalEligible({
        tier: 'pro',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: null,
      }),
    ).toBe(false);
  });

  it('user with neither customer nor subscription is NOT eligible', () => {
    expect(
      isPortalEligible({
        tier: 'pro',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      }),
    ).toBe(false);
  });

  it('free-tier user with a leftover subscription id is NOT eligible', () => {
    expect(
      isPortalEligible({
        tier: 'free',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_789',
      }),
    ).toBe(false);
  });
});

describe('TRIAL_CANCELED_NOTE', () => {
  it('mentions the TruckFull-managed trial and cancellation', () => {
    expect(TRIAL_CANCELED_NOTE).toMatch(/TruckFull-managed trial canceled/);
  });
});
