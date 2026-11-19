import { describe, it, expect } from '@jest/globals';
import {
  TRIAL_NOTE_PREFIX,
  calculateTrialEndDate,
  shouldProvisionTrial,
  buildTrialUpdatePayload,
  buildTrialHistoryInsert,
  evaluateTrialEligibility,
  resolveTrialEligibility,
  hasAlreadyHadTrial,
} from '@/lib/subscription/trialProvisioning';

describe('calculateTrialEndDate', () => {
  it('should return a date 30 days in the future', () => {
    const result = calculateTrialEndDate();
    const now = new Date();
    const diffMs = result.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });
});

describe('hasAlreadyHadTrial', () => {
  it('should return true when a trial exists within the last 12 months', () => {
    const recent = new Date();
    recent.setMonth(recent.getMonth() - 1);
    const rows = [{ changed_at: recent.toISOString() }];
    expect(hasAlreadyHadTrial(rows, new Date())).toBe(true);
  });

  it('should return false when a trial exists but is older than 12 months', () => {
    const old = new Date();
    old.setMonth(old.getMonth() - 13);
    const rows = [{ changed_at: old.toISOString() }];
    expect(hasAlreadyHadTrial(rows, new Date())).toBe(false);
  });

  it('should return false when history is empty', () => {
    expect(hasAlreadyHadTrial([], new Date())).toBe(false);
  });

  it('should return false when trial is older than 12 months', () => {
    const old = new Date();
    old.setMonth(old.getMonth() - 12);
    old.setDate(old.getDate() - 1);
    const rows = [{ changed_at: old.toISOString() }];
    expect(hasAlreadyHadTrial(rows, new Date())).toBe(false);
  });
});

describe('shouldProvisionTrial', () => {
  it('should return true for free user with no subscription_ends_at', () => {
    expect(shouldProvisionTrial('free', null)).toBe(true);
  });

  it('should return true for free user with undefined subscription_ends_at', () => {
    expect(shouldProvisionTrial('free', undefined)).toBe(true);
  });

  it('should return true for free user with expired subscription_ends_at', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(shouldProvisionTrial('free', past.toISOString())).toBe(true);
  });

  it('should return false for free user with active subscription_ends_at', () => {
    const future = new Date();
    future.setDate(future.getDate() + 1);
    expect(shouldProvisionTrial('free', future.toISOString())).toBe(false);
  });

  it('should return false for pro user', () => {
    expect(shouldProvisionTrial('pro', null)).toBe(false);
  });

  it('should return false for enterprise user', () => {
    expect(shouldProvisionTrial('enterprise', null)).toBe(false);
  });

  it('should return false for null tier', () => {
    expect(shouldProvisionTrial(null, null)).toBe(false);
  });

  it('should return false for undefined tier', () => {
    expect(shouldProvisionTrial(undefined, null)).toBe(false);
  });
});

describe('buildTrialUpdatePayload', () => {
  it('should return correct payload structure', () => {
    const endsAt = new Date('2026-08-08T12:00:00Z');
    const result = buildTrialUpdatePayload(endsAt);

    expect(result.subscription_tier).toBe('pro');
    expect(result.subscription_ends_at).toBe('2026-08-08T12:00:00.000Z');
    expect(result.subscription_started_at).toBeDefined();
    expect(typeof result.subscription_started_at).toBe('string');
  });
});

describe('buildTrialHistoryInsert', () => {
  it('should return correct payload with the pricing source in the note', () => {
    const result = buildTrialHistoryInsert('user-123', 'pricing');

    expect(result).toEqual({
      user_id: 'user-123',
      from_tier: 'free',
      to_tier: 'pro',
      notes: '30-day free trial provisioned via pricing',
    });
  });

  it('records the truck-claim note for claim-sourced trials', () => {
    const result = buildTrialHistoryInsert('user-123', 'claim');

    expect(result.notes).toBe('30-day free trial provisioned on truck claim');
  });

  it('matches the canonical trial-note prefix for every source', () => {
    for (const source of ['claim', 'verification_code', 'pricing'] as const) {
      expect(buildTrialHistoryInsert('user-123', source).notes).toMatch(
        TRIAL_NOTE_PREFIX,
      );
    }
  });
});

describe('evaluateTrialEligibility', () => {
  const now = new Date('2026-09-05T12:00:00.000Z');

  it.each(['pro', 'enterprise'] as const)(
    'returns the current %s entitlement so Pricing cannot offer another checkout',
    (currentTier) => {
      expect(
        evaluateTrialEligibility(
          {
            subscriptionTier: currentTier,
            stripeSubscriptionId: currentTier === 'pro' ? 'sub_active' : null,
            subscriptionEndsAt: null,
            priorTrialRows: [],
          },
          now,
        ),
      ).toEqual({ eligible: false, reason: 'active_entitlement', currentTier });
    },
  );

  it('keeps a cooldown account eligible only for paid checkout', () => {
    expect(
      evaluateTrialEligibility(
        {
          subscriptionTier: 'free',
          priorTrialRows: [{ changed_at: '2026-08-05T12:00:00.000Z' }],
        },
        now,
      ),
    ).toEqual({ eligible: false, reason: 'cooldown' });
  });

  it('routes an expired Pro account to paid checkout instead of marking it current', () => {
    expect(
      evaluateTrialEligibility(
        {
          subscriptionTier: 'pro',
          stripeSubscriptionId: null,
          subscriptionEndsAt: '2026-09-04T12:00:00.000Z',
          priorTrialRows: [],
        },
        now,
      ),
    ).toEqual({ eligible: false, reason: 'inactive_entitlement' });
  });

  it('routes a deprecated starter tier to the unsupported state instead of offering a trial', () => {
    expect(
      evaluateTrialEligibility(
        { subscriptionTier: 'starter', priorTrialRows: [] },
        now,
      ),
    ).toEqual({ eligible: false, reason: 'unsupported_tier' });
  });
});

describe('resolveTrialEligibility', () => {
  const now = new Date('2026-09-05T12:00:00.000Z');

  it('fails closed when the profile row cannot be read', () => {
    expect(resolveTrialEligibility({ profile: null, priorTrialRows: [] }, now)).toBe('error');
  });

  it('evaluates the profile fields when the row is readable', () => {
    expect(
      resolveTrialEligibility(
        {
          profile: {
            subscription_tier: 'free',
            stripe_subscription_id: null,
            subscription_ends_at: null,
          },
          priorTrialRows: [],
        },
        now,
      ),
    ).toEqual({ eligible: true });
  });
});
