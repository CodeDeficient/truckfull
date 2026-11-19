import { describe, expect, it } from '@jest/globals';
import {
  assessConfirmationApplication,
  deriveExpectedServiceOperationUnits,
  getConfirmationUpdateTypes,
  getLocationReviewDiagnostic,
  hasNonScheduleData,
  isUnresolvedDatedProposal,
  requiresAtomicDatedApplication,
  type ConfirmationProposal,
} from '@/lib/services/confirmationPolicy';

describe('confirmation application policy', () => {
  const datedSchedule: ConfirmationProposal = {
    serviceDate: '2026-08-03',
    times: { start: '11:00', end: '14:00', scope: 'one_off_date' },
  };

  it('identifies menu and location data separately from schedule data', () => {
    expect(hasNonScheduleData(datedSchedule)).toBe(false);
    expect(hasNonScheduleData({ ...datedSchedule, food_items: ['Tacos'] })).toBe(true);
    expect(
      hasNonScheduleData({
        ...datedSchedule,
        location: { address: '123 Main St' },
      }),
    ).toBe(true);
  });

  it('blocks mixed dated proposals before any partial write', () => {
    expect(requiresAtomicDatedApplication(datedSchedule)).toBe(false);
    expect(
      requiresAtomicDatedApplication({ ...datedSchedule, food_items: ['Tacos'] }),
    ).toBe(true);
  });

  it('does not block recurring or incomplete proposals', () => {
    expect(requiresAtomicDatedApplication({ food_items: ['Tacos'] })).toBe(false);
    expect(
      requiresAtomicDatedApplication({
        serviceDate: '2026-08-03',
        times: { start: '11:00', scope: 'one_off_date' },
        food_items: ['Tacos'],
      }),
    ).toBe(false);
  });

  it('identifies dated proposals that have no resolved service date', () => {
    expect(
      isUnresolvedDatedProposal({
        times: { start: '11:00', end: '14:00', scope: 'one_off_date' },
      }),
    ).toBe(true);
    expect(
      isUnresolvedDatedProposal({
        serviceDate: '2026-08-03',
        times: { start: '11:00', end: '14:00', scope: 'one_off_date' },
      }),
    ).toBe(false);
    expect(isUnresolvedDatedProposal({ times: { start: '11:00', end: '14:00' } })).toBe(false);
  });

  it('does not source-check a dated location as a truck-wide update', () => {
    expect(
      getConfirmationUpdateTypes(
        {
          ...datedSchedule,
          location: { address: 'Date-specific location' },
        },
        true,
      ),
    ).toEqual(['schedule']);
  });

  it('keeps the permanent-location source unit for a location-only proposal without a day set', () => {
    expect(
      getConfirmationUpdateTypes(
        {
          times: { start: '11:00', end: '14:00' },
          food_items: ['Tacos'],
          location: { address: 'Permanent location' },
        },
        false,
      ),
    ).toEqual(['menu', 'location', 'schedule']);
  });

  it('skips the permanent-location source unit for a Stage B recurring-scope non-fuzzy proposal', () => {
    expect(
      getConfirmationUpdateTypes(
        {
          reviewAction: 'missing_location',
          serviceScope: 'recurring',
          times: { start: '11:00', end: '14:00', days: ['monday', 'tuesday'] },
          location: { address: '500 New Ave', fuzzy: false },
          food_items: ['Tacos'],
        },
        false,
      ),
    ).toEqual(['menu', 'schedule']);
  });

  it('skips the permanent-location source unit for a plain recurring-weekly proposal with a canonical day set', () => {
    expect(
      getConfirmationUpdateTypes(
        {
          times: {
            start: '11:00',
            end: '14:00',
            scope: 'recurring_weekly',
            days: ['monday', 'tuesday'],
          },
          location: { address: '500 New Ave', fuzzy: false },
        },
        false,
      ),
    ).toEqual(['schedule']);
  });

  it('skips the permanent-location source unit for a plain bare-weekday (scope_missing) proposal with a canonical day set', () => {
    expect(
      getConfirmationUpdateTypes(
        {
          times: { start: '11:00', end: '14:00', scope: 'scope_missing', days: ['monday'] },
          location: { address: '500 New Ave', fuzzy: false },
        },
        false,
      ),
    ).toEqual(['schedule']);
  });

  it('keeps the permanent-location source unit when recurring scope has incomplete times', () => {
    expect(
      getConfirmationUpdateTypes(
        {
          times: { start: '11:00', scope: 'scope_missing', days: ['monday'] },
          location: { address: 'Permanent location', fuzzy: false },
        },
        false,
      ),
    ).toEqual(['location']);
  });

  it('skips the permanent-location source unit for an alias-aware abbreviated canonical day set', () => {
    expect(
      getConfirmationUpdateTypes(
        {
          times: { start: '11:00', end: '14:00', scope: 'recurring_weekly', days: ['Mon'] },
          location: { address: '500 New Ave', fuzzy: false },
        },
        false,
      ),
    ).toEqual(['schedule']);
  });

  it('keeps the permanent-location source unit for a fuzzy location regardless of recurring scope', () => {
    expect(
      getConfirmationUpdateTypes(
        {
          serviceScope: 'recurring',
          times: { start: '11:00', end: '14:00', days: ['monday'] },
          location: { address: 'Near the park', fuzzy: true },
        },
        false,
      ),
    ).toEqual(['location', 'schedule']);
  });

  it('derives requested units from a schedule-only normalized proposal', () => {
    expect(
      deriveExpectedServiceOperationUnits(
        {
          times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'scope_missing' },
        },
        false,
      ),
    ).toEqual(['schedule']);
  });

  it('treats an exact recurring service location as part of the schedule operation', () => {
    expect(
      deriveExpectedServiceOperationUnits(
        {
          serviceScope: 'recurring',
          times: { start: '11:00', end: '14:00', days: ['monday'] },
          location: { address: '500 New Ave', fuzzy: false },
        },
        false,
      ),
    ).toEqual(['schedule']);
  });

  it('treats an unresolved proposal corrected to recurring as one schedule operation', () => {
    expect(
      deriveExpectedServiceOperationUnits(
        {
          serviceScope: 'unresolved_schedule',
          times: {
            start: '11:00',
            end: '14:00',
            days: ['monday'],
            scope: 'recurring_weekly',
          },
          location: { address: '500 New Ave', fuzzy: false },
        },
        false,
      ),
    ).toEqual(['schedule']);
  });

  it('terminalizes a mixed proposal whose schedule/location succeeded without a menu write', () => {
    const expectedUnits = deriveExpectedServiceOperationUnits(
      {
        times: { start: '11:00', end: '14:00', days: ['monday'] },
        location: { address: '1201 Knox Ave', fuzzy: false },
        food_items: ['Tacos'],
      },
      false,
    );
    expect(expectedUnits).toContain('menu');

    expect(assessConfirmationApplication(expectedUnits, ['location', 'schedule'])).toEqual({
      success: true,
    });
  });

  it('terminalizes a dated mixed proposal without a menu write', () => {
    const expectedUnits = deriveExpectedServiceOperationUnits(
      {
        serviceDate: '2026-08-25',
        times: { start: '11:00', end: '14:00', scope: 'one_off_date' },
        food_items: ['Tacos'],
      },
      true,
    );
    expect(expectedUnits).toContain('menu');

    expect(assessConfirmationApplication(expectedUnits, ['schedule'])).toEqual({
      success: true,
    });
  });

  it('rejects terminal success when a required unit was not positively applied', () => {
    expect(assessConfirmationApplication(['schedule'], [])).toEqual({
      success: false,
      code: 'APPLY_EXPECTED_UNIT_MISSING',
      missingUnits: ['schedule'],
    });
  });

  it('accepts explicitly proven idempotent units', () => {
    expect(assessConfirmationApplication(['schedule'], [], ['schedule'])).toEqual({
      success: true,
    });
  });

  it('requires review instead of applying a fuzzy location proposal', () => {
    expect(
      getLocationReviewDiagnostic({
        times: { start: '11:00', end: '14:00', days: ['monday'] },
        location: { address: 'Near the park', fuzzy: true },
      }),
    ).toBe('LOCATION_REVIEW_REQUIRED');
  });
});
