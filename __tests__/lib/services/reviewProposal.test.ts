import { describe, expect, it } from '@jest/globals';
import {
  resolveServiceScope,
  validateReviewProposal,
  buildReviewProposal,
  type ReviewProposalInput,
} from '@/lib/services/reviewProposal';
import type { ValidationResult } from '@/lib/services/postValidator';

const DATED_TIMES = {
  start: '11:00',
  end: '14:00',
  dateReference: 'today',
  scope: 'one_off_date' as const,
};

const RECURRING_TIMES = {
  start: '11:00',
  end: '14:00',
  days: ['monday', 'tuesday'],
  scope: 'recurring_weekly' as const,
};

function baseInput(
  overrides: Partial<ReviewProposalInput> & { reviewAction: ReviewProposalInput['reviewAction'] },
): ReviewProposalInput {
  return {
    parsed: { food_items: [], confidence: 0.6 },
    validation: {},
    ...overrides,
  };
}

describe('resolveServiceScope', () => {
  it('derives unresolved_schedule from the review action alone', () => {
    expect(
      resolveServiceScope('unresolved_schedule', { food_items: [], confidence: 0.6 }, {}),
    ).toBe('unresolved_schedule');
  });

  it('derives one_off_date from a resolved service date', () => {
    expect(
      resolveServiceScope(
        'missing_location',
        { food_items: [], confidence: 0.6, times: DATED_TIMES },
        { resolvedServiceDate: '2026-08-03' },
      ),
    ).toBe('one_off_date');
  });

  it('derives recurring from a canonical weekday set', () => {
    expect(
      resolveServiceScope(
        'missing_location',
        { food_items: [], confidence: 0.6, times: RECURRING_TIMES },
        {},
      ),
    ).toBe('recurring');
  });

  it('derives recurring from writer-supported weekday abbreviations', () => {
    expect(
      resolveServiceScope(
        'missing_location',
        {
          food_items: [],
          confidence: 0.6,
          times: { ...RECURRING_TIMES, days: ['Mon', 'tue'] },
        },
        {},
      ),
    ).toBe('recurring');
  });

  it('fails closed when no schedule context exists at all', () => {
    expect(
      resolveServiceScope(
        'missing_location',
        { food_items: [], confidence: 0.6, location: { address: 'somewhere', fuzzy: true } },
        {},
      ),
    ).toBeNull();
  });
});

describe('validateReviewProposal — one_off_date', () => {
  it('accepts a missing_location proposal without any location context', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'one_off_date',
      serviceDate: '2026-08-03',
      times: DATED_TIMES,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects a missing_location proposal without a resolved service date', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'one_off_date',
      times: DATED_TIMES,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/service date/i);
  });

  it('rejects a missing_location proposal without complete hours', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'one_off_date',
      serviceDate: '2026-08-03',
      times: { start: '11:00', scope: 'one_off_date' },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/hours/i);
  });

  it('requires the ambiguous source location text for ambiguous_location', () => {
    const result = validateReviewProposal({
      reviewAction: 'ambiguous_location',
      serviceScope: 'one_off_date',
      serviceDate: '2026-08-03',
      times: DATED_TIMES,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/location/i);
  });

  it('accepts ambiguous_location with source text and no candidates', () => {
    const result = validateReviewProposal({
      reviewAction: 'ambiguous_location',
      serviceScope: 'one_off_date',
      serviceDate: '2026-08-03',
      times: DATED_TIMES,
      location: { address: 'the corner lot downtown', fuzzy: true },
    });
    expect(result.valid).toBe(true);
  });
});

describe('validateReviewProposal — recurring', () => {
  it('accepts a recurring missing_location proposal without a service date or location', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'recurring',
      times: RECURRING_TIMES,
    });
    expect(result.valid).toBe(true);
  });

  it('accepts writer-supported weekday abbreviations in a recurring proposal', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'recurring',
      times: { ...RECURRING_TIMES, days: ['Mon', 'tue'] },
    });

    expect(result.valid).toBe(true);
  });

  it('rejects a recurring proposal without a canonical weekday set', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'recurring',
      times: { start: '11:00', end: '14:00', days: ['someday'], scope: 'recurring_weekly' },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/weekday/i);
  });

  it('rejects a recurring proposal without complete hours', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'recurring',
      times: { days: ['monday'], scope: 'recurring_weekly' },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/hours/i);
  });

  it('rejects a mixed canonical/non-canonical weekday set (AI-shaped input)', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'recurring',
      times: {
        start: '11:00',
        end: '14:00',
        days: ['monday', 'someday'],
        scope: 'recurring_weekly',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/weekday/i);
  });

  it('rejects a non-string weekday member without throwing (AI-shaped input)', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'recurring',
      times: {
        start: '11:00',
        end: '14:00',
        days: ['monday', 123] as unknown as string[],
        scope: 'recurring_weekly',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/weekday/i);
  });

  it('rejects a non-array days value without throwing (AI-shaped input)', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'recurring',
      times: {
        start: '11:00',
        end: '14:00',
        days: 'every day' as unknown as string[],
        scope: 'recurring_weekly',
      },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/weekday/i);
  });

  it('rejects an empty days array', () => {
    const result = validateReviewProposal({
      reviewAction: 'missing_location',
      serviceScope: 'recurring',
      times: { start: '11:00', end: '14:00', days: [], scope: 'recurring_weekly' },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/weekday/i);
  });
});

describe('validateReviewProposal — unresolved_schedule', () => {
  it('accepts partial start/end as durable schedule evidence', () => {
    const result = validateReviewProposal({
      reviewAction: 'unresolved_schedule',
      serviceScope: 'unresolved_schedule',
      times: { start: '11:00', dateReference: 'sometime next season', scope: 'one_off_date' },
      unresolvedReason: 'Date-specific schedule could not be resolved',
    });
    expect(result.valid).toBe(true);
  });

  it('accepts a date reference as durable schedule evidence', () => {
    const result = validateReviewProposal({
      reviewAction: 'unresolved_schedule',
      serviceScope: 'unresolved_schedule',
      times: { end: '14:00', dateReferences: ['this Friday', 'today'], scope: 'one_off_date' },
      unresolvedReason: 'Date references resolve to conflicting service dates',
    });
    expect(result.valid).toBe(true);
  });

  it('accepts a canonical weekday set as durable schedule evidence', () => {
    const result = validateReviewProposal({
      reviewAction: 'unresolved_schedule',
      serviceScope: 'unresolved_schedule',
      times: { start: '11:00', end: '14:00', days: ['friday'], scope: 'recurring_weekly' },
      unresolvedReason: 'Schedule is missing complete times',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects a proposal with only a reason and location context — no schedule evidence', () => {
    const result = validateReviewProposal({
      reviewAction: 'unresolved_schedule',
      serviceScope: 'unresolved_schedule',
      times: { scope: 'scope_missing' },
      unresolvedReason: 'Schedule is missing complete times or weekday reference',
      location: { address: 'the corner lot downtown', fuzzy: true },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/schedule evidence/i);
  });

  it('rejects a proposal with no times at all', () => {
    const result = validateReviewProposal({
      reviewAction: 'unresolved_schedule',
      serviceScope: 'unresolved_schedule',
      unresolvedReason: 'Schedule is missing complete times or weekday reference',
      parsed: { food_items: [], confidence: 0.6 },
      validation: {},
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/schedule evidence/i);
  });

  it('does not let an empty-string dateReferences array establish evidence', () => {
    const result = validateReviewProposal({
      reviewAction: 'unresolved_schedule',
      serviceScope: 'unresolved_schedule',
      times: { scope: 'one_off_date', dateReferences: ['', '   '] },
      unresolvedReason: 'Date references could not be resolved',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/schedule evidence/i);
  });

  it('rejects a non-string dateReferences member without throwing (AI-shaped input)', () => {
    const result = validateReviewProposal({
      reviewAction: 'unresolved_schedule',
      serviceScope: 'unresolved_schedule',
      times: { scope: 'one_off_date', dateReferences: [123] as unknown as string[] },
      unresolvedReason: 'Date references could not be resolved',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/schedule evidence/i);
  });

  it('rejects a non-array dateReferences value without throwing (AI-shaped input)', () => {
    const result = validateReviewProposal({
      reviewAction: 'unresolved_schedule',
      serviceScope: 'unresolved_schedule',
      times: { scope: 'one_off_date', dateReferences: 'this Friday' as unknown as string[] },
      unresolvedReason: 'Date references could not be resolved',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/schedule evidence/i);
  });
});

describe('validateReviewProposal — candidates', () => {
  const validBase = {
    reviewAction: 'ambiguous_location' as const,
    serviceScope: 'one_off_date' as const,
    serviceDate: '2026-08-03',
    times: DATED_TIMES,
    location: { address: 'the corner lot downtown', fuzzy: true },
  };

  it('accepts well-formed candidates', () => {
    const result = validateReviewProposal({
      ...validBase,
      locationCandidates: [
        {
          id: 'cand-1',
          address: '1201 Knox Ave, North Augusta, SC 29841',
          lat: 33.47,
          lng: -81.96,
        },
        { id: 'cand-2', address: '456 Main St, Augusta, GA 30901' },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('rejects an explicitly present empty candidates array (contract: present ⇒ non-empty)', () => {
    const result = validateReviewProposal({
      ...validBase,
      locationCandidates: [],
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/candidate/i);
  });

  it('rejects a candidate with an empty id', () => {
    const result = validateReviewProposal({
      ...validBase,
      locationCandidates: [{ id: '', address: '1201 Knox Ave' }],
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/candidate/i);
  });

  it('rejects a candidate with an empty address', () => {
    const result = validateReviewProposal({
      ...validBase,
      locationCandidates: [{ id: 'cand-1', address: '   ' }],
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/candidate/i);
  });

  it('rejects a candidate with a non-finite latitude', () => {
    const result = validateReviewProposal({
      ...validBase,
      locationCandidates: [{ id: 'cand-1', address: '1201 Knox Ave', lat: Number.NaN }],
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/candidate/i);
  });

  it('rejects a non-array candidates field', () => {
    const result = validateReviewProposal({
      ...validBase,
      locationCandidates: 'nope' as unknown as ReviewProposalInput['locationCandidates'],
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/candidate/i);
  });
});

describe('validateReviewProposal — service-scope enforcement', () => {
  it('rejects a location-only proposal with no usable schedule context', () => {
    const result = validateReviewProposal({
      reviewAction: 'ambiguous_location',
      serviceScope: 'recurring',
      location: { address: 'the corner lot downtown', fuzzy: true },
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/weekday set/i);
  });

  it('rejects a one_off_date proposal whose service date is missing even with reason and location', () => {
    const result = validateReviewProposal({
      reviewAction: 'ambiguous_location',
      serviceScope: 'one_off_date',
      times: DATED_TIMES,
      location: { address: 'the corner lot downtown', fuzzy: true },
      unresolvedReason: 'Owner was notified',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/service date/i);
  });
});

describe('buildReviewProposal', () => {
  const validDated: ReviewProposalInput = {
    reviewAction: 'ambiguous_location',
    parsed: {
      food_items: [],
      location: { address: 'the corner lot downtown', fuzzy: true },
      times: DATED_TIMES,
      confidence: 0.6,
    },
    validation: { resolvedServiceDate: '2026-08-03' },
    unresolvedReason: 'Date-specific schedule has an ambiguous service location',
  };

  it('builds a valid proposal from a dated ambiguous post', () => {
    const proposal = buildReviewProposal(validDated);
    expect(proposal).not.toBeNull();
    expect(proposal?.reviewAction).toBe('ambiguous_location');
    expect(proposal?.serviceScope).toBe('one_off_date');
    expect(proposal?.serviceDate).toBe('2026-08-03');
    expect(proposal?.times).toEqual(DATED_TIMES);
    expect(proposal?.location).toEqual({ address: 'the corner lot downtown', fuzzy: true });
  });

  it('omits locationCandidates when none exist', () => {
    const proposal = buildReviewProposal(validDated);
    expect(proposal).not.toBeNull();
    expect('locationCandidates' in (proposal as object)).toBe(false);
  });

  it('persists candidates only when upstream provided them', () => {
    const proposal = buildReviewProposal({
      ...validDated,
      locationCandidates: [{ id: 'cand-1', address: '1201 Knox Ave, North Augusta, SC 29841' }],
    });
    expect(proposal?.locationCandidates).toEqual([
      { id: 'cand-1', address: '1201 Knox Ave, North Augusta, SC 29841' },
    ]);
  });

  it('returns null for a location-only post with no schedule context', () => {
    const proposal = buildReviewProposal({
      reviewAction: 'ambiguous_location',
      parsed: {
        food_items: [],
        location: { address: 'the corner lot downtown', fuzzy: true },
        confidence: 0.6,
      },
      validation: {},
    });
    expect(proposal).toBeNull();
  });

  it('preserves candidates on an unresolved_schedule proposal (type-checked)', () => {
    const candidates = [{ id: 'cand-1', address: '1201 Knox Ave' }];
    const proposal = buildReviewProposal({
      reviewAction: 'unresolved_schedule',
      parsed: {
        food_items: [],
        location: { address: '1201 Knox Ave, North Augusta, SC 29841', fuzzy: false },
        times: {
          start: '11:00',
          end: '14:00',
          dateReferences: ['this Friday', 'today'],
          scope: 'one_off_date',
        },
        confidence: 0.6,
      },
      validation: {},
      unresolvedReason: 'Date references resolve to conflicting service dates',
      locationCandidates: candidates,
    });
    expect(proposal).not.toBeNull();
    expect(proposal?.reviewAction).toBe('unresolved_schedule');
    expect(proposal?.locationCandidates).toEqual(candidates);
  });

  it('keeps the persisted location field name for existing consumers', () => {
    const proposal = buildReviewProposal(validDated);
    const json = proposal as unknown as Record<string, unknown>;
    expect(json).toHaveProperty('location');
    expect(json).not.toHaveProperty('locationContext');
  });

  it('adds only serviceScope and locationCandidates as additive fields', () => {
    const proposal = buildReviewProposal({
      ...validDated,
      parsed: { ...validDated.parsed, food_items: ['Tacos'] },
      classificationType: 'schedule',
      locationCandidates: [{ id: 'cand-1', address: '1201 Knox Ave' }],
    }) as unknown as Record<string, unknown>;
    expect(Object.keys(proposal).sort()).toEqual([
      'classification',
      'confidence',
      'food_items',
      'location',
      'locationCandidates',
      'reviewAction',
      'serviceDate',
      'serviceScope',
      'times',
    ]);
  });

  it('omits optional fields when their inputs are empty', () => {
    const proposal = buildReviewProposal(validDated) as unknown as Record<string, unknown>;
    expect(proposal).not.toHaveProperty('classification');
    expect(proposal).not.toHaveProperty('food_items');
    expect(proposal).not.toHaveProperty('locationCandidates');
  });
});
