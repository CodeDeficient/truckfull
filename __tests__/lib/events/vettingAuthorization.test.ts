import { describe, expect, it } from '@jest/globals';
import {
  canVetEvent,
  type EventOwnership,
  type VettingCaller,
} from '@/lib/events/vettingAuthorization';

const USER_ID = 'user-11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = 'user-22222222-2222-4222-8222-222222222222';

function caller(overrides: Partial<VettingCaller> = {}): VettingCaller {
  return {
    userId: USER_ID,
    role: 'food_truck_owner',
    hasOwnerAccess: true,
    ...overrides,
  };
}

function eventfull(organizerUserId: string | null): EventOwnership {
  return { source: 'eventfull', organizerUserId, submittedBy: null };
}

function external(submittedBy: string | null): EventOwnership {
  return { source: 'external', organizerUserId: null, submittedBy };
}

describe('canVetEvent', () => {
  it('allows the organizer of an eventfull event', () => {
    expect(canVetEvent(caller(), eventfull(USER_ID))).toBe(true);
  });

  it('allows the submitter of an external event', () => {
    expect(canVetEvent(caller(), external(USER_ID))).toBe(true);
  });

  it('denies a non-owner of an eventfull event', () => {
    expect(canVetEvent(caller(), eventfull(OTHER_USER_ID))).toBe(false);
  });

  it('denies a non-owner of an external event', () => {
    expect(canVetEvent(caller(), external(OTHER_USER_ID))).toBe(false);
  });

  it('denies an unowned ingested external event', () => {
    expect(canVetEvent(caller(), external(null))).toBe(false);
  });

  it('denies an eventfull event with no organizer user', () => {
    expect(canVetEvent(caller(), eventfull(null))).toBe(false);
  });

  it('denies an owner who lacks owner-tools entitlement', () => {
    expect(canVetEvent(caller({ hasOwnerAccess: false }), eventfull(USER_ID))).toBe(false);
  });

  it('denies an unentitled non-owner', () => {
    expect(canVetEvent(caller({ hasOwnerAccess: false }), external(OTHER_USER_ID))).toBe(false);
  });

  it('allows an admin to vet an event they do not own', () => {
    expect(canVetEvent(caller({ role: 'admin' }), eventfull(OTHER_USER_ID))).toBe(true);
  });

  it('allows an admin to vet an unowned external event', () => {
    expect(canVetEvent(caller({ role: 'admin' }), external(null))).toBe(true);
  });

  it('allows a superadmin to vet an event they do not own', () => {
    expect(canVetEvent(caller({ role: 'superadmin' }), external(OTHER_USER_ID))).toBe(true);
  });

  it('still denies an unentitled admin', () => {
    expect(
      canVetEvent(caller({ role: 'admin', hasOwnerAccess: false }), eventfull(OTHER_USER_ID)),
    ).toBe(false);
  });
});
