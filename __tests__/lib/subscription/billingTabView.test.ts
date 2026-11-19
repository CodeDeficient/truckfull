import { describe, it, expect } from '@jest/globals';
import {
  buildBillingTabView,
  shouldShowBillingHistory,
  BILLING_HISTORY_NOTE,
} from '@/lib/subscription/trialState';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-10T12:00:00Z');

describe('buildBillingTabView', () => {
  it('trial_active: shows status, expiry, cancel action, no Manage Billing, no billing history', () => {
    const view = buildBillingTabView({
      kind: 'trial_active',
      trialEndsAt: new Date(NOW.getTime() + 12 * DAY_MS).toISOString(),
      daysRemaining: 12,
    });
    expect(view.showTrialStatus).toBe(true);
    expect(view.trialStatusText).toMatch(/12 days remaining/i);
    expect(view.showCancelTrial).toBe(true);
    expect(view.showManageBilling).toBe(false);
    expect(view.showBillingHistory).toBe(false);
  });

  it('trial_canceled: shows status, no cancel action, no Manage Billing', () => {
    const view = buildBillingTabView({
      kind: 'trial_canceled',
      trialEndsAt: new Date(NOW.getTime() + 12 * DAY_MS).toISOString(),
      daysRemaining: 12,
    });
    expect(view.showTrialStatus).toBe(true);
    expect(view.trialStatusText).toMatch(/canceled/i);
    expect(view.trialStatusText).toMatch(/keep.*Pro/i);
    expect(view.showCancelTrial).toBe(false);
    expect(view.showManageBilling).toBe(false);
  });

  it('trial_expired: shows expired status, no cancel, no Manage Billing', () => {
    const view = buildBillingTabView({
      kind: 'trial_expired',
      trialEndsAt: '2026-09-08T12:00:00Z',
    });
    expect(view.showTrialStatus).toBe(true);
    expect(view.trialStatusText).toMatch(/ended|expired/i);
    expect(view.showCancelTrial).toBe(false);
    expect(view.showManageBilling).toBe(false);
  });

  it('paid: Manage Billing visible, no trial status, no cancel', () => {
    const view = buildBillingTabView({ kind: 'paid', stripeSubscriptionId: 'sub_789' });
    expect(view.showManageBilling).toBe(true);
    expect(view.showTrialStatus).toBe(false);
    expect(view.showCancelTrial).toBe(false);
    expect(view.showBillingHistory).toBe(true);
  });

  it('free: no trial UI at all', () => {
    const view = buildBillingTabView({ kind: 'free' });
    expect(view.showTrialStatus).toBe(false);
    expect(view.showCancelTrial).toBe(false);
    expect(view.showManageBilling).toBe(false);
    expect(view.showBillingHistory).toBe(false);
  });
});

describe('billing history honesty (#1302)', () => {
  it('paid: billing history card is shown', () => {
    const view = buildBillingTabView({ kind: 'paid', stripeSubscriptionId: 'sub_789' });
    expect(shouldShowBillingHistory(view)).toBe(true);
  });

  it('trial states: billing history card is never shown', () => {
    for (const state of [
      {
        kind: 'trial_active' as const,
        trialEndsAt: new Date(NOW.getTime() + 12 * DAY_MS).toISOString(),
        daysRemaining: 12,
      },
      {
        kind: 'trial_canceled' as const,
        trialEndsAt: new Date(NOW.getTime() + 12 * DAY_MS).toISOString(),
        daysRemaining: 12,
      },
      { kind: 'trial_expired' as const, trialEndsAt: '2026-09-08T12:00:00Z' },
    ]) {
      expect(shouldShowBillingHistory(buildBillingTabView(state))).toBe(false);
    }
  });

  it('free: billing history card is never shown', () => {
    expect(shouldShowBillingHistory(buildBillingTabView({ kind: 'free' }))).toBe(false);
  });

  it('loading (null) and error degrade: billing history card is never shown', () => {
    expect(shouldShowBillingHistory(null)).toBe(false);
    expect(shouldShowBillingHistory('error')).toBe(false);
  });

  it('note directs paid subscribers to Manage Billing instead of fabricated invoices', () => {
    expect(BILLING_HISTORY_NOTE).toMatch(/Manage Billing/);
    expect(BILLING_HISTORY_NOTE).toMatch(/isn't available/);
  });
});
