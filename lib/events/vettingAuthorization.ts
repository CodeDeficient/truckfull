import type { EventSource } from './eventVetting';

/**
 * The caller attempting to force re-vetting. `hasOwnerAccess` is the result of
 * the existing owner-tools entitlement gate (`verifyOwnerAccessFromCookies`):
 * an active entitlement or an owner/admin role. It stays a precondition so
 * entitlement and ownership remain separate, additive checks.
 */
export interface VettingCaller {
  readonly userId: string;
  readonly role: string;
  readonly hasOwnerAccess: boolean;
}

/**
 * The ownership identity of the target event, resolved from the database.
 * - eventfull events: `organizerUserId` is the event organizer's `user_id`.
 * - external events: `submittedBy` is the community submitter, or null for
 *   events ingested from city/permit sources (which have no owner).
 */
export interface EventOwnership {
  readonly source: EventSource;
  readonly organizerUserId: string | null;
  readonly submittedBy: string | null;
}

/**
 * Pure: may this caller force re-vetting of this event?
 *
 * Re-vetting clears shared caches and runs a paid vetting operation, so it is
 * bound to the event rather than to entitlement alone. Admins (and superadmins)
 * may vet any event; everyone else may only vet an event they own — an
 * eventfull event they organize, or an external event they submitted. Unowned
 * ingested events and events owned by another user are denied.
 */
export function canVetEvent(caller: VettingCaller, event: EventOwnership): boolean {
  if (!caller.hasOwnerAccess) return false;
  if (caller.role === 'admin' || caller.role === 'superadmin') return true;

  if (event.source === 'eventfull') {
    return event.organizerUserId !== null && event.organizerUserId === caller.userId;
  }

  return event.submittedBy !== null && event.submittedBy === caller.userId;
}
