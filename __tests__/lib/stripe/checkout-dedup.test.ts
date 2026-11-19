import { describe, expect, it } from '@jest/globals';
import {
  decideExistingSubscription,
  resolveCheckoutDedup,
  type CheckoutDedupOutcome,
} from '@/lib/stripe/checkout';

describe('decideExistingSubscription', () => {
  it.each(['active', 'trialing', 'past_due', 'unpaid', 'paused'])(
    'blocks checkout while subscription status is %s',
    (status) => {
      expect(decideExistingSubscription(status)).toBe('block');
    },
  );

  it.each(['canceled', 'incomplete', 'incomplete_expired'])(
    'allows re-checkout after subscription status is %s',
    (status) => {
      expect(decideExistingSubscription(status)).toBe('allow');
    },
  );

  it('fails closed on an unknown status', () => {
    expect(decideExistingSubscription('something_new')).toBe('unverifiable');
  });
});

describe('resolveCheckoutDedup', () => {
  function fakeDeps(
    state: { stripeCustomerId: string | null; stripeSubscriptionId: string | null },
    statusById: Record<string, string> = {},
  ): Parameters<typeof resolveCheckoutDedup>[0] {
    return {
      getBillingState: async () => state,
      getSubscriptionStatus: async (subscriptionId: string) => {
        const status = statusById[subscriptionId];
        if (status === undefined) throw new Error('stripe unavailable');
        return status;
      },
    };
  }

  it('allows a first-time checkout with no subscription on record', async () => {
    const outcome = await resolveCheckoutDedup(
      fakeDeps({ stripeCustomerId: null, stripeSubscriptionId: null }),
    );
    expect(outcome).toStrictEqual({ allowed: true, customerId: null });
  });

  it('reuses the stored Stripe customer id when present', async () => {
    const outcome = await resolveCheckoutDedup(
      fakeDeps({ stripeCustomerId: 'cus_existing', stripeSubscriptionId: null }),
    );
    expect(outcome).toStrictEqual({ allowed: true, customerId: 'cus_existing' });
  });

  it('blocks checkout while the recorded subscription is live', async () => {
    for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'paused']) {
      const outcome: CheckoutDedupOutcome = await resolveCheckoutDedup(
        fakeDeps({ stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1' }, { sub_1: status }),
      );
      expect(outcome).toStrictEqual({ allowed: false, reason: 'already_subscribed' });
    }
  });

  it('allows re-checkout when the recorded subscription is dead', async () => {
    for (const status of ['canceled', 'incomplete', 'incomplete_expired']) {
      const outcome: CheckoutDedupOutcome = await resolveCheckoutDedup(
        fakeDeps({ stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1' }, { sub_1: status }),
      );
      expect(outcome).toStrictEqual({ allowed: true, customerId: 'cus_1' });
    }
  });

  it('fails closed when Stripe verification throws', async () => {
    const outcome = await resolveCheckoutDedup(
      fakeDeps({ stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1' }),
    );
    expect(outcome).toStrictEqual({ allowed: false, reason: 'verification_unavailable' });
  });

  it('fails closed on an unknown Stripe status', async () => {
    const outcome = await resolveCheckoutDedup(
      fakeDeps(
        { stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1' },
        { sub_1: 'mystery_status' },
      ),
    );
    expect(outcome).toStrictEqual({ allowed: false, reason: 'verification_unavailable' });
  });
});
