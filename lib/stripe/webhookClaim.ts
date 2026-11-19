/**
 * Lease-based claiming for Stripe webhook events.
 *
 * The webhook route claims an event by inserting it with status
 * 'processing'. If the process dies mid-handler, the row would strand in
 * 'processing' forever: Stripe's retry sees 'processing', acknowledges it
 * as a duplicate, and stops retrying — a paid checkout is never provisioned.
 * The lease bounds that claim: an in-flight row is only honored while its
 * lease is fresh, and an expired claim is re-claimed by a conditional
 * update on Stripe's next retry.
 */

export const WEBHOOK_LEASE_MINUTES = 5;

export type WebhookClaimDecision = 'insert' | 'duplicate' | 'reclaim';

/**
 * Pure decision: what should this request do with the event, given the
 * existing event row (or null) and whether its lease has expired? Rows with
 * no lease value count as expired so pre-lease stranded rows self-heal.
 */
export function decideWebhookClaim(
  existing: { status: string; leaseExpired: boolean } | null,
): WebhookClaimDecision {
  if (!existing) return 'insert';

  if (existing.status === 'processing' && !existing.leaseExpired) {
    return 'duplicate';
  }
  if (isTerminalStatus(existing.status)) {
    // 'processed' and 'skipped' are terminal outcomes.
    return 'duplicate';
  }
  if (
    existing.status === 'processing' ||
    existing.status === 'failed' ||
    existing.status === 'pending'
  ) {
    // 'pending' is a legacy status from earlier claim code — reclaimable so
    // those rows self-heal instead of being acknowledged forever.
    return 'reclaim';
  }
  // Unknown statuses are unreachable (CHECK-constrained) but fail closed.
  return 'duplicate';
}

export function claimLeaseUntil(now: Date = new Date()): Date {
  return new Date(now.getTime() + WEBHOOK_LEASE_MINUTES * 60 * 1000);
}

export function isLeaseExpired(leaseExpiresAt: string | null | undefined, now: Date): boolean {
  if (!leaseExpiresAt) return true;
  return new Date(leaseExpiresAt).getTime() <= now.getTime();
}

/** Pure: does this recorded status have a live claim that must not be re-claimed? */
export function isTerminalStatus(status: string): boolean {
  return status === 'processed' || status === 'skipped';
}
