import { useMemo, useCallback } from 'react';
import Supercluster from 'supercluster';
import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import type { ViewState } from 'react-map-gl/mapbox';
import { logError } from '@/lib/logging';
import { resolveMapCoordinates as resolveClusteringCoordinates } from '@/lib/services/mapCoordinates';
import { resolveActiveLocation } from '@/lib/services/activeLocation';

// Define types that match SuperCluster's actual output
export interface SuperClusterProperties extends Record<string, unknown> {
  cluster_id?: number;
  cluster?: boolean;
  point_count?: number;
  truckId?: string;
  truck?: FoodTruck;
}

export interface SuperClusterFeature {
  type: 'Feature';
  properties: SuperClusterProperties;
  geometry: {
    type: 'Point';
    coordinates: number[]; // SuperCluster uses number[] for coordinates
  };
  id?: number | string; // Supercluster can use both number and string IDs
}

// Specific types for cluster vs point features
export interface ClusterFeature extends SuperClusterFeature {
  properties: SuperClusterProperties & {
    cluster: true;
    cluster_id: number;
    point_count: number;
  };
}

export interface PointFeature extends SuperClusterFeature {
  properties: SuperClusterProperties & {
    cluster?: false;
    truckId: string;
    truck: FoodTruck;
  };
}

export type AnyFeature = SuperClusterFeature;

interface UseMapClusteringOptions {
  trucks: (FoodTruck | FoodTruckDomain)[];
  viewState: ViewState;
}

interface UseMapClusteringResult {
  clusterIndex: Supercluster<Record<string, unknown>, SuperClusterProperties>;
  clusters: SuperClusterFeature[];
  validTrucks: (FoodTruck | FoodTruckDomain)[];
  offsetIdenticalLocations: (
    clusters: SuperClusterFeature[],
    viewState: ViewState,
  ) => SuperClusterFeature[];
}

/**
 * Custom hook for map clustering logic using SuperCluster
 * Handles truck filtering, cluster index creation, and cluster calculations
 */
export function useMapClustering({
  trucks,
  viewState,
}: UseMapClusteringOptions): UseMapClusteringResult {
  // Process trucks with valid coordinates
  const validTrucks = useMemo(() => {
    return trucks.filter((truck) => {
      const active = resolveClusteringCoordinates(truck);
      return (
        active?.lat != null &&
        active.lng != null &&
        typeof active.lat === 'number' &&
        typeof active.lng === 'number' &&
        !Number.isNaN(active.lat) &&
        !Number.isNaN(active.lng) &&
        active.lat >= -90 &&
        active.lat <= 90 &&
        active.lng >= -180 &&
        active.lng <= 180
      );
    }) as (FoodTruck | FoodTruckDomain)[];
  }, [trucks]);

  // Initialize clustering index
  const clusterIndex = useMemo(() => {
    const index = new Supercluster({
      radius: 60, // Cluster radius in pixels
      maxZoom: 16, // Max zoom level where clusters are generated
      minPoints: 2, // Minimum number of points to form a cluster
    });

    // Prepare points from valid trucks
    const points = validTrucks
      .filter((truck) => {
        const { lat, lng } = resolveClusteringCoordinates(truck);
        return lat != null && lng != null;
      })
      .map((truck) => {
        const { lat, lng } = resolveClusteringCoordinates(truck);

        return {
          type: 'Feature' as const,
          properties: {
            truckId: truck.id,
            truck: truck as FoodTruck,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [lng!, lat!] as [number, number],
          },
        };
      });

    index.load(points);
    return index;
  }, [validTrucks]);

  // Update clusters when viewport changes
  const clusters: SuperClusterFeature[] = useMemo(() => {
    if (!clusterIndex) return [];

    const zoomFactor = Math.max(1, viewState.zoom);
    const lngD = (360 / Math.pow(2, zoomFactor - 1)) * 2;
    const latD = (180 / Math.pow(2, zoomFactor - 1)) * 2;

    const bbox: [number, number, number, number] = [
      Math.max(-180, viewState.longitude - lngD),
      Math.max(-90, viewState.latitude - latD),
      Math.min(180, viewState.longitude + lngD),
      Math.min(90, viewState.latitude + latD),
    ];

    try {
      return clusterIndex.getClusters(bbox, Math.round(viewState.zoom));
    } catch (error) {
      logError('Error getting clusters:', error);
      return [];
    }
  }, [clusterIndex, viewState]);

  // Function to slightly offset markers that are at the same location
  const offsetIdenticalLocations = useCallback(
    (clusters: SuperClusterFeature[], viewState: ViewState): SuperClusterFeature[] => {
      const locationGroups: { [key: string]: AnyFeature[] } = {};

      for (const cluster of clusters) {
        const isCluster = 'cluster' in cluster.properties && cluster.properties.cluster === true;
        if (!isCluster) {
          const truck = (cluster as PointFeature).properties.truck;
          const active = resolveActiveLocation(truck);
          if (active?.lat && active?.lng) {
            const lat = active.lat;
            const lng = active.lng;
            const key = `${Math.round(lat * 100_000)},${Math.round(lng * 100_000)}`;
            if (!locationGroups[key]) {
              locationGroups[key] = [];
            }
            locationGroups[key].push(cluster);
          }
        }
      }

      return clusters.map((cluster) => {
        const isCluster = 'cluster' in cluster.properties && cluster.properties.cluster === true;
        if (!isCluster) {
          const pointFeature = cluster as PointFeature;
          const truck = pointFeature.properties.truck;
          const active = resolveActiveLocation(truck);
          if (active?.lat && active?.lng) {
            const lat = active.lat;
            const lng = active.lng;
            const key = `${Math.round(lat * 100_000)},${Math.round(lng * 100_000)}`;

            if (locationGroups[key] && locationGroups[key].length > 1) {
              const group = locationGroups[key];
              const index = group.findIndex((c) => {
                if ('properties' in c && 'truck' in c.properties) {
                  return (c as PointFeature).properties.truck.id === truck.id;
                }
                return false;
              });

              if (index !== -1) {
                const offsetScale = 0.0001 / Math.pow(2, viewState.zoom - 10);
                const angle = (2 * Math.PI * index) / group.length;
                const offsetLat = lat + offsetScale * Math.cos(angle);
                const offsetLng = lng + offsetScale * Math.sin(angle);

                return {
                  ...cluster,
                  geometry: {
                    ...cluster.geometry,
                    coordinates: [offsetLng, offsetLat],
                  },
                };
              }
            }
          }
        }
        return cluster;
      });
    },
    [],
  );

  return {
    clusterIndex,
    clusters,
    validTrucks,
    offsetIdenticalLocations,
  };
}
