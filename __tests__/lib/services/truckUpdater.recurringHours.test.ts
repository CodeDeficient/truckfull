import { describe, expect, it } from '@jest/globals';
import { buildOperatingHours, mergeRecurringDay } from '@/lib/services/truckUpdater';
import type { RecurringDayEntry } from '@/lib/services/truckUpdater';

describe('buildOperatingHours — recurring day-entry semantics', () => {
  it('writes open hours for each canonical weekday', () => {
    const hours = buildOperatingHours('11:00', '14:00', ['monday', 'tuesday']);
    expect(hours).toEqual({
      monday: { open: '11:00', close: '14:00' },
      tuesday: { open: '11:00', close: '14:00' },
    });
  });

  it('attaches the incoming recurring service location to each affected day', () => {
    const hours = buildOperatingHours(
      '11:00',
      '14:00',
      ['monday'],
      '1201 Knox Ave, North Augusta, SC 29841',
    );
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      location: '1201 Knox Ave, North Augusta, SC 29841',
    });
  });

  it('does not add a location key when no recurring location is supplied', () => {
    const hours = buildOperatingHours('11:00', '14:00', ['monday']);
    expect(hours.monday).toEqual({ open: '11:00', close: '14:00' });
    expect('location' in (hours.monday ?? {})).toBe(false);
  });

  it('marks overnight ranges with endsNextDay', () => {
    const hours = buildOperatingHours('20:00', '02:00', ['friday']);
    expect(hours.friday).toMatchObject({ open: '20:00', close: '02:00', endsNextDay: true });
  });
});

describe('mergeRecurringDay — stale closed and location semantics', () => {
  it('replaces a stale closed marker when setting new hours without a location', () => {
    const existing: Record<string, RecurringDayEntry> = {
      monday: { open: '00:00', close: '00:00', location: 'Old' },
    };
    (existing.monday as Record<string, unknown>).closed = true;
    const next = mergeRecurringDay(existing, 'monday', '11:00', '14:00');
    expect(next.monday).toEqual({ open: '11:00', close: '14:00', location: 'Old' });
    expect('closed' in (next.monday ?? {})).toBe(false);
  });

  it('lets an incoming location replace the existing day location', () => {
    const existing: Record<string, RecurringDayEntry> = {
      monday: { open: '09:00', close: '17:00', location: 'Old spot' },
    };
    const next = mergeRecurringDay(existing, 'monday', '11:00', '14:00', 'New spot');
    expect(next.monday).toMatchObject({ open: '11:00', close: '14:00', location: 'New spot' });
    expect('closed' in (next.monday ?? {})).toBe(false);
  });

  it('keeps unrelated days byte-for-byte unchanged', () => {
    const existing: Record<string, RecurringDayEntry> = {
      monday: { open: '09:00', close: '17:00', location: 'A' },
      wednesday: { open: '10:00', close: '18:00', location: 'B', endsNextDay: true },
    };
    const next = mergeRecurringDay(existing, 'monday', '11:00', '14:00');
    expect(next.wednesday).toBe(existing.wednesday);
    expect(next.sunday).toBeUndefined();
  });
});
