import { describe, it, expect } from '@jest/globals';
import {
  evaluateTrialCancellation,
  buildTrialCancelMarkerInsert,
  CANCEL_TRIAL_ERRORS,
} from '@/lib/subscription/trialState';

describe('evaluateTrialCancellation', () => {
  it('approves canceling an active trial', () => {
    const result = evaluateTrialCancellation({
      kind: 'trial_active',
      trialEndsAt: '2026-09-22T12:00:00Z',
      daysRemaining: 12,
    });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.trialEndsAt).toBe('2026-09-22T12:00:00Z');
      expect(result.userMessage).toMatch(/keep.*Pro access until/i);
      expect(result.userMessage).toMatch(/not be charged/i);
    }
  });

  it('rejects canceling an already-canceled trial', () => {
    const result = evaluateTrialCancellation({
      kind: 'trial_canceled',
      trialEndsAt: '2026-09-22T12:00:00Z',
      daysRemaining: 12,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.error).toBe(CANCEL_TRIAL_ERRORS.ALREADY_CANCELED);
    }
  });

  it('rejects canceling an expired trial', () => {
    const result = evaluateTrialCancellation({
      kind: 'trial_expired',
      trialEndsAt: '2026-09-08T12:00:00Z',
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.error).toBe(CANCEL_TRIAL_ERRORS.NOT_ACTIVE);
    }
  });

  it('rejects canceling a paid subscription via the trial-cancel path', () => {
    const result = evaluateTrialCancellation({
      kind: 'paid',
      stripeSubscriptionId: 'sub_789',
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.error).toBe(CANCEL_TRIAL_ERRORS.NOT_ACTIVE);
    }
  });

  it('rejects canceling for free accounts', () => {
    const result = evaluateTrialCancellation({ kind: 'free' });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.error).toBe(CANCEL_TRIAL_ERRORS.NOT_ACTIVE);
    }
  });
});

describe('buildTrialCancelMarkerInsert', () => {
  it('builds a history marker preserving pro through trial_ends_at', () => {
    const insert = buildTrialCancelMarkerInsert('user-1', '2026-09-22T12:00:00Z');
    expect(insert).toMatchObject({
      user_id: 'user-1',
      from_tier: 'pro',
      to_tier: 'pro',
      notes: expect.stringMatching(/TruckFull-managed trial canceled/),
    });
  });
});
