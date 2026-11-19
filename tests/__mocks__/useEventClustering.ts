import type { MapEvent } from '@/components/map/eventMapTypes';

interface ClusterPoint {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    event: MapEvent;
    cluster: false;
  };
}

interface ClusterGroup {
  type: 'Feature';
  id: number;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated: string;
    eventIds: string[];
  };
}

type Feature = ClusterPoint | ClusterGroup;

export function useEventClustering(events: MapEvent[]): {
  clusteredFeatures: Feature[];
} {
  const features: Feature[] = events
    .filter((e) => e.location_data?.lat != null && e.location_data?.lng != null)
    .map((event) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [event.location_data.lng!, event.location_data.lat!],
      },
      properties: {
        event,
        cluster: false as const,
      },
    }));

  return { clusteredFeatures: features };
}
