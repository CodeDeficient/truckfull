import useSWR, { type SWRResponse } from 'swr';
import type { MapEvent } from '@/components/map/eventMapTypes';

interface EventsApiResponse {
  events: Array<Record<string, unknown>>;
}

interface ApiEvent {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location_data?: {
    lat?: number;
    lng?: number;
    address?: string;
    city?: string;
    state?: string;
  };
  event_source?: string;
  source_type?: string;
  source?: string;
  source_url?: string;
  vetting_score?: number | null;
  relevance_score?: number | null;
  verification_badge?: string | null;
  organizer?: {
    business_name?: string;
    rating_avg?: number | null;
    rating_count?: number | null;
    verification_status?: string | null;
  } | null;
  vendor_fee?: number | null;
  max_vendors?: number | null;
  applications_count?: number;
  status?: string;
}

function transformEvent(event: ApiEvent): MapEvent {
  const lat = event.location_data?.lat ?? null;
  const lng = event.location_data?.lng ?? null;
  return {
    id: event.id,
    name: event.name,
    description: event.description ?? '',
    location_data: {
      lat,
      lng,
      address: event.location_data?.address,
      city: event.location_data?.city,
      state: event.location_data?.state,
    },
    start_date: event.start_date ?? '',
    end_date: event.end_date ?? '',
    status: event.status ?? '',
    vendor_fee: event.vendor_fee ?? null,
    max_vendors: event.max_vendors ?? null,
    event_source: (event.event_source as MapEvent['event_source']) ?? undefined,
    source_type: event.source_type,
    source: event.source,
    vetting_score: event.vetting_score,
    relevance_score: event.relevance_score,
    verification_badge: event.verification_badge,
    source_url: event.source_url ?? null,
    applications_count: event.applications_count,
    organizer: event.organizer ?? null,
  };
}

const eventsFetcher = async (source: string): Promise<MapEvent[]> => {
  const url = `/api/events?source=${source}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status}`);
  }
  const data: EventsApiResponse = await response.json();
  return (data.events ?? []).map((e) => transformEvent(e as unknown as ApiEvent));
};

export interface UseEventsSWRResult {
  events: MapEvent[];
  loading: boolean;
  error: unknown;
  mutate: SWRResponse<MapEvent[], unknown>['mutate'];
}

export const useEventsSWR = (source: string = 'all'): UseEventsSWRResult => {
  const swr: SWRResponse<MapEvent[], unknown> = useSWR<MapEvent[]>(
    `events-${source}`,
    () => eventsFetcher(source),
    {
      refreshInterval: 300_000,
      keepPreviousData: true,
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      revalidateIfStale: true,
      revalidateOnMount: true,
      fallbackData: [],
    },
  );
  const { data, error, isLoading, mutate } = swr;

  return {
    events: data ?? [],
    loading: Boolean(isLoading && !data),
    error,
    mutate,
  };
};
