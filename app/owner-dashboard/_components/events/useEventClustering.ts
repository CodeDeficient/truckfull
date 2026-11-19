'use client';

import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { MapEvent } from '@/components/map/eventMapTypes';

interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface EventClusterFeature {
  id: number | string;
  geometry: { coordinates: number[] };
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
    eventIds: string[];
  };
}

export interface EventPointFeature {
  id: string;
  geometry: { coordinates: number[] };
  properties: {
    cluster?: false;
    event: MapEvent;
  };
}

export type EventClusterResult = EventClusterFeature | EventPointFeature;

function validateCoords(event: MapEvent): boolean {
  const lat = event.location_data?.lat;
  const lng = event.location_data?.lng;
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export function useEventClustering(
  events: MapEvent[],
  viewState: MapViewState,
): { clusteredFeatures: EventClusterResult[]; eventsWithLocation: MapEvent[] } {
  const eventsWithLocation = useMemo(
    () => events.filter((e) => validateCoords(e)),
    [events],
  );

  const clusterIndex = useMemo(() => {
    const index = new Supercluster({
      radius: 50,
      maxZoom: 14,
      minPoints: 2,
    });

    const points = eventsWithLocation.map((event) => ({
      type: 'Feature' as const,
      properties: {
        eventId: event.id,
        event,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [event.location_data.lng, event.location_data.lat] as [number, number],
      },
    }));

    index.load(points);
    return index;
  }, [eventsWithLocation]);

  const clusteredFeatures = useMemo(() => {
    if (!clusterIndex) return [];

    const zoom = Math.max(1, viewState.zoom);
    const lngD = (360 / Math.pow(2, zoom - 1)) * 2;
    const latD = (180 / Math.pow(2, zoom - 1)) * 2;

    const bbox: [number, number, number, number] = [
      Math.max(-180, viewState.longitude - lngD),
      Math.max(-90, viewState.latitude - latD),
      Math.min(180, viewState.longitude + lngD),
      Math.min(90, viewState.latitude + latD),
    ];

    try {
      const raw = clusterIndex.getClusters(bbox, Math.round(viewState.zoom));
      return raw.map((f) => {
        if (f.properties.cluster) {
          const leaves = clusterIndex.getLeaves(f.id as number, Infinity, 0);
          return {
            id: f.id,
            geometry: f.geometry,
            properties: {
              cluster: true as const,
              cluster_id: f.properties.cluster_id as number,
              point_count: f.properties.point_count as number,
              eventIds: leaves.map((l) => l.properties.eventId as string),
            },
          };
        }
        return {
          id: f.properties.eventId as string,
          geometry: f.geometry,
          properties: {
            cluster: false as const,
            event: f.properties.event as MapEvent,
          },
        };
      }) as EventClusterResult[];
    } catch {
      return [];
    }
  }, [clusterIndex, viewState]);

  return { clusteredFeatures, eventsWithLocation };
}
