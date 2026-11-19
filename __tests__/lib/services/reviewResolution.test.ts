import { describe, expect, it } from '@jest/globals';
import {
  validateReviewResolution,
  canResolve,
  mergeProposalWithResolution,
  type ReviewResolutionInput,
  type ReviewProposalLike,
} from '@/lib/services/reviewResolution';
import type { ReviewProposal } from '@/lib/services/reviewProposal';

const DATED_PROPOSAL: ReviewProposalLike = {
  reviewAction: 'missing_location',
  serviceScope: 'one_off_date',
  serviceDate: '2026-08-25',
  times: { start: '11:00', end: '14:00', dateReference: 'today', scope: 'one_off_date' },
} as ReviewProposalLike;

const RECURRING_PROPOSAL: ReviewProposalLike = {
  reviewAction: 'missing_location',
  serviceScope: 'recurring',
  times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'recurring_weekly' },
} as ReviewProposalLike;

const SCHEDULE_UNRESOLVED_PROPOSAL: ReviewProposalLike = {
  reviewAction: 'unresolved_schedule',
  serviceScope: 'unresolved_schedule',
  times: { start: '11:00', dateReferences: ['this Friday', 'today'], scope: 'one_off_date' },
  unresolvedReason: 'Date references resolve to conflicting service dates',
  location: { address: '1201 Knox Ave, North Augusta, SC 29841', fuzzy: false },
} as ReviewProposalLike;

const AMBIGUOUS_TIME_PROPOSAL: ReviewProposalLike = {
  reviewAction: 'ambiguous_time',
  serviceScope: 'one_off_date',
  serviceDate: '2026-08-25',
  times: { start: '11:00', end: '14:00', dateReference: 'today', scope: 'one_off_date' },
  timeAlternatives: [
    { start: '11:00', end: '14:00', label: '11 AM–2 PM' },
    { start: '23:00', end: '02:00', label: '11 PM–2 AM' },
  ],
  location: { address: 'Harlem Ave. and 99th St.', fuzzy: true },
};

describe('validateReviewResolution — location components', () => {
  it('accepts an exact location with a non-empty address', () => {
    const result = validateReviewResolution(DATED_PROPOSAL, {
      locationResolution: { type: 'exact_location', location: { address: ' 1201 Knox Ave ' } },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects an exact location with an empty address', () => {
    const result = validateReviewResolution(DATED_PROPOSAL, {
      locationResolution: { type: 'exact_location', location: { address: '   ' } },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/address/i);
  });

  it('accepts a candidate selection when the id exists in the persisted candidate set', () => {
    const proposal = {
      ...DATED_PROPOSAL,
      reviewAction: 'ambiguous_location',
      location: { address: 'Main St & 5th Ave', fuzzy: true },
      locationCandidates: [
        { id: 'cand-1', address: '1201 Knox Ave, North Augusta, SC 29841' },
        { id: 'cand-2', address: '456 Main St, Augusta, GA 30901' },
      ],
    } as ReviewProposalLike;
    const result = validateReviewResolution(proposal, {
      locationResolution: { type: 'candidate_selection', candidateId: 'cand-2' },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects a candidate id that is not in the persisted candidate set', () => {
    const proposal = {
      ...DATED_PROPOSAL,
      reviewAction: 'ambiguous_location',
      location: { address: 'Main St & 5th Ave', fuzzy: true },
      locationCandidates: [{ id: 'cand-1', address: '1201 Knox Ave' }],
    } as ReviewProposalLike;
    const result = validateReviewResolution(proposal, {
      locationResolution: { type: 'candidate_selection', candidateId: 'rogue-id' },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/candidate/i);
  });

  it('rejects a candidate selection when the proposal has no persisted candidates', () => {
    const result = validateReviewResolution(DATED_PROPOSAL, {
      locationResolution: { type: 'candidate_selection', candidateId: 'cand-1' },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/candidate/i);
  });
});

describe('validateReviewResolution — schedule components', () => {
  it('accepts only a persisted ambiguous-time choice on the proposed date', () => {
    const result = validateReviewResolution(AMBIGUOUS_TIME_PROPOSAL, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-08-25',
        startTime: '23:00',
        endTime: '02:00',
      },
    });
    expect(result.valid).toBe(true);
  });

  it.each([
    ['2026-08-26', '23:00', '02:00'],
    ['2026-08-25', '10:00', '13:00'],
  ])(
    'rejects an ambiguous-time response outside its persisted choices: %s %s-%s',
    (serviceDate, startTime, endTime) => {
      const result = validateReviewResolution(AMBIGUOUS_TIME_PROPOSAL, {
        scheduleResolution: { scope: 'one_off', serviceDate, startTime, endTime },
      });
      expect(result.valid).toBe(false);
    },
  );

  it('rejects a location replacement for a time-only proposal', () => {
    const result = validateReviewResolution(AMBIGUOUS_TIME_PROPOSAL, {
      locationResolution: {
        type: 'exact_location',
        location: { address: 'Different location' },
      },
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-08-25',
        startTime: '11:00',
        endTime: '14:00',
      },
    });
    expect(result).toEqual({
      valid: false,
      reason: 'Time choice must preserve the proposed service location',
    });
  });

  it('rejects malformed persisted time choices without throwing', () => {
    const malformed = {
      ...AMBIGUOUS_TIME_PROPOSAL,
      timeAlternatives: null,
    } as unknown as ReviewProposalLike;
    const result = validateReviewResolution(malformed, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-08-25',
        startTime: '11:00',
        endTime: '14:00',
      },
    });
    expect(result).toEqual({
      valid: false,
      reason: 'Submitted service hours do not match a proposed choice',
    });
  });

  it('accepts a one-off schedule correction with date and complete hours', () => {
    const result = validateReviewResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-09-04',
        startTime: '11:00',
        endTime: '14:00',
      },
    });
    expect(result.valid).toBe(true);
  });

  it.each(['2028-02-29', '2026-12-31'])(
    'accepts a valid calendar service date: %s',
    (serviceDate) => {
      const result = validateReviewResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
        scheduleResolution: {
          scope: 'one_off',
          serviceDate,
          startTime: '11:00',
          endTime: '14:00',
        },
      });
      expect(result.valid).toBe(true);
    },
  );

  it.each(['2026-02-31', '2026-02-29', '2026-2-03', 'not-a-date'])(
    'rejects an invalid calendar service date: %s',
    (serviceDate) => {
      const result = validateReviewResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
        scheduleResolution: {
          scope: 'one_off',
          serviceDate,
          startTime: '11:00',
          endTime: '14:00',
        },
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/service date/i);
    },
  );

  it('rejects a one-off schedule correction without a service date', () => {
    const result = validateReviewResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: { scope: 'one_off', startTime: '11:00', endTime: '14:00' } as never,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/service date/i);
  });

  it('rejects a one-off schedule correction with incomplete hours', () => {
    const result = validateReviewResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-09-04',
        startTime: '11:00',
      } as never,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/hours/i);
  });

  it('accepts a recurring schedule correction with canonical days and complete hours', () => {
    const result = validateReviewResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: {
        scope: 'recurring',
        days: ['Friday', ' fri '],
        startTime: '11:00',
        endTime: '14:00',
      },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects a recurring schedule correction with a non-canonical day without throwing', () => {
    const result = validateReviewResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: {
        scope: 'recurring',
        days: ['friday', 'someday'],
        startTime: '11:00',
        endTime: '14:00',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('NONCANONICAL_DAYSET_REJECTED');
  });

  it('rejects a recurring schedule correction with equal normalized times', () => {
    const result = validateReviewResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: {
        scope: 'recurring',
        days: ['friday'],
        startTime: '11:00',
        endTime: '11:00',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('DEGENERATE_TIMES_REJECTED');
  });

  it('rejects a non-array days value without throwing (client/AI-shaped junk)', () => {
    const result = validateReviewResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: {
        scope: 'recurring',
        days: 'every day',
        startTime: '11:00',
        endTime: '14:00',
      } as never,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/weekday/i);
  });

  it('rejects a schedule correction whose scope contradicts the persisted proposal scope', () => {
    const result = validateReviewResolution(RECURRING_PROPOSAL, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-09-04',
        startTime: '11:00',
        endTime: '14:00',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/scope/i);
  });
});

describe('validateReviewResolution — forbidden and empty payloads', () => {
  it('rejects client-supplied Facebook identity fields', () => {
    const result = validateReviewResolution(DATED_PROPOSAL, {
      facebook_post_id: 'attacker-post',
    } as unknown as ReviewResolutionInput);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/not permitted|identity/i);
  });

  it('rejects client-supplied reviewAction or serviceScope overrides', () => {
    const result = validateReviewResolution(DATED_PROPOSAL, {
      reviewAction: 'missing_location',
    } as unknown as ReviewResolutionInput);
    expect(result.valid).toBe(false);

    const result2 = validateReviewResolution(DATED_PROPOSAL, {
      serviceScope: 'recurring',
    } as unknown as ReviewResolutionInput);
    expect(result2.valid).toBe(false);
  });

  it('rejects a resolution with neither component', () => {
    const result = validateReviewResolution(DATED_PROPOSAL, {});
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/resolution/i);
  });

  it('rejects null/undefined/non-object payloads without throwing', () => {
    expect(validateReviewResolution(DATED_PROPOSAL, null as never).valid).toBe(false);
    expect(validateReviewResolution(DATED_PROPOSAL, 'junk' as never).valid).toBe(false);
    expect(validateReviewResolution(DATED_PROPOSAL, [] as never).valid).toBe(false);
  });
});

describe('canResolve — merged completeness', () => {
  it('requires an explicit choice for an ambiguous-time proposal', () => {
    expect(canResolve(AMBIGUOUS_TIME_PROPOSAL, undefined)).toEqual({
      canResolve: false,
      reason: 'Ambiguous service hours require a time choice',
    });
    expect(
      canResolve(AMBIGUOUS_TIME_PROPOSAL, {
        scheduleResolution: {
          scope: 'one_off',
          serviceDate: '2026-08-25',
          startTime: '11:00',
          endTime: '14:00',
        },
      }),
    ).toEqual({ canResolve: true });
  });

  it('rejects persisted equal times before resolving a location', () => {
    const result = canResolve(
      {
        ...RECURRING_PROPOSAL,
        times: { start: '11:00', end: '11:00', days: ['monday'] },
      } as ReviewProposalLike,
      { locationResolution: { type: 'exact_location', location: { address: '1201 Knox Ave' } } },
    );

    expect(result).toEqual({ canResolve: false, reason: 'DEGENERATE_TIMES_REJECTED' });
  });

  it('rejects a persisted recurring proposal with a noncanonical weekday', () => {
    const result = canResolve(
      {
        ...RECURRING_PROPOSAL,
        times: { start: '11:00', end: '14:00', days: ['monday', 'someday'] },
      } as ReviewProposalLike,
      { locationResolution: { type: 'exact_location', location: { address: '1201 Knox Ave' } } },
    );

    expect(result).toEqual({ canResolve: false, reason: 'NONCANONICAL_DAYSET_REJECTED' });
  });

  it('fails when only schedule is provided and the proposal lacks a usable location', () => {
    const result = canResolve(DATED_PROPOSAL, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-09-04',
        startTime: '11:00',
        endTime: '14:00',
      },
    });
    expect(result.canResolve).toBe(false);
    expect(result.reason).toMatch(/location/i);
  });

  it('fails when only a location is provided and the proposal lacks complete hours', () => {
    const result = canResolve(
      { ...DATED_PROPOSAL, times: { start: '11:00', scope: 'one_off_date' } } as ReviewProposalLike,
      { locationResolution: { type: 'exact_location', location: { address: '1201 Knox Ave' } } },
    );
    expect(result.canResolve).toBe(false);
    expect(result.reason).toMatch(/hours|time/i);
  });

  it('accepts schedule from proposal + exact location resolution for a one-off', () => {
    const result = canResolve(DATED_PROPOSAL, {
      locationResolution: { type: 'exact_location', location: { address: '1201 Knox Ave' } },
    });
    expect(result.canResolve).toBe(true);
  });

  it('accepts a candidate selection for a one-off ambiguous proposal', () => {
    const proposal = {
      ...DATED_PROPOSAL,
      reviewAction: 'ambiguous_location',
      location: { address: 'Main St & 5th Ave', fuzzy: true },
      locationCandidates: [{ id: 'cand-1', address: '1201 Knox Ave' }],
    } as ReviewProposalLike;
    const result = canResolve(proposal, {
      locationResolution: { type: 'candidate_selection', candidateId: 'cand-1' },
    });
    expect(result.canResolve).toBe(true);
  });

  it('rejects a fuzzy proposal location as the service location', () => {
    const proposal = {
      ...DATED_PROPOSAL,
      reviewAction: 'ambiguous_location',
      location: { address: 'Main St & 5th Ave', fuzzy: true },
    } as ReviewProposalLike;
    const result = canResolve(proposal, {});
    expect(result.canResolve).toBe(false);
    expect(result.reason).toMatch(/location/i);
  });

  it('accepts a recurring resolution when proposal lacks location but resolution supplies it', () => {
    const proposal = {
      ...RECURRING_PROPOSAL,
      reviewAction: 'missing_location',
      tecnologyscope: undefined,
    } as unknown as ReviewProposalLike;
    const result = canResolve(proposal, {
      locationResolution: { type: 'exact_location', location: { address: '1201 Knox Ave' } },
    });
    expect(result.canResolve).toBe(true);
  });

  it('fails a recurring resolution when neither proposal nor resolution has a location', () => {
    const result = canResolve(RECURRING_PROPOSAL, {});
    expect(result.canResolve).toBe(false);
    expect(result.reason).toMatch(/location/i);
  });

  it('accepts an unresolved_schedule proposal resolved with schedule + its own non-fuzzy location', () => {
    const result = canResolve(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-09-04',
        startTime: '11:00',
        endTime: '14:00',
      },
    });
    expect(result.canResolve).toBe(true);
  });

  it('fails an unresolved_schedule proposal with no usable location when resolution lacks one', () => {
    const proposal = {
      ...SCHEDULE_UNRESOLVED_PROPOSAL,
      location: undefined,
    } as ReviewProposalLike;
    const result = canResolve(proposal, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-09-04',
        startTime: '11:00',
        endTime: '14:00',
      },
    });
    expect(result.canResolve).toBe(false);
    expect(result.reason).toMatch(/location/i);
  });

  it('accepts a schedule resolution that carries its own location', () => {
    const result = canResolve(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-09-04',
        startTime: '11:00',
        endTime: '14:00',
      },
      locationResolution: { type: 'exact_location', location: { address: 'New spot' } },
    });
    expect(result.canResolve).toBe(true);
  });
});

describe('mergeProposalWithResolution', () => {
  it('preserves the displayed location when resolving only the ambiguous time', () => {
    const merged = mergeProposalWithResolution(AMBIGUOUS_TIME_PROPOSAL, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-08-25',
        startTime: '11:00',
        endTime: '14:00',
      },
    });
    expect(merged.location).toEqual({
      address: 'Harlem Ave. and 99th St.',
      fuzzy: true,
    });
  });

  it('produces a one-off effective operation with location from the resolution', () => {
    const merged = mergeProposalWithResolution(DATED_PROPOSAL, {
      locationResolution: { type: 'exact_location', location: { address: ' 1201 Knox Ave ' } },
    });
    expect(merged.serviceDate).toBe('2026-08-25');
    expect(merged.times).toMatchObject({ start: '11:00', end: '14:00' });
    expect(merged.location).toEqual({ address: '1201 Knox Ave', fuzzy: false });
    expect(merged.reviewAction).toBeUndefined();
    expect(merged.locationCandidates).toBeUndefined();
  });

  it('uses the selected candidate as the effective location', () => {
    const proposal = {
      ...DATED_PROPOSAL,
      reviewAction: 'ambiguous_location',
      location: { address: 'Main St & 5th Ave', fuzzy: true },
      locationCandidates: [
        { id: 'cand-1', address: '1201 Knox Ave', city: 'North Augusta', state: 'SC' },
      ],
    } as ReviewProposalLike;
    const merged = mergeProposalWithResolution(proposal, {
      locationResolution: { type: 'candidate_selection', candidateId: 'cand-1' },
    });
    expect(merged.location).toEqual({
      address: '1201 Knox Ave',
      city: 'North Augusta',
      state: 'SC',
      fuzzy: false,
    });
  });

  it('applies a one-off schedule correction over the proposal times', () => {
    const merged = mergeProposalWithResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-09-04',
        startTime: '12:00',
        endTime: '15:00',
      },
    });
    expect(merged.serviceDate).toBe('2026-09-04');
    expect(merged.times).toMatchObject({ start: '12:00', end: '15:00' });
  });

  it('applies a recurring schedule correction with normalized canonical days', () => {
    const proposal = {
      ...SCHEDULE_UNRESOLVED_PROPOSAL,
      serviceScope: 'recurring',
      times: { start: '10:00', dateReference: 'today', scope: 'recurring_weekly' },
    } as ReviewProposalLike;
    const merged = mergeProposalWithResolution(proposal, {
      scheduleResolution: {
        scope: 'recurring',
        days: [' Friday ', 'friday', 'monday'],
        startTime: '12:00',
        endTime: '15:00',
      },
    });
    expect(merged.serviceDate).toBeUndefined();
    expect(merged.times?.days).toEqual(['friday', 'monday']);
    expect(merged.times).toMatchObject({ start: '12:00', end: '15:00' });
  });

  it('keeps the persisted serviceScope and clears unresolvedReason on merge', () => {
    const merged = mergeProposalWithResolution(SCHEDULE_UNRESOLVED_PROPOSAL, {
      scheduleResolution: {
        scope: 'one_off',
        serviceDate: '2026-09-04',
        startTime: '12:00',
        endTime: '15:00',
      },
    });
    expect(merged.serviceScope).toBe('unresolved_schedule');
    expect(merged.unresolvedReason).toBeUndefined();
  });
});
