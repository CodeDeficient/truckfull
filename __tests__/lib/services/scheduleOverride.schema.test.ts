import { describe, expect, it } from '@jest/globals';
import {
  buildOverrideInsert,
  canOverrideExisting,
  canRemoveOverride,
  isValidServiceDate,
  isValidTimezone,
  validateOverrideShape,
  type OverrideShape,
  type OverrideSource,
} from '@/lib/services/scheduleOverride';

const normalShape: OverrideShape = {
  serviceDate: '2026-08-15',
  isClosed: false,
  isAllDay: false,
  startTime: '11:00',
  endTime: '14:00',
  endsNextDay: false,
};

describe('validateOverrideShape', () => {
  it('accepts a normal timed override', () => {
    expect(validateOverrideShape(normalShape)).toEqual({ valid: true });
  });

  it('accepts a closed override without times', () => {
    expect(
      validateOverrideShape({
        ...normalShape,
        isClosed: true,
        startTime: null,
        endTime: null,
      }),
    ).toEqual({ valid: true });
  });

  it('accepts an all-day override without times', () => {
    expect(
      validateOverrideShape({
        ...normalShape,
        isAllDay: true,
        startTime: null,
        endTime: null,
      }),
    ).toEqual({ valid: true });
  });

  it('accepts an overnight timed override', () => {
    expect(
      validateOverrideShape({
        ...normalShape,
        startTime: '22:00',
        endTime: '02:00',
        endsNextDay: true,
      }),
    ).toEqual({ valid: true });
  });

  it('rejects closed overrides with times', () => {
    expect(validateOverrideShape({ ...normalShape, isClosed: true })).toEqual({
      valid: false,
      reason: 'Closed override must not carry times',
    });
  });

  it('rejects all-day overrides with times', () => {
    expect(validateOverrideShape({ ...normalShape, isAllDay: true })).toEqual({
      valid: false,
      reason: 'All-day override must not carry times',
    });
  });

  it('rejects normal overrides without both times', () => {
    expect(validateOverrideShape({ ...normalShape, endTime: null })).toEqual({
      valid: false,
      reason: 'Normal override requires both start and end times',
    });
  });

  it('rejects malformed timed overrides before persistence', () => {
    expect(validateOverrideShape({ ...normalShape, startTime: '9:99' })).toEqual({
      valid: false,
      reason: 'Override times must use HH:MM format',
    });
  });

  it('rejects equal start and end times', () => {
    expect(validateOverrideShape({ ...normalShape, endTime: '11:00' })).toEqual({
      valid: false,
      reason: 'Start and end times must differ',
    });
  });
});

describe('canOverrideExisting', () => {
  const sources: OverrideSource[] = ['admin', 'manual', 'facebook'];

  it('enforces admin over manual over facebook precedence', () => {
    expect(canOverrideExisting('admin', 'manual')).toBe(true);
    expect(canOverrideExisting('admin', 'facebook')).toBe(true);
    expect(canOverrideExisting('manual', 'admin')).toBe(false);
    expect(canOverrideExisting('manual', 'facebook')).toBe(true);
    expect(canOverrideExisting('facebook', 'admin')).toBe(false);
    expect(canOverrideExisting('facebook', 'manual')).toBe(false);
  });

  it('allows an owner edit to convert a Facebook date into a manual override', () => {
    expect(canOverrideExisting('manual', 'facebook')).toBe(true);
    expect(canOverrideExisting('facebook', 'manual')).toBe(false);
  });

  it('allows equal-source replacement and new rows', () => {
    for (const source of sources) {
      expect(canOverrideExisting(source, source)).toBe(true);
      expect(canOverrideExisting(source, null)).toBe(true);
    }
  });

  it('prevents owners from removing admin overrides', () => {
    expect(canRemoveOverride('food_truck_owner', 'admin')).toBe(false);
    expect(canRemoveOverride('food_truck_owner', 'manual')).toBe(true);
    expect(canRemoveOverride('admin', 'admin')).toBe(true);
  });

  it('rejects calendar dates that JavaScript would normalize', () => {
    expect(isValidServiceDate('2026-02-31')).toBe(false);
    expect(isValidServiceDate('2026-08-06')).toBe(true);
  });
});

describe('isValidTimezone', () => {
  it('accepts IANA timezones and rejects missing or invalid values', () => {
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone('Invalid/Timezone')).toBe(false);
  });
});

describe('buildOverrideInsert', () => {
  it('preserves the source post ID and all override fields', () => {
    const row = buildOverrideInsert({
      truckId: 'truck-1',
      shape: normalShape,
      source: 'facebook',
      sourcePostId: 'post-1',
      timezone: 'America/New_York',
      now: '2026-08-03T15:00:00.000Z',
      sourcePostCreatedAt: '2026-08-03T14:00:00.000Z',
    });

    expect(row).toEqual({
      food_truck_id: 'truck-1',
      service_date: '2026-08-15',
      is_closed: false,
      is_all_day: false,
      start_time: '11:00',
      end_time: '14:00',
      ends_next_day: false,
      timezone: 'America/New_York',
      source_type: 'facebook',
      source_post_id: 'post-1',
      location_data: null,
      source_post_created_at: '2026-08-03T14:00:00.000Z',
      updated_at: '2026-08-03T15:00:00.000Z',
    });
  });

  it('keeps dated location metadata separate from the truck address', () => {
    expect(
      buildOverrideInsert({
        truckId: 'truck-1',
        shape: { ...normalShape, location: { address: 'Marion Square', city: 'Augusta', state: 'GA' } },
        source: 'facebook',
        sourcePostId: 'post-1',
        timezone: 'America/New_York',
        now: '2026-08-03T15:00:00.000Z',
        sourcePostCreatedAt: '2026-08-03T14:00:00.000Z',
      }),
    ).toMatchObject({
      location_data: { address: 'Marion Square', city: 'Augusta', state: 'GA' },
      source_post_created_at: '2026-08-03T14:00:00.000Z',
    });
  });
});
