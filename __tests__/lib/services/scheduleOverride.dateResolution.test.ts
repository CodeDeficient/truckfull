import { describe, expect, it } from '@jest/globals';
import {
  resolveDateReferences,
  resolveServiceDate,
  dateKeyInTimezone,
  isValidTimezone,
  type DateResolutionInput,
} from '@/lib/services/scheduleOverride';
import { formatHourMinuteInTimezone } from '@/lib/services/timezoneFormatter';

function countFormatterConstructions(run: () => void): number {
  const original = Intl.DateTimeFormat;
  let count = 0;
  Intl.DateTimeFormat = new Proxy(original, {
    construct(target, args) {
      count += 1;
      return Reflect.construct(target, args);
    },
  });
  try {
    run();
    return count;
  } finally {
    Intl.DateTimeFormat = original;
  }
}

describe('timezone date formatting in repeated rendering', () => {
  it('reuses formatting resources while dates cross local midnight', () => {
    const count = countFormatterConstructions(() => {
      for (let index = 0; index < 200; index += 1) {
        expect(dateKeyInTimezone('2026-08-03T10:00:00.000Z', 'Pacific/Honolulu')).toBe('2026-08-03');
        expect(dateKeyInTimezone('2026-08-03T09:59:59.000Z', 'Pacific/Honolulu')).toBe('2026-08-02');
      }
    });
    expect(count).toBeLessThanOrEqual(2);
  });

  it('does not repeatedly construct formatters for an invalid timezone', () => {
    const count = countFormatterConstructions(() => {
      for (let index = 0; index < 200; index += 1) {
        expect(isValidTimezone('Invalid/RepeatedRenderZone')).toBe(false);
        expect(dateKeyInTimezone('2026-08-03T10:00:00.000Z', 'Invalid/RepeatedRenderZone')).toBeNull();
      }
    });
    expect(count).toBeLessThanOrEqual(1);
  });

  it('keeps daylight-saving transitions correct with reused formatting resources', () => {
    expect(dateKeyInTimezone('2026-03-08T06:59:59.000Z', 'America/New_York')).toBe('2026-03-08');
    expect(dateKeyInTimezone('2026-03-08T07:00:00.000Z', 'America/New_York')).toBe('2026-03-08');
    expect(dateKeyInTimezone('2026-11-01T05:59:59.000Z', 'America/New_York')).toBe('2026-11-01');
    expect(dateKeyInTimezone('2026-11-01T06:00:00.000Z', 'America/New_York')).toBe('2026-11-01');
  });

  it('reuses hour formatters and reports local time across zones', () => {
    const count = countFormatterConstructions(() => {
      for (let index = 0; index < 200; index += 1) {
        expect(formatHourMinuteInTimezone(new Date('2026-08-03T15:30:00.000Z'), 'America/New_York')).toEqual(
          { hour: 11, minute: 30 },
        );
      }
    });
    expect(count).toBeLessThanOrEqual(1);
    expect(formatHourMinuteInTimezone(new Date('2026-08-03T15:30:00.000Z'), 'America/Los_Angeles')).toEqual(
      { hour: 8, minute: 30 },
    );
  });
});

describe('resolveServiceDate', () => {
  const baseInput = (overrides?: Partial<DateResolutionInput>): DateResolutionInput => ({
    dateReference: 'today',
    createdAt: '2026-08-03T15:00:00.000Z',
    timezone: 'America/New_York',
    ...overrides,
  });

  it('resolves today using the Facebook creation timestamp in the truck timezone', () => {
    expect(resolveServiceDate(baseInput())).toEqual({
      status: 'resolved',
      serviceDate: '2026-08-03',
    });
  });

  it('resolves tomorrow across a local date boundary', () => {
    expect(
      resolveServiceDate(
        baseInput({ dateReference: 'tomorrow', createdAt: '2026-08-03T01:30:00.000Z' }),
      ),
    ).toEqual({ status: 'resolved', serviceDate: '2026-08-03' });
  });

  it('resolves this Friday as the next Friday on or after the local post date', () => {
    expect(resolveServiceDate(baseInput({ dateReference: 'this Friday' }))).toEqual({
      status: 'resolved',
      serviceDate: '2026-08-07',
    });
  });

  it('uses the Facebook timestamp year for an explicit month and day', () => {
    expect(resolveServiceDate(baseInput({ dateReference: 'August 15' }))).toEqual({
      status: 'resolved',
      serviceDate: '2026-08-15',
    });
  });

  it('rolls a past yearless month/day reference to the next occurrence', () => {
    expect(
      resolveServiceDate(
        baseInput({ dateReference: 'January 1', createdAt: '2026-12-31T15:00:00.000Z' }),
      ),
    ).toEqual({ status: 'resolved', serviceDate: '2027-01-01' });
  });

  it('resolves an explicit ISO date', () => {
    expect(resolveServiceDate(baseInput({ dateReference: '2027-01-02' }))).toEqual({
      status: 'resolved',
      serviceDate: '2027-01-02',
    });
  });

  it('resolves a slash-separated ISO date', () => {
    expect(resolveServiceDate(baseInput({ dateReference: '2027/01/02' }))).toEqual({
      status: 'resolved',
      serviceDate: '2027-01-02',
    });
  });

  it('fails closed for an invalid timezone', () => {
    expect(resolveServiceDate(baseInput({ timezone: 'Invalid/Timezone' }))).toEqual({
      status: 'unresolved',
      reason: 'Invalid timezone',
    });
  });

  it('fails closed for an ambiguous date reference', () => {
    expect(resolveServiceDate(baseInput({ dateReference: 'sometime next week' }))).toEqual({
      status: 'unresolved',
      reason: 'Unsupported date reference',
    });
  });

  it('fails closed when required metadata is missing', () => {
    expect(resolveServiceDate(baseInput({ dateReference: '' }))).toEqual({
      status: 'unresolved',
      reason: 'Missing date reference, created time, or timezone',
    });
  });
});

describe('resolveDateReferences', () => {
  const baseInput = (dateReferences: string[], overrides?: Partial<DateResolutionInput>) => ({
    dateReferences,
    createdAt: '2026-08-25T16:00:00.000Z',
    timezone: 'America/New_York',
    ...overrides,
  });

  it('accepts today, weekday, and explicit date aliases for one service date', () => {
    expect(resolveDateReferences(baseInput(['today', 'Tuesday', 'August 25, 2026']))).toEqual({
      status: 'resolved',
      serviceDate: '2026-08-25',
    });
  });

  it('accepts today plus an equivalent explicit date', () => {
    expect(resolveDateReferences(baseInput(['today', 'August 25, 2026']))).toEqual({
      status: 'resolved',
      serviceDate: '2026-08-25',
    });
  });

  it('accepts this Saturday plus the matching explicit date', () => {
    expect(resolveDateReferences(baseInput(['this Saturday', 'August 29']))).toEqual({
      status: 'resolved',
      serviceDate: '2026-08-29',
    });
  });

  it('resolves abbreviated this-weekday references', () => {
    expect(resolveDateReferences(baseInput(['this Tues']))).toEqual({
      status: 'resolved',
      serviceDate: '2026-08-25',
    });
  });

  it('accepts an abbreviated weekday constraint for the matching explicit date', () => {
    expect(resolveDateReferences(baseInput(['Tue', 'August 25']))).toEqual({
      status: 'resolved',
      serviceDate: '2026-08-25',
    });
  });

  it('rejects an explicit date with the wrong weekday', () => {
    expect(resolveDateReferences(baseInput(['Tuesday', 'August 26, 2026']))).toEqual({
      status: 'unresolved',
      reason: 'Date references resolve to conflicting service dates',
    });
  });

  it('rejects today with a conflicting explicit date', () => {
    expect(resolveDateReferences(baseInput(['today', 'August 26, 2026']))).toEqual({
      status: 'unresolved',
      reason: 'Date references resolve to conflicting service dates',
    });
  });

  it('rejects today with a conflicting weekday constraint', () => {
    expect(resolveDateReferences(baseInput(['today', 'Monday']))).toEqual({
      status: 'unresolved',
      reason: 'Date references resolve to conflicting service dates',
    });
  });

  it('uses the truck timezone when resolving today', () => {
    expect(
      resolveDateReferences(
        baseInput(['today', 'Tuesday', 'August 25'], {
          createdAt: '2026-08-26T01:30:00.000Z',
          timezone: 'America/Los_Angeles',
        }),
      ),
    ).toEqual({ status: 'resolved', serviceDate: '2026-08-25' });
  });

  it('rejects unresolved date expressions', () => {
    expect(resolveDateReferences(baseInput(['today', 'sometime next week']))).toEqual({
      status: 'unresolved',
      reason: 'Date reference could not be resolved: sometime next week',
    });
  });
});
