import { describe, it, expect } from '@jest/globals';

const { findDuplicates, ExternalEventForDedup } = await import('@/lib/events/eventDedup');

describe('findDuplicates', () => {
  it('exact same title + same date + same city from different sources → high confidence match', () => {
    const events: ExternalEventForDedup[] = [
      {
        id: '1',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'Eventbrite',
      },
      {
        id: '2',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'CityCalendar',
      },
    ];

    const result = findDuplicates(events);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe('high');
    expect(result[0].eventIds).toEqual(['1', '2']);
  });

  it('similar title (partial word overlap) + same date + same city → medium confidence match', () => {
    const events: ExternalEventForDedup[] = [
      {
        id: '1',
        title: 'Food Truck Festival',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'Eventbrite',
      },
      {
        id: '2',
        title: 'Great Food Truck Festival',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: null,
        location_lng: null,
        source: 'CityCalendar',
      },
    ];

    const result = findDuplicates(events);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe('medium');
  });

  it('completely different events → no match', () => {
    const events: ExternalEventForDedup[] = [
      {
        id: '1',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'Eventbrite',
      },
      {
        id: '2',
        title: 'Jazz Concert',
        event_start_date: '2024-07-20T20:00:00Z',
        location_address: '456 Oak Ave',
        city: 'Denver',
        state: 'CO',
        location_lat: 39.7392,
        location_lng: -104.9903,
        source: 'CityCalendar',
      },
    ];

    const result = findDuplicates(events);
    expect(result).toHaveLength(0);
  });

  it('same source events → no match (skip same-source)', () => {
    const events: ExternalEventForDedup[] = [
      {
        id: '1',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'Eventbrite',
      },
      {
        id: '2',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'Eventbrite',
      },
    ];

    const result = findDuplicates(events);
    expect(result).toHaveLength(0);
  });

  it('same event in 3+ sources → grouped together', () => {
    const events: ExternalEventForDedup[] = [
      {
        id: '1',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'Eventbrite',
      },
      {
        id: '2',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'CityCalendar',
      },
      {
        id: '3',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'CVB',
      },
    ];

    const result = findDuplicates(events);
    expect(result).toHaveLength(1);
    expect(result[0].eventIds).toHaveLength(3);
    expect(result[0].eventIds).toContain('1');
    expect(result[0].eventIds).toContain('2');
    expect(result[0].eventIds).toContain('3');
  });

  it('one event has null date → no match', () => {
    const events: ExternalEventForDedup[] = [
      {
        id: '1',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'Eventbrite',
      },
      {
        id: '2',
        title: 'Food Truck Friday',
        event_start_date: null,
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'CityCalendar',
      },
    ];

    const result = findDuplicates(events);
    expect(result).toHaveLength(0);
  });

  it('events with same title but different dates → no match', () => {
    const events: ExternalEventForDedup[] = [
      {
        id: '1',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'Eventbrite',
      },
      {
        id: '2',
        title: 'Food Truck Friday',
        event_start_date: '2024-07-22T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'CityCalendar',
      },
    ];

    const result = findDuplicates(events);
    expect(result).toHaveLength(0);
  });

  it('events near each other (<0.5mi) with similar titles → high confidence', () => {
    const events: ExternalEventForDedup[] = [
      {
        id: '1',
        title: 'Food Truck Festival',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2672,
        location_lng: -97.7431,
        source: 'Eventbrite',
      },
      {
        id: '2',
        title: 'Food Truck Festival',
        event_start_date: '2024-07-15T18:00:00Z',
        location_address: '124 Main St',
        city: 'Austin',
        state: 'TX',
        location_lat: 30.2675,
        location_lng: -97.7435,
        source: 'CityCalendar',
      },
    ];

    const result = findDuplicates(events);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe('high');
  });
});
