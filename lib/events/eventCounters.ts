import { filterByRadius } from '@/lib/events/radiusFilter';
import type { MapEvent } from '@/components/map/eventMapTypes';

interface EventCounterOptions {
  origin: { lat: number; lng: number } | null;
  tierMaxRadius: number;
  userRadiusMiles: number;
  showSavedOnly: boolean;
  savedEventIds: Set<string>;
}

interface EventCounters {
  visible: number;
  nearby: number;
  tracked: number;
}

function hasValidCoords(e: MapEvent): boolean {
  const lat = e.location_data?.lat;
  const lng = e.location_data?.lng;
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export function computeEventCounters(
  events: MapEvent[],
  options: EventCounterOptions,
): EventCounters {
  const { origin, tierMaxRadius, userRadiusMiles, showSavedOnly, savedEventIds } = options;
  const tracked = events.length;

  const locatedEvents = events.filter((e) => hasValidCoords(e));

  if (!origin) {
    const nearby = locatedEvents.length;
    let visible = locatedEvents.length;
    if (showSavedOnly) {
      visible = locatedEvents.filter((e) => savedEventIds.has(e.id)).length;
    }
    return { visible, nearby, tracked };
  }

  const nearby = tierMaxRadius > 0
    ? filterByRadius(locatedEvents, origin.lat, origin.lng, tierMaxRadius)
    : [];

  let visible = userRadiusMiles > 0
    ? filterByRadius(nearby, origin.lat, origin.lng, Math.min(userRadiusMiles, tierMaxRadius))
    : nearby;

  if (showSavedOnly) {
    visible = visible.filter((e) => savedEventIds.has(e.id));
  }

  return { visible: visible.length, nearby: nearby.length, tracked };
}

export type LocationStatus = 'detecting' | 'available' | 'fallback';

export function formatCounterText(
  counters: EventCounters,
  radiusCap: number,
  locationStatus: LocationStatus,
): string {
  if (locationStatus === 'detecting') {
    return `${counters.tracked} events tracked`;
  }
  return `${counters.visible} visible of ${counters.nearby} within ${radiusCap} miles`;
}
