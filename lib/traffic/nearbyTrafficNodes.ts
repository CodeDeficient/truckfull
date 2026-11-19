export interface TrafficNodeRow {
  id: string;
  station_id: string;
  aadt: number;
  lat: number;
  lng: number;
  location_description: string | null;
  score_percentile: number | null;
}

export interface NearbyTrafficNode {
  id: string;
  station_id: string;
  aadt: number;
  lat: number;
  lng: number;
  location_description: string | null;
  score_percentile: number;
  distance_meters: number;
}

export interface AreaStats {
  station_count: number;
  avg_aadt: number;
  max_aadt: number;
  percentile_score: number;
  traffic_level: string;
}

export interface ProcessBatchResult {
  topNodes: NearbyTrafficNode[];
  stationCount: number;
  sumAadt: number;
  maxAadt: number;
  sumPercentile: number;
  percentileCount: number;
  fetchedRowCount: number;
}

export const EARTH_RADIUS_METERS = 6_371_000;

export function getBoundingBox(
  lat: number,
  lng: number,
  radiusMeters: number,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusMeters / 111_320;
  const latRadians = (lat * Math.PI) / 180;
  const lngDenominator = Math.max(111_320 * Math.cos(latRadians), 1e-6);
  const lngDelta = radiusMeters / lngDenominator;

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export function getTrafficLevel(percentileScore: number): 'high' | 'medium' | 'low' | 'unknown' {
  if (percentileScore >= 75) return 'high';
  if (percentileScore >= 40) return 'medium';
  if (percentileScore >= 1) return 'low';
  return 'unknown';
}

export function insertTopNode(
  topNodes: NearbyTrafficNode[],
  node: NearbyTrafficNode,
  limit: number,
): void {
  const lastNode = topNodes.at(-1);
  if (topNodes.length >= limit && lastNode && node.aadt <= lastNode.aadt) {
    return;
  }

  let low = 0;
  let high = topNodes.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (node.aadt > topNodes[mid].aadt) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  topNodes.splice(low, 0, node);
  if (topNodes.length > limit) {
    topNodes.pop();
  }
}

export function processTrafficNodeRows(
  rows: TrafficNodeRow[],
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  effectiveLimit: number,
  state: ProcessBatchResult,
): ProcessBatchResult {
  const topNodes = [...state.topNodes];
  let stationCount = state.stationCount;
  let sumAadt = state.sumAadt;
  let maxAadt = state.maxAadt;
  let sumPercentile = state.sumPercentile;
  let percentileCount = state.percentileCount;
    const fetchedRowCount = state.fetchedRowCount;

  for (const node of rows) {
    const nodeLat = Number(node.lat);
    const nodeLng = Number(node.lng);
    const distanceMeters = getDistanceMeters(centerLat, centerLng, nodeLat, nodeLng);

    if (!Number.isFinite(distanceMeters) || distanceMeters > radiusMeters) {
      continue;
    }

    stationCount += 1;
    sumAadt += node.aadt;
    maxAadt = Math.max(maxAadt, node.aadt);

    if (node.score_percentile !== null) {
      sumPercentile += node.score_percentile;
      percentileCount += 1;
    }

    const nearbyNode: NearbyTrafficNode = {
      id: node.id,
      station_id: node.station_id,
      aadt: node.aadt,
      lat: nodeLat,
      lng: nodeLng,
      location_description: node.location_description,
      score_percentile: Number(node.score_percentile ?? 0),
      distance_meters: distanceMeters,
    };

    insertTopNode(topNodes, nearbyNode, effectiveLimit);
  }

  return {
    topNodes,
    stationCount,
    sumAadt,
    maxAadt,
    sumPercentile,
    percentileCount,
    fetchedRowCount: fetchedRowCount + rows.length,
  };
}

export function computeAreaStats(
  stationCount: number,
  sumAadt: number,
  maxAadt: number,
  sumPercentile: number,
  percentileCount: number,
): AreaStats {
  const avgAadt = stationCount > 0 ? Math.round(sumAadt / stationCount) : 0;
  const avgPercentileRaw = percentileCount > 0 ? sumPercentile / percentileCount : 0;
  const avgPercentile = Math.round(avgPercentileRaw);

  return {
    station_count: stationCount,
    avg_aadt: avgAadt,
    max_aadt: maxAadt,
    percentile_score: avgPercentile,
    traffic_level: getTrafficLevel(avgPercentileRaw),
  };
}
