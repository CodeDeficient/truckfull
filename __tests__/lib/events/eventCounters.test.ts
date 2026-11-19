import { describe, it, expect } from '@jest/globals';
import { computeEventCounters, formatCounterText } from '@/lib/events/eventCounters';
import type { MapEvent } from '@/components/map/eventMapTypes';

function makeEvent(
  id: string,
  lat: number | null,
  lng: number | null,
): MapEvent {
  return {
    id,
    name: `Event ${id}`,
    description: '',
    location_data: { lat, lng },
    start_date: '2026-07-20',
    end_date: null,
    status: 'published',
    vendor_fee: null,
    max_vendors: null,
    organizer: null,
  };
}

// Events at known distances from origin (32.0, -81.0):
// - downtown:  (32.0,  -81.0)  → 0 mi
// - outskirts: (32.5,  -81.5)  → ~40 mi
// - far:       (33.0,  -82.0)  → ~80 mi
// - remote:    (34.0,  -83.0)  → ~170 mi
const ORIGIN = { lat: 32.0, lng: -81.0 };

describe('computeEventCounters', () => {
  it('tracked equals total event count', () => {
    const events = [
      makeEvent('1', 32.0, -81.0),
      makeEvent('2', 32.5, -81.5),
    ];
    const result = computeEventCounters(events, {
      origin: null,
      tierMaxRadius: 100,
      userRadiusMiles: 50,
      showSavedOnly: false,
      savedEventIds: new Set(),
    });
    expect(result.tracked).toBe(2);
  });

  it('sets nearby=tracked and visible=tracked when no GPS origin', () => {
    const events = [makeEvent('1', 32.0, -81.0), makeEvent('2', 34.0, -83.0)];
    const result = computeEventCounters(events, {
      origin: null,
      tierMaxRadius: 100,
      userRadiusMiles: 50,
      showSavedOnly: false,
      savedEventIds: new Set(),
    });
    expect(result.nearby).toBe(2);
    expect(result.visible).toBe(2);
  });

  it('nearby scopes events to tier max radius', () => {
    const events = [
      makeEvent('downtown', 32.0, -81.0),
      makeEvent('outskirts', 32.5, -81.5),
      makeEvent('far', 33.0, -82.0),
      makeEvent('remote', 34.0, -83.0),
    ];
    // tier max = 100 → excludes 'remote' (~170 mi)
    const result = computeEventCounters(events, {
      origin: ORIGIN,
      tierMaxRadius: 100,
      userRadiusMiles: 50,
      showSavedOnly: false,
      savedEventIds: new Set(),
    });
    expect(result.nearby).toBe(3);
  });

  it('visible respects user radius slider within tier max', () => {
    const events = [
      makeEvent('downtown', 32.0, -81.0),
      makeEvent('outskirts', 32.5, -81.5),
      makeEvent('far', 33.0, -82.0),
      makeEvent('remote', 34.0, -83.0),
    ];
    // tier max = 100 → nearby = 3 (excludes remote)
    // user radius = 50 → visible = 2 (excludes far, remote)
    const result = computeEventCounters(events, {
      origin: ORIGIN,
      tierMaxRadius: 100,
      userRadiusMiles: 50,
      showSavedOnly: false,
      savedEventIds: new Set(),
    });
    expect(result.visible).toBe(2);
  });

  it('visible equals nearby when user radius >= tier max', () => {
    const events = [
      makeEvent('downtown', 32.0, -81.0),
      makeEvent('far', 33.0, -82.0),
    ];
    const result = computeEventCounters(events, {
      origin: ORIGIN,
      tierMaxRadius: 100,
      userRadiusMiles: 300,
      showSavedOnly: false,
      savedEventIds: new Set(),
    });
    // user radius (300) >= tier max (100) → visible = nearby
    expect(result.visible).toBe(result.nearby);
  });

  it('visible reduces further with saved-only filter', () => {
    const events = [makeEvent('a', 32.0, -81.0), makeEvent('b', 32.5, -81.5)];
    const result = computeEventCounters(events, {
      origin: ORIGIN,
      tierMaxRadius: 100,
      userRadiusMiles: 50,
      showSavedOnly: true,
      savedEventIds: new Set(['a']),
    });
    expect(result.visible).toBe(1);
  });

  it('visible is 0 when saved-only and nothing is saved', () => {
    const events = [makeEvent('a', 32.0, -81.0), makeEvent('b', 32.5, -81.5)];
    const result = computeEventCounters(events, {
      origin: ORIGIN,
      tierMaxRadius: 100,
      userRadiusMiles: 50,
      showSavedOnly: true,
      savedEventIds: new Set(),
    });
    expect(result.visible).toBe(0);
  });

  it('filters out events with null coordinates from nearby/visible', () => {
    const events = [
      makeEvent('located', 32.0, -81.0),
      makeEvent('no-coords', null, null),
    ];
    const result = computeEventCounters(events, {
      origin: ORIGIN,
      tierMaxRadius: 100,
      userRadiusMiles: 50,
      showSavedOnly: false,
      savedEventIds: new Set(),
    });
    expect(result.tracked).toBe(2);
    expect(result.nearby).toBe(1);
    expect(result.visible).toBe(1);
  });

  it('nearby is 0 when tier max radius is 0', () => {
    const events = [makeEvent('1', 32.0, -81.0)];
    const result = computeEventCounters(events, {
      origin: ORIGIN,
      tierMaxRadius: 0,
      userRadiusMiles: 50,
      showSavedOnly: false,
      savedEventIds: new Set(),
    });
    expect(result.nearby).toBe(0);
  });

  it('regression: full options object returns valid number types with correct ordering', () => {
    const events = [
      makeEvent('1', 32.0, -81.0),
      makeEvent('2', 32.5, -81.5),
      makeEvent('3', 34.0, -83.0),
    ];
    const result = computeEventCounters(events, {
      origin: ORIGIN,
      tierMaxRadius: 100,
      userRadiusMiles: 50,
      showSavedOnly: false,
      savedEventIds: new Set(),
    });
    expect(typeof result.visible).toBe('number');
    expect(typeof result.nearby).toBe('number');
    expect(typeof result.tracked).toBe('number');
    expect(result.tracked).toBe(3);
    expect(result.visible).toBeLessThanOrEqual(result.nearby);
    expect(result.nearby).toBeLessThanOrEqual(result.tracked);
  });
});

describe('formatCounterText', () => {
  it('detecting status returns tracked count only', () => {
    const counters = { visible: 50, nearby: 200, tracked: 5000 };
    const text = formatCounterText(counters, 100, 'detecting');
    expect(text).toBe('5000 events tracked');
    expect(text).not.toContain('visible');
    expect(text).not.toContain('within');
  });

  it('available status returns visible of nearby within radiusCap miles', () => {
    const counters = { visible: 42, nearby: 318, tracked: 5000 };
    const text = formatCounterText(counters, 100, 'available');
    expect(text).toBe('42 visible of 318 within 100 miles');
  });

  it('fallback status returns same format as available', () => {
    const counters = { visible: 84, nearby: 1284, tracked: 9300 };
    const text = formatCounterText(counters, 300, 'fallback');
    expect(text).toBe('84 visible of 1284 within 300 miles');
  });

  it('handles zero events gracefully', () => {
    const counters = { visible: 0, nearby: 0, tracked: 0 };
    const text = formatCounterText(counters, 100, 'available');
    expect(text).toBe('0 visible of 0 within 100 miles');
  });

  it('output never exceeds 42 characters for display width stability', () => {
    const maxCounters = { visible: 99999, nearby: 99999, tracked: 99999 };
    for (const status of ['available', 'fallback'] as const) {
      const text = formatCounterText(maxCounters, 300, status);
      expect(text.length).toBeLessThanOrEqual(42);
    }
    const detecting = formatCounterText(maxCounters, 300, 'detecting');
    expect(detecting.length).toBeLessThanOrEqual(42);
  });
});
