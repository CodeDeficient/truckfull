import { describe, expect, it } from '@jest/globals';
import {
  needsTimezoneBackfill,
  selectTrucksNeedingTimezoneBackfill,
} from '@/lib/api/trucks/timezoneEnrichment';

describe('needsTimezoneBackfill', () => {
  it('does not backfill a truck that already has a timezone string', () => {
    expect(needsTimezoneBackfill({ id: 'a', timezone: 'America/New_York' })).toBe(false);
  });

  it('does not backfill when the source explicitly reports a null timezone', () => {
    expect(needsTimezoneBackfill({ id: 'a', timezone: null })).toBe(false);
  });

  it('does not backfill when the source explicitly reports an undefined timezone', () => {
    expect(needsTimezoneBackfill({ id: 'a', timezone: undefined })).toBe(false);
  });

  it('backfills when the source omits the timezone key entirely', () => {
    expect(needsTimezoneBackfill({ id: 'a' })).toBe(true);
  });
});

describe('selectTrucksNeedingTimezoneBackfill', () => {
  it('returns only trucks whose source omitted timezone', () => {
    const trucks = [
      { id: 'has', timezone: 'America/New_York' },
      { id: 'null', timezone: null },
      { id: 'omitted' },
    ];
    expect(selectTrucksNeedingTimezoneBackfill(trucks).map((truck) => truck.id)).toEqual(['omitted']);
  });

  it('returns an empty list when the source always supplies timezone', () => {
    const trucks = [
      { id: 'a', timezone: 'America/New_York' },
      { id: 'b', timezone: null },
    ];
    expect(selectTrucksNeedingTimezoneBackfill(trucks)).toEqual([]);
  });

  it('handles an empty list', () => {
    expect(selectTrucksNeedingTimezoneBackfill([])).toEqual([]);
  });
});
