import { describe, expect, it } from '@jest/globals';
import { effectiveHoursForDate } from '@/lib/services/scheduleOverride';
import { calendarRange, compactScheduleTimes, compactTimeRange, getMonthDates, summarizeScheduleCell, scheduleCellShowsSourceLabel, scheduleCellClosedLabel } from '@/app/owner-dashboard/_components/ScheduleCalendar';
import { formatServiceDate, getDeleteDialogCopy } from '@/app/owner-dashboard/_components/ScheduleTab';
import {
  actionKeyForDock,
  shouldUseParticleAnimation,
  shouldContinueSettling,
  shouldLockSettledPointer,
  cellInteractionClass,
  cellInteractionTarget,
} from '@/app/owner-dashboard/_components/ParticleActionLayer';

describe('ScheduleCalendar', () => {
  it('loads the full visible six-week grid range', () => {
    const dates = getMonthDates(new Date('2026-08-01T00:00:00Z'));
    expect(calendarRange(dates)).toEqual({ from: '2026-07-26', to: '2026-09-05' });
  });

  it('renders only the weeks needed to contain the month', () => {
    const august = getMonthDates(new Date('2026-08-01T00:00:00Z'));
    expect(august).toHaveLength(42); // Aug 2026 spans six calendar weeks

    const september = getMonthDates(new Date('2026-09-01T00:00:00Z'));
    expect(september).toHaveLength(35); // five weeks only
    expect(september.at(-1)?.key).toBe('2026-10-03'); // ends with Sep 27–30 / Oct 1–3 week
    expect(september.some((date) => date.key === '2026-10-04')).toBe(false); // no Oct 4–10 row
  });

  it('shows a dated override instead of the recurring result', () => {
    const effective = effectiveHoursForDate(
      '2026-08-03',
      'America/New_York',
      { monday: { open: '09:00', close: '17:00', location: 'Weekly stop' } },
      {
        serviceDate: '2026-08-03',
        isClosed: false,
        isAllDay: false,
        startTime: '11:00',
        endTime: '14:00',
        endsNextDay: false,
        timezone: 'America/New_York',
        location: { address: 'Facebook stop' },
      },
    );

    expect(summarizeScheduleCell(effective, true)).toEqual({
      status: '11:00 AM - 2:00 PM',
      source: 'One-off',
      location: 'Facebook stop',
    });
  });

  it('keeps dated override semantics without rendering source badges', () => {
    expect(scheduleCellShowsSourceLabel('One-off')).toBe(false);
    expect(scheduleCellShowsSourceLabel('Recurring')).toBe(false);
  });

  it('keeps both compact time endpoints on one line', () => {
    expect(compactScheduleTimes('09:30', '22:45')).toEqual(['9:30a', '10:45p']);
    expect(compactTimeRange('09:30', '22:45')).toBe('9:30a-10:45p');
  });

  it('drops minutes only when they are zero on the compact range', () => {
    expect(compactTimeRange('17:00', '20:00')).toBe('5p-8p');
  });

  it('distinguishes an explicit close from a recurring day with no hours', () => {
    const closed = effectiveHoursForDate(
      '2026-08-04',
      'America/New_York',
      {},
      {
        serviceDate: '2026-08-04',
        isClosed: true,
        isAllDay: false,
        startTime: null,
        endTime: null,
        endsNextDay: false,
        timezone: 'America/New_York',
        location: { address: 'Facebook stop' },
      },
    );
    const noHours = effectiveHoursForDate('2026-08-04', 'America/New_York', {}, null);

    expect(summarizeScheduleCell(closed, true).status).toBe('Closed');
    expect(summarizeScheduleCell(noHours, false).status).toBe('No hours');
  });

  it('renders no status label for a day with merely no configured hours', () => {
    const noHours = effectiveHoursForDate('2026-08-04', 'America/New_York', {}, null);

    expect(scheduleCellClosedLabel(noHours)).toBeNull();
  });

  it('keeps the closed label visible for an explicitly closed day', () => {
    const closed = effectiveHoursForDate(
      '2026-08-04',
      'America/New_York',
      {},
      {
        serviceDate: '2026-08-04',
        isClosed: true,
        isAllDay: false,
        startTime: null,
        endTime: null,
        endsNextDay: false,
        timezone: 'America/New_York',
        location: { address: 'Facebook stop' },
      },
    );

    expect(scheduleCellClosedLabel(closed)).toBe('Closed');
  });

  it('keeps scheduled hours and location unchanged for an open day', () => {
    const effective = effectiveHoursForDate(
      '2026-08-05',
      'America/New_York',
      { wednesday: { open: '09:00', close: '17:00', location: 'Weekly stop' } },
      null,
    );

    expect(scheduleCellClosedLabel(effective)).toBeNull();
    expect(summarizeScheduleCell(effective, false)).toEqual({
      status: '9:00 AM - 5:00 PM',
      source: 'Recurring',
      location: 'Weekly stop',
    });
  });

  it('locks the particle dock once its icon formation is mostly settled', () => {
    expect(shouldLockSettledPointer(0.72)).toBe(true);
    expect(shouldLockSettledPointer(0.9)).toBe(true);
    expect(shouldLockSettledPointer(0.71)).toBe(false);
  });

  it('does not reverse a formation after settling begins', () => {
    expect(shouldContinueSettling(true)).toBe(true);
    expect(shouldContinueSettling(false)).toBe(false);
  });

  it('dispatches dock actions for the currently targeted cell', () => {
    expect(actionKeyForDock('2026-08-01', '2026-08-18')).toBe('2026-08-18');
    expect(actionKeyForDock('2026-08-18', null)).toBe('2026-08-18');
  });

  it('disables particle animation when the user turns animations off', () => {
    expect(shouldUseParticleAnimation(true, false)).toBe(true);
    expect(shouldUseParticleAnimation(false, false)).toBe(false);
    expect(shouldUseParticleAnimation(true, true)).toBe(false);
  });

  it('single interaction glow follows hover over the selected cell, else parks on selection', () => {
    expect(cellInteractionTarget('2026-08-18', '2026-08-11')).toBe('2026-08-18');
    expect(cellInteractionTarget(null, '2026-08-11')).toBe('2026-08-11');
  });

  it('marks only the single interaction target with the glow class', () => {
    expect(cellInteractionClass('2026-08-18', '2026-08-11', '2026-08-18')).toBe('selected');
    expect(cellInteractionClass('2026-08-18', '2026-08-11', '2026-08-25')).toBeNull();
    expect(cellInteractionClass('2026-08-11', '2026-08-11', '2026-08-25')).toBeNull();
    expect(cellInteractionClass('2026-08-25', '2026-08-11', '2026-08-25')).toBe('selected');
    expect(cellInteractionClass('2026-08-11', '2026-08-11', null)).toBe('selected');
    expect(cellInteractionClass('2026-08-18', '2026-08-11', null)).toBeNull();
  });

  it('reveals recurring hours when an open dated override is removed', () => {
    const recurring = { thursday: { open: '12:00', close: '16:00' } };
    const effective = effectiveHoursForDate('2026-08-06', 'America/New_York', recurring, null);

    expect(summarizeScheduleCell(effective, false).status).toBe('12:00 PM - 4:00 PM');
  });

  it('keeps future recurring Thursdays open when one date is manually closed', () => {
    const recurring = { thursday: { open: '12:00', close: '16:00' } };
    const closedDate = effectiveHoursForDate(
      '2026-08-06',
      'America/New_York',
      recurring,
      {
        serviceDate: '2026-08-06',
        isClosed: true,
        isAllDay: false,
        startTime: null,
        endTime: null,
        endsNextDay: false,
        timezone: 'America/New_York',
        location: null,
      },
    );
    const futureDate = effectiveHoursForDate('2026-08-13', 'America/New_York', recurring, null);

    expect(summarizeScheduleCell(closedDate, true).status).toBe('Closed');
    expect(summarizeScheduleCell(futureDate, false).status).toBe('12:00 PM - 4:00 PM');
  });

  it('formats recurring and date-specific delete choices distinctly', () => {
    expect(getDeleteDialogCopy({ kind: 'recurring', day: 'thursday', serviceDate: '2026-08-06' })).toEqual({
      title: 'Close schedule',
      description: 'Choose whether to close every Thursday or close only Thursday, August 6, 2026.',
      primary: 'Close every Thursday',
      secondary: 'Close Thursday, August 6, 2026 only',
    });
    expect(getDeleteDialogCopy({ kind: 'dated', day: 'thursday', serviceDate: '2026-08-06' })).toEqual({
      title: 'Change date-specific schedule',
      description: 'Choose whether to remove the date-specific schedule or close Thursday, August 6, 2026.',
      primary: 'Remove date-specific schedule',
      secondary: 'Close Thursday, August 6, 2026',
    });
    expect(formatServiceDate('2026-08-06')).toBe('Thursday, August 6, 2026');
  });
});
