import { describe, it, expect } from '@jest/globals';
import {
  getBoundingBox,
  getDistanceMeters,
  getTrafficLevel,
  insertTopNode,
  processTrafficNodeRows,
  computeAreaStats,
  type TrafficNodeRow,
  type NearbyTrafficNode,
  type ProcessBatchResult,
} from '@/lib/traffic/nearbyTrafficNodes';

const makeEmptyState = (): ProcessBatchResult => ({
  topNodes: [],
  stationCount: 0,
  sumAadt: 0,
  maxAadt: 0,
  sumPercentile: 0,
  percentileCount: 0,
  fetchedRowCount: 0,
});

const makeRow = (overrides: Partial<TrafficNodeRow>): TrafficNodeRow => ({
  id: 'test-1',
  station_id: 'STN-001',
  aadt: 10000,
  lat: 33.5,
  lng: -82.0,
  location_description: 'Test Rd',
  score_percentile: 50,
  ...overrides,
});

describe('getBoundingBox', () => {
  it('returns bounds enclosing the given point and radius', () => {
    const box = getBoundingBox(33.5, -82.0, 8047);
    expect(box.minLat).toBeLessThan(33.5);
    expect(box.maxLat).toBeGreaterThan(33.5);
    expect(box.minLng).toBeLessThan(-82.0);
    expect(box.maxLng).toBeGreaterThan(-82.0);
  });

  it('produces larger bounds for larger radius', () => {
    const small = getBoundingBox(33.5, -82.0, 1000);
    const large = getBoundingBox(33.5, -82.0, 50000);
    expect(large.maxLat - large.minLat).toBeGreaterThan(small.maxLat - small.minLat);
    expect(large.maxLng - large.minLng).toBeGreaterThan(small.maxLng - small.minLng);
  });
});

describe('getDistanceMeters', () => {
  it('returns ~0 for same point', () => {
    const dist = getDistanceMeters(33.5, -82.0, 33.5, -82.0);
    expect(dist).toBeLessThan(1);
  });

  it('returns positive distance between two points', () => {
    const dist = getDistanceMeters(33.5, -82.0, 34.0, -81.5);
    expect(dist).toBeGreaterThan(50000);
    expect(dist).toBeLessThan(100000);
  });
});

describe('getTrafficLevel', () => {
  it('returns high for scores >= 75', () => {
    expect(getTrafficLevel(75)).toBe('high');
    expect(getTrafficLevel(100)).toBe('high');
  });

  it('returns medium for scores 40-74', () => {
    expect(getTrafficLevel(40)).toBe('medium');
    expect(getTrafficLevel(50)).toBe('medium');
    expect(getTrafficLevel(74)).toBe('medium');
  });

  it('returns low for scores 1-39', () => {
    expect(getTrafficLevel(1)).toBe('low');
    expect(getTrafficLevel(20)).toBe('low');
    expect(getTrafficLevel(39)).toBe('low');
  });

  it('returns unknown for score 0', () => {
    expect(getTrafficLevel(0)).toBe('unknown');
  });
});

describe('insertTopNode', () => {
  it('inserts in descending AADT order', () => {
    const topNodes: NearbyTrafficNode[] = [];
    const n1 = { id: 'a', station_id: 'A', aadt: 10000, lat: 0, lng: 0, location_description: null, score_percentile: 0, distance_meters: 0 };
    const n2 = { id: 'b', station_id: 'B', aadt: 20000, lat: 0, lng: 0, location_description: null, score_percentile: 0, distance_meters: 0 };
    const n3 = { id: 'c', station_id: 'C', aadt: 15000, lat: 0, lng: 0, location_description: null, score_percentile: 0, distance_meters: 0 };

    insertTopNode(topNodes, n1, 10);
    insertTopNode(topNodes, n2, 10);
    insertTopNode(topNodes, n3, 10);

    expect(topNodes[0].station_id).toBe('B');
    expect(topNodes[1].station_id).toBe('C');
    expect(topNodes[2].station_id).toBe('A');
  });

  it('respects the limit and discards lowest AADT', () => {
    const topNodes: NearbyTrafficNode[] = [];
    for (let i = 5; i >= 1; i--) {
      insertTopNode(topNodes, { id: String(i), station_id: String(i), aadt: i * 1000, lat: 0, lng: 0, location_description: null, score_percentile: 0, distance_meters: 0 }, 3);
    }
    expect(topNodes).toHaveLength(3);
    expect(topNodes[0].aadt).toBe(5000);
    expect(topNodes[2].aadt).toBe(3000);
  });
});

describe('processTrafficNodeRows', () => {
  it('includes nodes within the radius', () => {
    const centerLat = 33.5;
    const centerLng = -82.0;
    const rows = [
      makeRow({ id: 'near', lat: 33.5001, lng: -82.0001, aadt: 5000 }),
    ];
    const result = processTrafficNodeRows(rows, centerLat, centerLng, 8047, 100, makeEmptyState());
    expect(result.stationCount).toBe(1);
    expect(result.topNodes).toHaveLength(1);
  });

  it('excludes nodes outside the radius', () => {
    const centerLat = 33.5;
    const centerLng = -82.0;
    const rows = [makeRow({ id: 'far', lat: 40.0, lng: -100.0 })];
    const result = processTrafficNodeRows(rows, centerLat, centerLng, 100, 100, makeEmptyState());
    expect(result.stationCount).toBe(0);
    expect(result.topNodes).toHaveLength(0);
  });

  it('accumulates stats correctly', () => {
    const rows = [
      makeRow({ aadt: 10000, score_percentile: 30 }),
      makeRow({ id: 'b', station_id: 'STN-002', aadt: 20000, score_percentile: 70 }),
      makeRow({ id: 'c', station_id: 'STN-003', aadt: 5000, score_percentile: 50 }),
    ];
    const result = processTrafficNodeRows(rows, 33.5, -82.0, 8047, 100, makeEmptyState());
    expect(result.stationCount).toBe(3);
    expect(result.sumAadt).toBe(35000);
    expect(result.maxAadt).toBe(20000);
    expect(result.sumPercentile).toBe(150);
    expect(result.percentileCount).toBe(3);
  });

  it('ignores null score_percentile in average', () => {
    const rows = [
      makeRow({ aadt: 10000, score_percentile: 50 }),
      makeRow({ id: 'b', station_id: 'STN-002', aadt: 20000, score_percentile: null }),
    ];
    const result = processTrafficNodeRows(rows, 33.5, -82.0, 8047, 100, makeEmptyState());
    expect(result.percentileCount).toBe(1);
    expect(result.sumPercentile).toBe(50);
  });

  it('handles multiple batches by accumulating state', () => {
    const batch1 = [makeRow({ aadt: 10000 })];
    const batch2 = [makeRow({ id: 'b', station_id: 'STN-002', aadt: 20000 })];

    const state = processTrafficNodeRows(batch1, 33.5, -82.0, 8047, 100, makeEmptyState());
    const result = processTrafficNodeRows(batch2, 33.5, -82.0, 8047, 100, state);

    expect(result.stationCount).toBe(2);
    expect(result.sumAadt).toBe(30000);
    expect(result.maxAadt).toBe(20000);
  });

  it('keeps top nodes sorted by AADT with limit', () => {
    const rows = [
      makeRow({ id: 'a', aadt: 5000 }),
      makeRow({ id: 'b', station_id: 'STN-002', aadt: 10000 }),
      makeRow({ id: 'c', station_id: 'STN-003', aadt: 15000 }),
    ];
    const result = processTrafficNodeRows(rows, 33.5, -82.0, 8047, 2, makeEmptyState());
    expect(result.topNodes).toHaveLength(2);
    expect(result.topNodes[0].aadt).toBe(15000);
    expect(result.topNodes[1].aadt).toBe(10000);
  });

  it('includes lat/lng in nearby nodes for side-bar display even without location_geog', () => {
    const rows = [
      makeRow({ id: 'a', lat: 33.51, lng: -82.01, aadt: 5000, location_description: null }),
    ];
    const result = processTrafficNodeRows(rows, 33.5, -82.0, 8047, 100, makeEmptyState());
    expect(result.topNodes).toHaveLength(1);
    expect(result.topNodes[0].lat).toBe(33.51);
    expect(result.topNodes[0].lng).toBe(-82.01);
    expect(result.topNodes[0].distance_meters).toBeGreaterThan(0);
    expect(result.topNodes[0].location_description).toBeNull();
  });
});

describe('computeAreaStats', () => {
  it('computes averages correctly', () => {
    const stats = computeAreaStats(4, 100000, 40000, 200, 4);
    expect(stats.station_count).toBe(4);
    expect(stats.avg_aadt).toBe(25000);
    expect(stats.max_aadt).toBe(40000);
    expect(stats.percentile_score).toBe(50);
    expect(stats.traffic_level).toBe('medium');
  });

  it('returns zeros when station count is 0', () => {
    const stats = computeAreaStats(0, 0, 0, 0, 0);
    expect(stats.avg_aadt).toBe(0);
    expect(stats.percentile_score).toBe(0);
    expect(stats.traffic_level).toBe('unknown');
  });

  it('ignores null percentiles by using percentileCount', () => {
    const stats = computeAreaStats(3, 60000, 30000, 150, 2);
    expect(stats.percentile_score).toBe(75);
    expect(stats.traffic_level).toBe('high');
  });
});
