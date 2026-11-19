import { describe, it, expect } from '@jest/globals';
import { filterByDateRange } from '@/app/owner-dashboard/_components/events/useFilteredEvents';
import type { MapEvent } from '@/components/map/eventMapTypes';

function makeEvent(overrides: Partial<MapEvent> = {}): MapEvent {
  return {
    id: 'evt-1',
    name: 'Test Event',
    description: '',
    location_data: { lat: 32, lng: -81 },
    start_date: '2026-07-20',
    end_date: null,
    status: 'published',
    vendor_fee: null,
    max_vendors: null,
    organizer: null,
    ...overrides,
  };
}

describe('filterByDateRange', () => {
  it('returns all events when no dates are set', () => {
    const events = [makeEvent({ id: '1' }), makeEvent({ id: '2' })];
    const result = filterByDateRange(events, null, null);
    expect(result).toHaveLength(2);
  });

  it('filters events before startDate', () => {
    const events = [
      makeEvent({ id: '1', start_date: '2026-06-01' }),
      makeEvent({ id: '2', start_date: '2026-08-01' }),
    ];
    const result = filterByDateRange(events, '2026-07-01', null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters events after endDate', () => {
    const events = [
      makeEvent({ id: '1', start_date: '2026-06-01' }),
      makeEvent({ id: '2', start_date: '2026-08-01' }),
    ];
    const result = filterByDateRange(events, null, '2026-07-31');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters events within a date range', () => {
    const events = [
      makeEvent({ id: '1', start_date: '2026-06-01' }),
      makeEvent({ id: '2', start_date: '2026-07-15' }),
      makeEvent({ id: '3', start_date: '2026-08-01' }),
    ];
    const result = filterByDateRange(events, '2026-07-01', '2026-07-31');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('includes events exactly on startDate boundary', () => {
    const events = [makeEvent({ start_date: '2026-07-01' })];
    const result = filterByDateRange(events, '2026-07-01', null);
    expect(result).toHaveLength(1);
  });

  it('includes events exactly on endDate boundary', () => {
    const events = [makeEvent({ start_date: '2026-07-31' })];
    const result = filterByDateRange(events, null, '2026-07-31');
    expect(result).toHaveLength(1);
  });

  it('excludes events with null start_date when date filters are active', () => {
    const events = [
      makeEvent({ id: '1', start_date: null }),
      makeEvent({ id: '2', start_date: '2026-07-15' }),
    ];
    const result = filterByDateRange(events, '2026-07-01', null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns events with null start_date when no date filters are set', () => {
    const events = [makeEvent({ id: '1', start_date: null })];
    const result = filterByDateRange(events, null, null);
    expect(result).toHaveLength(1);
  });
});
