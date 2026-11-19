import { describe, it, expect } from '@jest/globals';
import { computeEntitlementActive, decideOwnerAccess } from '@/lib/auth/ownerAccess';

const NOW = new Date('2026-09-10T12:00:00Z');

describe('decideOwnerAccess', () => {
  it('allows by admin role regardless of entitlement', () => {
    const decision = decideOwnerAccess('admin', false);
    expect(decision).toEqual({ allowed: true, reason: 'admin' });
  });

  it('allows by owner role regardless of entitlement', () => {
    const decision = decideOwnerAccess('food_truck_owner', false);
    expect(decision).toEqual({ allowed: true, reason: 'owner_role' });
  });

  it('allows by entitlement for a customer role', () => {
    const decision = decideOwnerAccess('customer', true);
    expect(decision).toEqual({ allowed: true, reason: 'entitlement' });
  });

  it('denies a customer with no entitlement', () => {
    const decision = decideOwnerAccess('customer', false);
    expect(decision).toEqual({ allowed: false, reason: 'no_access' });
  });

  it('denies a null role with no entitlement', () => {
    const decision = decideOwnerAccess(null, false);
    expect(decision).toEqual({ allowed: false, reason: 'no_access' });
  });

  it('keeps roles and entitlements distinct — entitlement never impersonates a role', () => {
    const decision = decideOwnerAccess('customer', true);
    expect(decision.allowed && decision.reason).toBe('entitlement');
  });
});

describe('computeEntitlementActive regression guard', () => {
  it('raw enterprise tier stays active even though getEffectiveTier collapses it to pro', () => {
    const enterpriseNoDates = computeEntitlementActive(
      {
        subscriptionTier: 'enterprise',
        stripeSubscriptionId: null,
        subscriptionEndsAt: null,
      },
      NOW,
    );
    expect(enterpriseNoDates).toBe(true);
  });
});