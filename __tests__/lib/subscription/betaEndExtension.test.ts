import { describe, it, expect } from '@jest/globals';

/**
 * Pure-logic tests for the beta-end bridge extension migration's predicate
 * and payload semantics. The SQL itself is exercised against staging inside
 * a rolled-back transaction (see PR validation); these tests pin the
 * constants and the note-marker contract that other systems depend on.
 */

import { TRIAL_NOTE_PREFIX } from '@/lib/subscription/trialProvisioning';

const BETA_CUTOFF = '2026-09-01T00:00:00Z';
const BETA_DEADLINE = '2026-10-08T03:59:59Z';
const BETA_MARKER = 'Beta participation extension: Pro access through 2026-10-07';

describe('beta-end bridge extension constants', () => {
  it('uses the approved fixed UTC deadline', () => {
    const deadline = new Date(BETA_DEADLINE);
    expect(deadline.toISOString()).toBe('2026-10-08T03:59:59.000Z');
  });

  it('uses a beta cutoff that postdates every beta claim', () => {
    // Last beta claim in production was 2026-08-07; cutoff must exclude nothing.
    const cutoff = new Date(BETA_CUTOFF);
    const lastBetaClaim = new Date('2026-08-07T14:37:45Z');
    expect(cutoff.getTime()).toBeGreaterThan(lastBetaClaim.getTime());
  });

  it('marker does not match the trial-provisioning prefix (cooldown isolation)', () => {
    expect(BETA_MARKER.startsWith(TRIAL_NOTE_PREFIX)).toBe(false);
    // The cooldown matcher is a prefix match on TRIAL_NOTE_PREFIX.
    expect(BETA_MARKER.toLowerCase().includes('30-day free trial provisioned')).toBe(false);
  });

  it('marker records the deadline in human-readable form', () => {
    expect(BETA_MARKER).toContain('2026-10-07');
  });
});

describe('beta extension end-date semantics', () => {
  // Mirrors the SQL: GREATEST(existing, deadline)
  const resolveEndsAt = (existing: string | null): string => {
    const DEADLINE = new Date(BETA_DEADLINE).getTime();
    if (existing === null) return new Date(BETA_DEADLINE).toISOString();
    return new Date(Math.max(new Date(existing).getTime(), DEADLINE)).toISOString();
  };

  const shouldUpdate = (existing: string | null): boolean => {
    if (existing === null) return true;
    return new Date(existing).getTime() < new Date(BETA_DEADLINE).getTime();
  };

  it('null end date resolves to the deadline and is updated', () => {
    expect(shouldUpdate(null)).toBe(true);
    expect(resolveEndsAt(null)).toBe('2026-10-08T03:59:59.000Z');
  });

  it('end date before the deadline is raised to the deadline', () => {
    expect(shouldUpdate('2026-08-10T19:16:23Z')).toBe(true);
    expect(resolveEndsAt('2026-08-10T19:16:23Z')).toBe('2026-10-08T03:59:59.000Z');
  });

  it('end date after the deadline is preserved', () => {
    expect(shouldUpdate('2026-12-01T00:00:00Z')).toBe(false);
    expect(resolveEndsAt('2026-12-01T00:00:00Z')).toBe('2026-12-01T00:00:00.000Z');
  });

  it('an account already at the deadline is a replay no-op', () => {
    expect(shouldUpdate(BETA_DEADLINE)).toBe(false);
  });

  it('deadline is 04:00 UTC minus one second — before the 04:00 cron fires', () => {
    // The cron runs at 04:00 UTC daily; the deadline must expire accounts
    // before the first cron run of October 8 can downgrade them.
    const deadline = new Date(BETA_DEADLINE);
    expect(deadline.getUTCHours()).toBe(3);
    expect(deadline.getUTCMinutes()).toBe(59);
  });
});
