import type { CitySourceType } from '@/lib/events/types';

export type MapEventSource = 'platform' | 'external' | CitySourceType;

export type SourceFilter = 'all' | 'platform' | 'external';

export interface MapEventLocation {
  lat: number | null;
  lng: number | null;
  address?: string;
  city?: string;
  state?: string;
}

export interface MapEventOrganizer {
  business_name?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  verification_status?: string | null;
}

export interface MapEvent {
  id: string;
  name: string;
  description: string;
  location_data: MapEventLocation;
  start_date: string | null;
  end_date: string | null;
  status: string;
  vendor_fee: number | null;
  max_vendors: number | null;
  event_source?: 'platform' | 'external';
  source_type?: string;
  source?: string;
  vetting_score?: number | null;
  relevance_score?: number | null;
  verification_badge?: string | null;
  source_url?: string | null;
  distance_meters?: number | null;
  applications_count?: number;
  organizer: MapEventOrganizer | null;
}

export function isValidMapEvent(event: unknown): event is MapEvent {
  const e = event as Record<string, unknown>;
  const loc = e.location_data as Record<string, unknown> | undefined;
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    loc != null &&
    (loc.lat == null || typeof loc.lat === 'number') &&
    (loc.lng == null || typeof loc.lng === 'number')
  );
}

export interface MapEventFilters {
  sourceFilter: SourceFilter;
  showUnvetted: boolean;
  minVettingScore: number;
}

export const DEFAULT_MAP_EVENT_FILTERS: MapEventFilters = {
  sourceFilter: 'all',
  showUnvetted: true,
  minVettingScore: 0,
};

export function filterMapEvents(events: readonly MapEvent[], filters: MapEventFilters): MapEvent[] {
  return events.filter((event) => {
    if (!filters.showUnvetted && event.vetting_score === null && (event.relevance_score ?? 0) < 3) {
      return false;
    }
    if (filters.minVettingScore > 0 && (event.vetting_score ?? 0) < filters.minVettingScore) {
      return false;
    }
    return true;
  });
}
