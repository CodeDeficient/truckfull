'use client';

/**
 * Traffic Node Clustering Hook
 *
 * Uses SuperCluster to cluster traffic nodes client-side.
 * Aggregates AADT within clusters for heatmap weight calculation.
 *
 * Based on useMapClustering.ts pattern used for food trucks.
 */

import { useMemo, useCallback } from 'react';
import Supercluster from 'supercluster';
import type { ViewState } from 'react-map-gl/mapbox';
import { logError } from '@/lib/logging';

// Traffic node data from API - uses miles (American units)
export interface TrafficNodeData {
  id: string;
  station_id: string;
  aadt: number;
  lat: number;
  lng: number;
  location_description: string | null;
  score_percentile: number;
  distance_miles?: number; // Distance from search point in miles
}

// SuperCluster properties for traffic nodes
export interface TrafficClusterProperties extends Record<string, unknown> {
  cluster_id?: number;
  cluster?: boolean;
  point_count?: number;
  // For individual points
  nodeId?: string;
  node?: TrafficNodeData;
  // Aggregated values for clusters
  sum_aadt?: number;
  avg_aadt?: number;
  max_aadt?: number;
  avg_percentile?: number;
}

export interface TrafficClusterFeature {
  type: 'Feature';
  properties: TrafficClusterProperties;
  geometry: {
    type: 'Point';
    coordinates: number[];
  };
  id?: number | string;
}

// Cluster-specific feature
export interface TrafficCluster extends TrafficClusterFeature {
  properties: TrafficClusterProperties & {
    cluster: true;
    cluster_id: number;
    point_count: number;
    sum_aadt: number;
    avg_aadt: number;
    max_aadt: number;
    avg_percentile: number;
  };
}

// Individual point feature
export interface TrafficPoint extends TrafficClusterFeature {
  properties: TrafficClusterProperties & {
    cluster?: false;
    nodeId: string;
    node: TrafficNodeData;
  };
}

interface UseTrafficClusteringOptions {
  nodes: TrafficNodeData[];
  viewState: ViewState;
  clusterRadius?: number;
  maxZoom?: number;
}

interface UseTrafficClusteringResult {
  clusterIndex: Supercluster<TrafficClusterProperties, TrafficClusterProperties> | null;
  clusters: TrafficClusterFeature[];
  isCluster: (feature: TrafficClusterFeature) => feature is TrafficCluster;
  isPoint: (feature: TrafficClusterFeature) => feature is TrafficPoint;
  getClusterLeaves: (clusterId: number, limit?: number) => TrafficNodeData[];
}

/**
 * Custom hook for traffic node clustering using SuperCluster.
 *
 * Features:
 * - Clusters traffic nodes based on viewport zoom
 * - Aggregates AADT values within clusters (sum, avg, max)
 * - Provides cluster expansion and leaf retrieval
 */
export function useTrafficClustering({
  nodes,
  viewState,
  clusterRadius = 80, // Larger radius for more aggressive clustering
  maxZoom = 16,
}: UseTrafficClusteringOptions): UseTrafficClusteringResult {
  // Create SuperCluster index with traffic-specific aggregation
  const clusterIndex = useMemo(() => {
    if (nodes.length === 0) return null;

    const index = new Supercluster<TrafficClusterProperties, TrafficClusterProperties>({
      radius: clusterRadius,
      maxZoom,
      minPoints: 2,
      // Custom reduce function to aggregate AADT within clusters
      map: (props) => ({
        sum_aadt: props.node?.aadt ?? 0,
        max_aadt: props.node?.aadt ?? 0,
        avg_percentile: props.node?.score_percentile ?? 0,
        count: 1,
      }),
      reduce: (accumulated, props) => {
        accumulated.sum_aadt = (accumulated.sum_aadt ?? 0) + (props.sum_aadt ?? 0);
        accumulated.max_aadt = Math.max(accumulated.max_aadt ?? 0, props.max_aadt ?? 0);
        // Running average for percentile
        const accCount = (accumulated as { count?: number }).count ?? 1;
        const newCount = accCount + 1;
        accumulated.avg_percentile =
          ((accumulated.avg_percentile ?? 0) * accCount + (props.avg_percentile ?? 0)) / newCount;
        (accumulated as { count?: number }).count = newCount;
      },
    });

    // Convert nodes to GeoJSON features
    const points = nodes
      .filter(
        (node) =>
          node.lat != null &&
          node.lng != null &&
          node.lat >= -90 &&
          node.lat <= 90 &&
          node.lng >= -180 &&
          node.lng <= 180,
      )
      .map((node) => ({
        type: 'Feature' as const,
        properties: {
          nodeId: node.id,
          node,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [node.lng, node.lat] as [number, number],
        },
      }));

    index.load(points);
    return index;
  }, [nodes, clusterRadius, maxZoom]);

  // Get clusters for current viewport
  const clusters: TrafficClusterFeature[] = useMemo(() => {
    if (!clusterIndex) return [];

    // Calculate bounding box with buffer
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
      const rawClusters = clusterIndex.getClusters(bbox, Math.round(viewState.zoom));

      // Post-process to add avg_aadt
      return rawClusters.map((cluster) => {
        if ('cluster' in cluster.properties && cluster.properties.cluster === true) {
          const pointCount = cluster.properties.point_count ?? 1;
          const sumAadt = cluster.properties.sum_aadt ?? 0;
          return {
            ...cluster,
            properties: {
              ...cluster.properties,
              avg_aadt: Math.round(sumAadt / pointCount),
            },
          };
        }
        return cluster;
      });
    } catch (error) {
      logError('Error getting traffic clusters:', error);
      return [];
    }
  }, [clusterIndex, viewState]);

  // Type guards
  const isCluster = useCallback((feature: TrafficClusterFeature): feature is TrafficCluster => {
    return feature.properties.cluster === true;
  }, []);

  const isPoint = useCallback((feature: TrafficClusterFeature): feature is TrafficPoint => {
    return !feature.properties.cluster && feature.properties.nodeId != null;
  }, []);

  // Get leaves (individual nodes) from a cluster
  const getClusterLeaves = useCallback(
    (clusterId: number, limit = 100): TrafficNodeData[] => {
      if (!clusterIndex) return [];

      try {
        const leaves = clusterIndex.getLeaves(clusterId, limit);
        return leaves
          .map((leaf) => (leaf.properties as TrafficPoint['properties']).node)
          .filter((node): node is TrafficNodeData => node != null);
      } catch (error) {
        logError('Error getting cluster leaves:', error);
        return [];
      }
    },
    [clusterIndex],
  );

  return {
    clusterIndex,
    clusters,
    isCluster,
    isPoint,
    getClusterLeaves,
  };
}
