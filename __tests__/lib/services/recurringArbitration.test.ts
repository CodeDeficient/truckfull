import { describe, expect, it } from '@jest/globals';
import {
  applyManualRecurringProvenance,
  arbitrateFacebookRecurringAction,
  dayUnitChanges,
  readRecurringDayMeta,
  stampFacebookDayActions,
  stampManualDayActions,
  stripRecurringArbitrationMeta,
} from '@/lib/services/recurringArbitration';

const T0 = '2026-08-01T10:00:00.000Z';
const T1 = '2026-08-02T10:00:00.000Z';
const T2 = '2026-08-03T10:00:00.000Z';
const T3 = '2026-08-04T10:00:00.000Z';

describe('stripRecurringArbitrationMeta', () => {
  it('removes _meta from every day entry and preserves business fields', () => {
    const hours = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: '1201 Knox Ave',
        _meta: { schedule: { source: 'manual', last_action_at: T1 } },
      },
      tuesday: { closed: true, _meta: { schedule: { source: 'facebook', last_action_at: T2 } } },
    };

    const stripped = stripRecurringArbitrationMeta(hours);

    expect(stripped).toEqual({
      monday: { open: '11:00', close: '14:00', location: '1201 Knox Ave' },
      tuesday: { closed: true },
    });
  });

  it('returns an empty object for nullish input', () => {
    expect(stripRecurringArbitrationMeta(null)).toEqual({});
    expect(stripRecurringArbitrationMeta(undefined)).toEqual({});
  });
});

describe('dayUnitChanges', () => {
  it('flags only the schedule unit when only hours change', () => {
    const prior = { monday: { open: '11:00', close: '14:00' } };
    const next = { monday: { open: '12:00', close: '14:00' } };

    expect(dayUnitChanges(prior, next)).toEqual({
      monday: { schedule: true, location: false },
    });
  });

  it('flags only the location unit when only the location changes', () => {
    const prior = { monday: { open: '11:00', close: '14:00', location: 'Old spot' } };
    const next = { monday: { open: '11:00', close: '14:00', location: 'New spot' } };

    expect(dayUnitChanges(prior, next)).toEqual({
      monday: { schedule: false, location: true },
    });
  });

  it('flags both units when both change', () => {
    const prior = { monday: { open: '11:00', close: '14:00', location: 'Old spot' } };
    const next = { monday: { open: '12:00', close: '15:00', location: 'New spot' } };

    expect(dayUnitChanges(prior, next)).toEqual({
      monday: { schedule: true, location: true },
    });
  });

  it('flags nothing for an identical save', () => {
    const hours = { monday: { open: '11:00', close: '14:00', location: 'Spot' } };

    expect(dayUnitChanges(hours, hours)).toEqual({});
  });

  it('ignores _meta differences entirely', () => {
    const prior = {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'manual', last_action_at: T1 } },
      },
    };
    const next = {
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'facebook', last_action_at: T2 } },
      },
    };

    expect(dayUnitChanges(prior, next)).toEqual({});
  });

  it('flags a newly added day as a schedule change', () => {
    const prior = { monday: { open: '11:00', close: '14:00' } };
    const next = {
      monday: { open: '11:00', close: '14:00' },
      tuesday: { open: '09:00', close: '17:00' },
    };

    expect(dayUnitChanges(prior, next)).toEqual({
      tuesday: { schedule: true, location: false },
    });
  });

  it('flags a day closed as a schedule change', () => {
    const prior = { monday: { open: '11:00', close: '14:00' } };
    const next = { monday: { closed: true } };

    expect(dayUnitChanges(prior, next)).toEqual({
      monday: { schedule: true, location: false },
    });
  });

  it('does not flag a schedule change when a persisted closed:false day is re-saved without the closed key', () => {
    // The dashboard form persists open days with `closed: false`, but the
    // schedule editor (setDayHours / normalizeWeeklyScheduleForWrite) emits
    // entries without a `closed` key. A location-only edit on such a day must
    // stamp only the location clock — never the schedule clock — or it would
    // suppress a newer Facebook hours action for that day.
    const prior = {
      monday: { open: '11:00', close: '14:00', closed: false, location: 'Old spot' },
    };
    const next = { monday: { open: '11:00', close: '14:00', location: 'New spot' } };

    expect(dayUnitChanges(prior, next)).toEqual({
      monday: { schedule: false, location: true },
    });
  });
});

describe('stampManualDayActions', () => {
  it('stamps only the changed units on the changed days', () => {
    const hours = {
      monday: { open: '11:00', close: '14:00' },
      tuesday: { open: '09:00', close: '17:00' },
    };
    const changes = {
      monday: { schedule: true, location: false },
      tuesday: { schedule: false, location: true },
    };

    const stamped = stampManualDayActions(hours, changes, T2);

    expect(stamped.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      _meta: { schedule: { source: 'manual', last_action_at: T2 } },
    });
    expect(stamped.tuesday).toMatchObject({
      open: '09:00',
      close: '17:00',
      _meta: { location: { source: 'manual', last_action_at: T2 } },
    });
  });

  it('preserves existing meta for units that did not change', () => {
    const hours = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Spot',
        _meta: { location: { source: 'manual', last_action_at: T1 } },
      },
    };
    const changes = { monday: { schedule: true, location: false } };

    const stamped = stampManualDayActions(hours, changes, T2);

    expect(stamped.monday).toMatchObject({
      _meta: {
        schedule: { source: 'manual', last_action_at: T2 },
        location: { source: 'manual', last_action_at: T1 },
      },
    });
  });

  it('stamps nothing when there are no changes', () => {
    const hours = { monday: { open: '11:00', close: '14:00' } };

    const stamped = stampManualDayActions(hours, {}, T2);

    expect(stamped).toEqual(hours);
  });
});

describe('arbitrateFacebookRecurringAction', () => {
  it('fails closed on every affected unit when the canonical Facebook timestamp is missing', () => {
    const result = arbitrateFacebookRecurringAction({
      existingHours: { monday: { open: '11:00', close: '14:00' } },
      affectedUnitsByDay: { monday: ['schedule'] },
      fbActionAt: undefined,
    });

    expect(result.appliedAny).toBe(false);
    expect(result.verdicts.monday.schedule).toMatchObject({
      allow: false,
      code: 'RECURRING_FB_ACTION_TIME_MISSING',
      reason: expect.stringContaining('created_time'),
    });
  });

  it('fails closed on every affected unit when the canonical Facebook timestamp is invalid', () => {
    const result = arbitrateFacebookRecurringAction({
      existingHours: {},
      affectedUnitsByDay: { monday: ['schedule'] },
      fbActionAt: 'not-a-timestamp',
    });

    expect(result.appliedAny).toBe(false);
    expect(result.verdicts.monday.schedule).toMatchObject({
      code: 'RECURRING_FB_ACTION_TIME_MISSING',
    });
  });

  it('allows a newer Facebook action over a stored manual action', () => {
    const result = arbitrateFacebookRecurringAction({
      existingHours: {
        monday: {
          open: '11:00',
          close: '14:00',
          _meta: { schedule: { source: 'manual', last_action_at: T1 } },
        },
      },
      affectedUnitsByDay: { monday: ['schedule'] },
      fbActionAt: T2,
    });

    expect(result.appliedAny).toBe(true);
    expect(result.verdicts.monday.schedule).toEqual({ allow: true });
  });

  it('marks an equal Facebook action stale (no overwrite on tie)', () => {
    const result = arbitrateFacebookRecurringAction({
      existingHours: {
        monday: {
          open: '11:00',
          close: '14:00',
          _meta: { schedule: { source: 'manual', last_action_at: T2 } },
        },
      },
      affectedUnitsByDay: { monday: ['schedule'] },
      fbActionAt: T2,
    });

    expect(result.appliedAny).toBe(false);
    expect(result.verdicts.monday.schedule).toMatchObject({
      allow: false,
      code: 'RECURRING_SCHEDULE_STALE_OWNER_ACTION',
    });
  });

  it('marks an older Facebook action stale', () => {
    const result = arbitrateFacebookRecurringAction({
      existingHours: {
        monday: {
          open: '11:00',
          close: '14:00',
          _meta: { schedule: { source: 'manual', last_action_at: T2 } },
        },
      },
      affectedUnitsByDay: { monday: ['schedule'] },
      fbActionAt: T1,
    });

    expect(result.appliedAny).toBe(false);
    expect(result.verdicts.monday.schedule).toMatchObject({
      allow: false,
      code: 'RECURRING_SCHEDULE_STALE_OWNER_ACTION',
    });
  });

  it('allows a Facebook action on a legacy day/unit with no stored metadata', () => {
    // A day with no `_meta` has no recorded owner action to protect, so the
    // write is treated like day creation and stamps fresh provenance.
    const result = arbitrateFacebookRecurringAction({
      existingHours: { monday: { open: '11:00', close: '14:00' } },
      affectedUnitsByDay: { monday: ['schedule'] },
      fbActionAt: T2,
    });

    expect(result.appliedAny).toBe(true);
    expect(result.verdicts.monday.schedule).toEqual({ allow: true });
  });

  it('allows creating a day that does not exist yet', () => {
    const result = arbitrateFacebookRecurringAction({
      existingHours: { monday: { open: '11:00', close: '14:00' } },
      affectedUnitsByDay: { tuesday: ['schedule'] },
      fbActionAt: T2,
    });

    expect(result.appliedAny).toBe(true);
    expect(result.verdicts.tuesday.schedule).toEqual({ allow: true });
  });

  it('arbitrates schedule and location units independently', () => {
    const result = arbitrateFacebookRecurringAction({
      existingHours: {
        monday: {
          open: '11:00',
          close: '14:00',
          location: 'Old spot',
          _meta: {
            schedule: { source: 'manual', last_action_at: T1 },
            location: { source: 'manual', last_action_at: T3 },
          },
        },
      },
      affectedUnitsByDay: { monday: ['schedule', 'location'] },
      fbActionAt: T2,
    });

    // Per-unit independence: schedule orderable, location stale — the schedule
    // unit may still apply while the location unit preserves the owner value.
    expect(result.appliedAny).toBe(true);
    expect(result.verdicts.monday.schedule).toEqual({ allow: true });
    expect(result.verdicts.monday.location).toMatchObject({
      allow: false,
      code: 'RECURRING_LOCATION_STALE_OWNER_ACTION',
    });
  });

  it('allows a legacy location unit independently of an orderable schedule', () => {
    const result = arbitrateFacebookRecurringAction({
      existingHours: {
        monday: {
          open: '11:00',
          close: '14:00',
          location: 'Old spot',
          _meta: { schedule: { source: 'manual', last_action_at: T1 } },
        },
      },
      affectedUnitsByDay: { monday: ['schedule', 'location'] },
      fbActionAt: T2,
    });

    expect(result.appliedAny).toBe(true);
    expect(result.verdicts.monday.schedule).toEqual({ allow: true });
    expect(result.verdicts.monday.location).toEqual({ allow: true });
  });
});

describe('stampFacebookDayActions', () => {
  it('stamps the canonical action time and preserves untouched unit meta', () => {
    const hours = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Old spot',
        _meta: { location: { source: 'manual', last_action_at: T3 } },
      },
    };

    const stamped = stampFacebookDayActions(hours, { monday: ['schedule'] }, T2);

    expect(stamped.monday).toMatchObject({
      _meta: {
        schedule: { source: 'facebook', last_action_at: T2 },
        location: { source: 'manual', last_action_at: T3 },
      },
    });
  });

  it('stamps both units when both are affected', () => {
    const hours = { monday: { open: '11:00', close: '14:00' } };

    const stamped = stampFacebookDayActions(hours, { monday: ['schedule', 'location'] }, T2);

    expect(stamped.monday).toMatchObject({
      _meta: {
        schedule: { source: 'facebook', last_action_at: T2 },
        location: { source: 'facebook', last_action_at: T2 },
      },
    });
  });

  it('does not mutate the input hours object', () => {
    const hours = { monday: { open: '11:00', close: '14:00' } };

    stampFacebookDayActions(hours, { monday: ['schedule'] }, T2);

    expect(hours.monday).not.toHaveProperty('_meta');
  });
});

describe('readRecurringDayMeta', () => {
  it('drops malformed meta entries', () => {
    const meta = readRecurringDayMeta({
      _meta: {
        schedule: { source: 'manual', last_action_at: 'not-a-timestamp' },
        location: { source: 'unknown', last_action_at: T1 },
      },
    });

    expect(meta).toEqual({});
  });

  it('returns an empty object when no meta exists', () => {
    expect(readRecurringDayMeta({ open: '11:00' })).toEqual({});
    expect(readRecurringDayMeta(undefined)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// P4 dashboard PUT contract: the exact pipeline the route runs —
// strip client _meta → dayUnitChanges(prior, submitted) → stampManualDayActions.
// The route at app/api/trucks/[id]/route.ts composes these three pure steps;
// these tests pin their composed behavior for the provenance test matrix.
// ---------------------------------------------------------------------------

function dashboardManualProvenance(
  priorHours: unknown,
  submittedHours: unknown,
  now: string,
): { changed: boolean; stamped: Record<string, unknown> } {
  const result = applyManualRecurringProvenance(
    priorHours as never,
    submittedHours as never,
    now,
  );
  return { changed: result.changed, stamped: result.hours as Record<string, unknown> };
}

describe('dashboard PUT per-unit manual provenance (route pipeline)', () => {
  const FB_AT = '2026-08-25T21:13:47.000Z';
  const NOW = '2026-08-30T12:00:00.000Z';

  it('1. FB hours + FB location; manual hours change only stamps hours and preserves FB location', () => {
    const prior = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: '1201 Knox Ave',
        _meta: {
          schedule: { source: 'facebook', last_action_at: FB_AT },
          location: { source: 'facebook', last_action_at: FB_AT },
        },
      },
    };
    const submitted = {
      monday: { open: '12:00', close: '15:00', location: '1201 Knox Ave' },
    };

    const { changed, stamped } = dashboardManualProvenance(prior, submitted, NOW);

    expect(changed).toBe(true);
    expect(stamped.monday).toMatchObject({
      open: '12:00',
      close: '15:00',
      location: '1201 Knox Ave',
      _meta: {
        schedule: { source: 'manual', last_action_at: NOW },
        location: { source: 'facebook', last_action_at: FB_AT },
      },
    });
  });

  it('2. manual hours + FB location; location change only preserves hours stamp and stamps location', () => {
    const prior = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: '1201 Knox Ave',
        _meta: {
          schedule: { source: 'manual', last_action_at: '2026-08-20T00:00:00.000Z' },
          location: { source: 'facebook', last_action_at: FB_AT },
        },
      },
    };
    const submitted = {
      monday: { open: '11:00', close: '14:00', location: 'New Spot' },
    };

    const { changed, stamped } = dashboardManualProvenance(prior, submitted, NOW);

    expect(changed).toBe(true);
    expect(stamped.monday).toMatchObject({
      _meta: {
        schedule: { source: 'manual', last_action_at: '2026-08-20T00:00:00.000Z' },
        location: { source: 'manual', last_action_at: NOW },
      },
    });
  });

  it('3. FB hours + FB location; both changed stamps both units manual', () => {
    const prior = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Old',
        _meta: {
          schedule: { source: 'facebook', last_action_at: FB_AT },
          location: { source: 'facebook', last_action_at: FB_AT },
        },
      },
    };
    const submitted = {
      monday: { open: '10:00', close: '16:00', location: 'New' },
    };

    const { changed, stamped } = dashboardManualProvenance(prior, submitted, NOW);

    expect(changed).toBe(true);
    expect(stamped.monday).toMatchObject({
      _meta: {
        schedule: { source: 'manual', last_action_at: NOW },
        location: { source: 'manual', last_action_at: NOW },
      },
    });
  });

  it('4. identical PUT is a semantic no-op: nothing stamped', () => {
    const prior = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: '1201 Knox Ave',
        _meta: {
          schedule: { source: 'facebook', last_action_at: FB_AT },
          location: { source: 'facebook', last_action_at: FB_AT },
        },
      },
    };
    const submitted = {
      monday: { open: '11:00', close: '14:00', location: '1201 Knox Ave' },
    };

    const { changed, stamped } = dashboardManualProvenance(prior, submitted, NOW);

    expect(changed).toBe(false);
    expect(stamped).toEqual(prior);
  });

  it('ignores bogus client meta on a no-op and preserves persisted provenance', () => {
    const prior = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: '1201 Knox Ave',
        _meta: {
          schedule: { source: 'manual', last_action_at: '2026-08-20T00:00:00.000Z' },
          location: { source: 'facebook', last_action_at: FB_AT },
        },
      },
    };
    const submitted = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: '1201 Knox Ave',
        _meta: {
          schedule: { source: 'facebook', last_action_at: '2099-01-01T00:00:00.000Z' },
          location: { source: 'manual', last_action_at: '2099-01-01T00:00:00.000Z' },
        },
      },
    };

    const { changed, stamped } = dashboardManualProvenance(prior, submitted, NOW);

    expect(changed).toBe(false);
    expect(stamped).toEqual(prior);
  });

  it('5. client-supplied _meta is ignored; provenance is server-derived only', () => {
    const prior = { monday: { open: '11:00', close: '14:00', location: '1201 Knox Ave' } };
    const submitted = {
      monday: {
        open: '12:00',
        close: '15:00',
        location: '1201 Knox Ave',
        _meta: {
          schedule: { source: 'facebook', last_action_at: '2099-01-01T00:00:00.000Z' },
          location: { source: 'facebook', last_action_at: '2099-01-01T00:00:00.000Z' },
        },
      },
    };

    const { changed, stamped } = dashboardManualProvenance(prior, submitted, NOW);

    expect(changed).toBe(true);
    expect(stamped.monday).toMatchObject({
      _meta: {
        schedule: { source: 'manual', last_action_at: NOW },
      },
    });
    expect((stamped.monday as { _meta: { location?: unknown } })._meta.location).toBeUndefined();
  });

  it('6. newly added day with only hours supplied stamps only the schedule unit', () => {
    const prior = {};
    const submitted = { tuesday: { open: '10:00', close: '16:00' } };

    const { changed, stamped } = dashboardManualProvenance(prior, submitted, NOW);

    expect(changed).toBe(true);
    expect(stamped.tuesday).toMatchObject({
      _meta: { schedule: { source: 'manual', last_action_at: NOW } },
    });
    expect((stamped.tuesday as { _meta: { location?: unknown } })._meta.location).toBeUndefined();
  });

  it('new day with only a location supplied stamps only the location unit', () => {
    const prior = {};
    const submitted = { tuesday: { open: '10:00', close: '16:00', location: 'New Spot' } };

    const { changed } = dashboardManualProvenance(prior, submitted, NOW);

    expect(changed).toBe(true);
    const verdicts = dayUnitChanges(prior, submitted);
    expect(verdicts.tuesday).toEqual({ schedule: true, location: true });
  });

  it('retains manual provenance when a submitted schedule removes a weekday', () => {
    const prior = {
      monday: {
        open: '11:00',
        close: '14:00',
        location: 'Old Spot',
        _meta: {
          schedule: { source: 'facebook', last_action_at: FB_AT },
          location: { source: 'facebook', last_action_at: FB_AT },
        },
      },
    };

    const { changed, stamped } = dashboardManualProvenance(prior, {}, NOW);

    expect(changed).toBe(true);
    expect(stamped.monday).toEqual({
      closed: true,
      _meta: {
        schedule: { source: 'manual', last_action_at: NOW },
        location: { source: 'manual', last_action_at: NOW },
      },
    });
    expect(
      arbitrateFacebookRecurringAction({
        existingHours: stamped,
        affectedUnitsByDay: { monday: ['schedule', 'location'] },
        fbActionAt: FB_AT,
      }).appliedAny,
    ).toBe(false);
  });
});
