import { describe, expect, it } from '@jest/globals';
import {
  WEBHOOK_LEASE_MINUTES,
  claimLeaseUntil,
  decideWebhookClaim,
  isLeaseExpired,
} from '@/lib/stripe/webhookClaim';

describe('decideWebhookClaim', () => {
  it('claims a brand-new event by inserting', () => {
    expect(decideWebhookClaim(null)).toBe('insert');
  });

  it('acknowledges already-processed events as duplicates', () => {
    expect(decideWebhookClaim({ status: 'processed', leaseExpired: false })).toBe('duplicate');
    expect(decideWebhookClaim({ status: 'processed', leaseExpired: true })).toBe('duplicate');
  });

  it('acknowledges skipped events as duplicates', () => {
    expect(decideWebhookClaim({ status: 'skipped', leaseExpired: false })).toBe('duplicate');
  });

  it('acknowledges an in-flight claim whose lease is still fresh', () => {
    expect(decideWebhookClaim({ status: 'processing', leaseExpired: false })).toBe('duplicate');
  });

  it('re-claims a processing event whose lease has expired', () => {
    expect(decideWebhookClaim({ status: 'processing', leaseExpired: true })).toBe('reclaim');
  });

  it('re-claims failed events for retry', () => {
    expect(decideWebhookClaim({ status: 'failed', leaseExpired: false })).toBe('reclaim');
    expect(decideWebhookClaim({ status: 'failed', leaseExpired: true })).toBe('reclaim');
  });

  it('re-claims legacy pending rows so they self-heal', () => {
    expect(decideWebhookClaim({ status: 'pending', leaseExpired: false })).toBe('reclaim');
    expect(decideWebhookClaim({ status: 'pending', leaseExpired: true })).toBe('reclaim');
  });

  it('fails closed (duplicate) on unknown statuses', () => {
    expect(decideWebhookClaim({ status: 'mystery', leaseExpired: false })).toBe('duplicate');
  });
});

describe('isLeaseExpired', () => {
  it('treats a missing lease value as expired (pre-lease stranded rows)', () => {
    expect(isLeaseExpired(null, new Date())).toBe(true);
    expect(isLeaseExpired(undefined, new Date())).toBe(true);
  });

  it('expires a past lease and honors a fresh one', () => {
    const now = new Date('2026-09-03T12:00:00Z');
    expect(isLeaseExpired('2026-09-03T11:59:59Z', now)).toBe(true);
    expect(isLeaseExpired('2026-09-03T12:00:00Z', now)).toBe(true);
    expect(isLeaseExpired('2026-09-03T12:00:01Z', now)).toBe(false);
  });
});

describe('claimLeaseUntil', () => {
  it('extends the lease by the configured lease window', () => {
    const start = new Date('2026-09-03T12:00:00Z');
    const until = claimLeaseUntil(start);
    expect(until.getTime() - start.getTime()).toBe(WEBHOOK_LEASE_MINUTES * 60 * 1000);
  });

  it('defaults to the current time', () => {
    const before = Date.now();
    const until = claimLeaseUntil();
    expect(until.getTime()).toBeGreaterThanOrEqual(before + WEBHOOK_LEASE_MINUTES * 60 * 1000);
  });
});
