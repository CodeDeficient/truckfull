import { describe, it, expect } from '@jest/globals';
import {
  collapseConsecutiveDays,
  collapseSameDateDuplicates,
  type CollapsibleEvent,
} from '@/lib/events/collapseEvents';

function ev(partial: Partial<CollapsibleEvent>): CollapsibleEvent {
  return {
    id: partial.id ?? 'id',
    title: partial.title ?? 'Event',
    city: partial.city ?? 'Savannah',
    state: partial.state ?? 'GA',
    locationAddress: partial.locationAddress ?? '123 Main St',
    eventStartDate: partial.eventStartDate ?? '2026-07-01',
    eventEndDate: partial.eventEndDate ?? null,
    vettingScore: partial.vettingScore ?? 50,
    sourceUrl: partial.sourceUrl ?? null,
  };
}

describe('collapseSameDateDuplicates', () => {
  it('merges events with same title + city + date into one', () => {
    const result = collapseSameDateDuplicates([
      ev({ id: 'a', title: 'Food Truck Friday', eventStartDate: '2026-07-15' }),
      ev({ id: 'b', title: 'Food Truck Friday', eventStartDate: '2026-07-15' }),
    ]);
    expect(result).toHaveLength(1);
  });

  it('keeps events with same date but different titles separate', () => {
    const result = collapseSameDateDuplicates([
      ev({ id: 'a', title: 'Event A', eventStartDate: '2026-07-15' }),
      ev({ id: 'b', title: 'Event B', eventStartDate: '2026-07-15' }),
    ]);
    expect(result).toHaveLength(2);
  });

  it('keeps events with same title but different dates separate', () => {
    const result = collapseSameDateDuplicates([
      ev({ id: 'a', eventStartDate: '2026-07-15' }),
      ev({ id: 'b', eventStartDate: '2026-07-16' }),
    ]);
    expect(result).toHaveLength(2);
  });

  it('ignores case and surrounding whitespace in title and city', () => {
    const result = collapseSameDateDuplicates([
      ev({ id: 'a', title: 'Food Truck Friday ', city: 'savannah' }),
      ev({ id: 'b', title: 'food truck friday', city: 'Savannah' }),
    ]);
    expect(result).toHaveLength(1);
  });
});

describe('collapseConsecutiveDays', () => {
  it('collapses 3 consecutive-day events into one with end date', () => {
    const result = collapseConsecutiveDays([
      ev({ id: 'a', eventStartDate: '2026-07-01' }),
      ev({ id: 'b', eventStartDate: '2026-07-02' }),
      ev({ id: 'c', eventStartDate: '2026-07-03' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].eventStartDate).toBe('2026-07-01');
    expect(result[0].eventEndDate).toBe('2026-07-03');
  });

  it('does not collapse events with different titles', () => {
    const result = collapseConsecutiveDays([
      ev({ id: 'a', title: 'Event A', eventStartDate: '2026-07-01' }),
      ev({ id: 'b', title: 'Event B', eventStartDate: '2026-07-02' }),
    ]);
    expect(result).toHaveLength(2);
  });

  it('does not collapse events with non-consecutive dates', () => {
    const result = collapseConsecutiveDays([
      ev({ id: 'a', eventStartDate: '2026-07-01' }),
      ev({ id: 'b', eventStartDate: '2026-07-03' }),
    ]);
    expect(result).toHaveLength(2);
  });

  it('does not collapse events with same title but different addresses', () => {
    const result = collapseConsecutiveDays([
      ev({ id: 'a', locationAddress: '123 Main', eventStartDate: '2026-07-01' }),
      ev({ id: 'b', locationAddress: '456 Elm', eventStartDate: '2026-07-02' }),
    ]);
    expect(result).toHaveLength(2);
  });

  it('handles single events without setting an end date', () => {
    const result = collapseConsecutiveDays([
      ev({ id: 'a', eventStartDate: '2026-07-01' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].eventEndDate).toBeNull();
  });

  it('collapses across interleaved titles and returns soonest first', () => {
    const result = collapseConsecutiveDays([
      ev({ id: 'a', eventStartDate: '2026-07-01' }),
      ev({ id: 'b', eventStartDate: '2026-07-02' }),
      ev({ id: 'c', title: 'Aaa Event', eventStartDate: '2026-07-03' }),
      ev({ id: 'd', eventStartDate: '2026-07-04' }),
    ]);
    expect(result.map((e) => e.id)).toEqual(['a', 'c', 'd']);
    expect(result[0].eventEndDate).toBe('2026-07-02');
  });

  it('orders by start date even when titles sort the other way', () => {
    const result = collapseConsecutiveDays([
      ev({ id: 'late', title: 'Aaa Late', eventStartDate: '2026-08-01' }),
      ev({ id: 'early', title: 'Zzz Early', eventStartDate: '2026-07-01' }),
    ]);
    expect(result.map((e) => e.id)).toEqual(['early', 'late']);
  });

  it('produces identical output regardless of input order', () => {
    const a = ev({ id: 'rsam-11-06', eventStartDate: '2026-11-06' });
    const porchfest = ev({
      id: 'porchfest-11-07',
      title: 'Savannah Porchfest',
      eventStartDate: '2026-11-07',
    });
    const rsam1 = ev({ id: 'rsam-11-07', eventStartDate: '2026-11-07' });
    const monterey = ev({
      id: 'monterey-11-08',
      title: 'Shalom Food Festival',
      eventStartDate: '2026-11-08',
    });
    const rsam2 = ev({ id: 'rsam-11-08', eventStartDate: '2026-11-08' });

    const orderA = collapseConsecutiveDays([a, rsam1, porchfest, rsam2, monterey]);
    const orderB = collapseConsecutiveDays([a, porchfest, rsam1, monterey, rsam2]);
    const orderC = collapseConsecutiveDays([rsam2, monterey, porchfest, rsam1, a]);

    expect(orderA.map((e) => ({ id: e.id, start: e.eventStartDate, end: e.eventEndDate }))).toEqual(
      orderB.map((e) => ({ id: e.id, start: e.eventStartDate, end: e.eventEndDate })),
    );
    expect(orderA.map((e) => ({ id: e.id, start: e.eventStartDate, end: e.eventEndDate }))).toEqual(
      orderC.map((e) => ({ id: e.id, start: e.eventStartDate, end: e.eventEndDate })),
    );
  });
});
