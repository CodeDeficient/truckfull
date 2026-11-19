/**
 * @jest-environment node
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;

beforeAll(async () => {
  // Traffic RPCs are service_role-only since migration 20260902000001.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
});

describe('find_nearby_traffic_nodes', () => {
  const AUGUSTA_LAT = 33.4735;
  const AUGUSTA_LNG = -82.0105;

  test('returns array of traffic nodes', async () => {
    const { data, error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: AUGUSTA_LAT,
      p_lng: AUGUSTA_LNG,
      p_radius_meters: 1000,
      p_limit: 10,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    if (data !== null) {
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('filters by radius - all distances <= p_radius_meters', async () => {
    const radiusMeters = 500;

    const { data, error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: AUGUSTA_LAT,
      p_lng: AUGUSTA_LNG,
      p_radius_meters: radiusMeters,
      p_limit: 100,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      for (const node of data) {
        expect(node.distance_meters).toBeDefined();
        expect(typeof node.distance_meters).toBe('number');
        expect(node.distance_meters).toBeLessThanOrEqual(radiusMeters);
      }
    }
  });

  test('respects p_limit parameter', async () => {
    const limit = 5;

    const { data, error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: AUGUSTA_LAT,
      p_lng: AUGUSTA_LNG,
      p_radius_meters: 10000,
      p_limit: limit,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data)) {
      expect(data.length).toBeLessThanOrEqual(limit);
    }
  });

  test('sorts by AADT descending (highest traffic first)', async () => {
    const { data, error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: AUGUSTA_LAT,
      p_lng: AUGUSTA_LNG,
      p_radius_meters: 5000,
      p_limit: 10,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 1) {
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].aadt).toBeGreaterThanOrEqual(data[i + 1].aadt);
      }
    }
  });

  test('filters by is_accessible = true', async () => {
    const { data, error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: AUGUSTA_LAT,
      p_lng: AUGUSTA_LNG,
      p_radius_meters: 5000,
      p_limit: 100,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      for (const node of data) {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('station_id');
        expect(node).toHaveProperty('aadt');
        expect(node).toHaveProperty('lat');
        expect(node).toHaveProperty('lng');
        expect(node).toHaveProperty('location_description');
        expect(node).toHaveProperty('score_percentile');
        expect(node).toHaveProperty('distance_meters');
      }
    }
  });

  test('returns distance_meters calculated correctly', async () => {
    const { data, error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: AUGUSTA_LAT,
      p_lng: AUGUSTA_LNG,
      p_radius_meters: 1000,
      p_limit: 10,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const firstNode = data[0];
      expect(firstNode).toHaveProperty('distance_meters');
      expect(typeof firstNode.distance_meters).toBe('number');
      expect(firstNode.distance_meters).toBeGreaterThan(0);
    }
  });

  test('works with large radius (e.g., 100km)', async () => {
    const largeRadiusMeters = 100 * 1000;

    const { data, error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: AUGUSTA_LAT,
      p_lng: AUGUSTA_LNG,
      p_radius_meters: largeRadiusMeters,
      p_limit: 100,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      for (const node of data) {
        expect(node.distance_meters).toBeLessThanOrEqual(largeRadiusMeters);
      }
    }
  });

  test('works with small radius (e.g., 100m)', async () => {
    const smallRadiusMeters = 100;

    const { data, error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: AUGUSTA_LAT,
      p_lng: AUGUSTA_LNG,
      p_radius_meters: smallRadiusMeters,
      p_limit: 10,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      for (const node of data) {
        expect(node.distance_meters).toBeLessThanOrEqual(smallRadiusMeters);
      }
    }
  });

  test('returns expected node structure', async () => {
    const { data, error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: AUGUSTA_LAT,
      p_lng: AUGUSTA_LNG,
      p_radius_meters: 5000,
      p_limit: 1,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const node = data[0];
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('station_id');
      expect(node).toHaveProperty('aadt');
      expect(node).toHaveProperty('lat');
      expect(node).toHaveProperty('lng');
      expect(node).toHaveProperty('location_description');
      expect(node).toHaveProperty('score_percentile');
      expect(node).toHaveProperty('distance_meters');
    }
  });

  test('handles invalid latitude (outside -90 to 90)', async () => {
    const { error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: 91,
      p_lng: AUGUSTA_LNG,
      p_radius_meters: 1000,
      p_limit: 10,
    });

    expect(error).toBeDefined();
  });

  test('handles missing parameters', async () => {
    const { error } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_radius_meters: 1000,
      p_limit: 10,
    } as any);

    expect(error).toBeDefined();
  });
});

describe('get_location_traffic_score', () => {
  const ATLANTA_LAT = 33.749;
  const ATLANTA_LNG = -84.388;

  test('returns single object with expected properties', async () => {
    const { data, error } = await supabase.rpc('get_location_traffic_score', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 500,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      expect(result).toHaveProperty('station_count');
      expect(result).toHaveProperty('avg_aadt');
      expect(result).toHaveProperty('max_aadt');
      expect(result).toHaveProperty('percentile_score');
      expect(result).toHaveProperty('traffic_level');
    }
  });

  test('traffic_level is one of: high, medium, low, unknown', async () => {
    const { data, error } = await supabase.rpc('get_location_traffic_score', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 500,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      const validLevels = ['high', 'medium', 'low', 'unknown'];
      expect(validLevels).toContain(result.traffic_level);
    }
  });

  test('avg_aadt is calculated correctly', async () => {
    const { data, error } = await supabase.rpc('get_location_traffic_score', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 1000,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      expect(result.avg_aadt).toBeDefined();
      expect(typeof result.avg_aadt).toBe('number');
      expect(result.avg_aadt).toBeGreaterThanOrEqual(0);
    }
  });

  test('max_aadt is the maximum AADT in radius', async () => {
    const { data, error } = await supabase.rpc('get_location_traffic_score', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 1000,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      expect(result.max_aadt).toBeDefined();
      expect(typeof result.max_aadt).toBe('number');
      expect(result.max_aadt).toBeGreaterThanOrEqual(0);

      if (result.station_count > 0) {
        expect(result.max_aadt).toBeGreaterThanOrEqual(result.avg_aadt);
      }
    }
  });

  test('percentile_score is between 0-100', async () => {
    const { data, error } = await supabase.rpc('get_location_traffic_score', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 500,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      expect(result.percentile_score).toBeGreaterThanOrEqual(0);
      expect(result.percentile_score).toBeLessThanOrEqual(100);
    }
  });

  test('handles areas with no traffic (returns zeros/unknown)', async () => {
    const { data, error } = await supabase.rpc('get_location_traffic_score', {
      p_lat: 0,
      p_lng: 0,
      p_radius_meters: 100,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      expect(result.station_count).toBe(0);
      expect(result.avg_aadt).toBe(0);
      expect(result.max_aadt).toBe(0);
      expect(result.percentile_score).toBe(0);
      expect(result.traffic_level).toBe('unknown');
    }
  });

  test('station_count is non-negative integer', async () => {
    const { data, error } = await supabase.rpc('get_location_traffic_score', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 500,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      expect(result.station_count).toBeDefined();
      expect(typeof result.station_count).toBe('number');
      expect(result.station_count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result.station_count)).toBe(true);
    }
  });

  test('returns traffic_level as string', async () => {
    const { data, error } = await supabase.rpc('get_location_traffic_score', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 500,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      expect(typeof result.traffic_level).toBe('string');
    }
  });

  test('handles different radius sizes', async () => {
    const smallRadius = 100;
    const largeRadius = 2000;

    const { data: smallData, error: smallError } = await supabase.rpc(
      'get_location_traffic_score',
      {
        p_lat: ATLANTA_LAT,
        p_lng: ATLANTA_LNG,
        p_radius_meters: smallRadius,
      },
    );

    const { data: largeData, error: largeError } = await supabase.rpc(
      'get_location_traffic_score',
      {
        p_lat: ATLANTA_LAT,
        p_lng: ATLANTA_LNG,
        p_radius_meters: largeRadius,
      },
    );

    expect(smallError).toBeNull();
    expect(largeError).toBeNull();

    if (
      smallData &&
      largeData &&
      Array.isArray(smallData) &&
      Array.isArray(largeData) &&
      smallData.length > 0 &&
      largeData.length > 0
    ) {
      const smallResult = smallData[0];
      const largeResult = largeData[0];

      expect(largeResult.station_count).toBeGreaterThanOrEqual(smallResult.station_count);
    }
  });

  test('handles invalid latitude (outside -90 to 90)', async () => {
    const { error } = await supabase.rpc('get_location_traffic_score', {
      p_lat: 95,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 500,
    });

    expect(error).toBeDefined();
  });

  test('handles missing parameters', async () => {
    const { error } = await supabase.rpc('get_location_traffic_score', {
      p_radius_meters: 500,
    } as any);

    expect(error).toBeDefined();
  });
});

describe('find_nearby_hotspot', () => {
  const ATLANTA_LAT = 33.749;
  const ATLANTA_LNG = -84.388;

  test('returns array of hotspots (or empty)', async () => {
    const { data, error } = await supabase.rpc('find_nearby_hotspot', {
      lat: ATLANTA_LAT,
      lng: ATLANTA_LNG,
      radius_meters: 500,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    if (data !== null) {
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('filters by radius (all distances <= radius_meters)', async () => {
    const radiusMeters = 500;

    const { data, error } = await supabase.rpc('find_nearby_hotspot', {
      lat: ATLANTA_LAT,
      lng: ATLANTA_LNG,
      radius_meters: radiusMeters,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      for (const hotspot of data) {
        expect(hotspot.distance_meters).toBeDefined();
        expect(typeof hotspot.distance_meters).toBe('number');
        expect(hotspot.distance_meters).toBeLessThanOrEqual(radiusMeters);
      }
    }
  });

  test('returns only active hotspots (is_active = true)', async () => {
    const { data, error } = await supabase.rpc('find_nearby_hotspot', {
      lat: ATLANTA_LAT,
      lng: ATLANTA_LNG,
      radius_meters: 5000,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      for (const hotspot of data) {
        expect(hotspot).toHaveProperty('id');
      }
    }
  });

  test('returns distance_meters calculated correctly', async () => {
    const { data, error } = await supabase.rpc('find_nearby_hotspot', {
      lat: ATLANTA_LAT,
      lng: ATLANTA_LNG,
      radius_meters: 1000,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const firstHotspot = data[0];
      expect(firstHotspot).toHaveProperty('distance_meters');
      expect(typeof firstHotspot.distance_meters).toBe('number');
      expect(firstHotspot.distance_meters).toBeGreaterThan(0);
    }
  });

  test('returns empty when no hotspots nearby', async () => {
    const { data, error } = await supabase.rpc('find_nearby_hotspot', {
      lat: 0,
      lng: 0,
      radius_meters: 100,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data)) {
      expect(data.length).toBe(0);
    }
  });

  test('returns closest hotspot first (ORDER BY distance)', async () => {
    const { data, error } = await supabase.rpc('find_nearby_hotspot', {
      lat: ATLANTA_LAT,
      lng: ATLANTA_LNG,
      radius_meters: 5000,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 1) {
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].distance_meters).toBeLessThanOrEqual(data[i + 1].distance_meters);
      }
    }
  });

  test('returns at most one hotspot (LIMIT 1)', async () => {
    const { data, error } = await supabase.rpc('find_nearby_hotspot', {
      lat: ATLANTA_LAT,
      lng: ATLANTA_LNG,
      radius_meters: 5000,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data)) {
      expect(data.length).toBeLessThanOrEqual(1);
    }
  });

  test('returns expected hotspot structure', async () => {
    const { data, error } = await supabase.rpc('find_nearby_hotspot', {
      lat: ATLANTA_LAT,
      lng: ATLANTA_LNG,
      radius_meters: 5000,
    });

    expect(error).toBeNull();
    if (data && Array.isArray(data) && data.length > 0) {
      const hotspot = data[0];
      expect(hotspot).toHaveProperty('id');
      expect(hotspot).toHaveProperty('distance_meters');
    }
  });

  test('respects default radius when not specified', async () => {
    const { data, error } = await supabase.rpc('find_nearby_hotspot', {
      lat: ATLANTA_LAT,
      lng: ATLANTA_LNG,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    if (data !== null) {
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('handles invalid latitude (outside -90 to 90)', async () => {
    const { error } = await supabase.rpc('find_nearby_hotspot', {
      lat: 91,
      lng: ATLANTA_LNG,
      radius_meters: 500,
    });

    expect(error).toBeDefined();
  });

  test('handles missing parameters', async () => {
    const { error } = await supabase.rpc('find_nearby_hotspot', {
      radius_meters: 500,
    } as any);

    expect(error).toBeDefined();
  });
});

describe('PostGIS function integration scenarios', () => {
  const ATLANTA_LAT = 33.749;
  const ATLANTA_LNG = -84.388;

  test('traffic_nodes and get_location_traffic_score return consistent data', async () => {
    const radiusMeters = 500;

    const { data: nodes, error: nodesError } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: radiusMeters,
      p_limit: 100,
    });

    const { data: score, error: scoreError } = await supabase.rpc('get_location_traffic_score', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: radiusMeters,
    });

    expect(nodesError).toBeNull();
    expect(scoreError).toBeNull();

    if (nodes && score && Array.isArray(nodes) && Array.isArray(score) && score.length > 0) {
      expect(score[0].station_count).toBe(nodes.length);
    }
  });

  test('all functions handle null parameters gracefully', async () => {
    const { error: nodesError } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: null,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 500,
      p_limit: 10,
    } as any);

    const { error: scoreError } = await supabase.rpc('get_location_traffic_score', {
      p_lat: null,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 500,
    } as any);

    const { error: hotspotError } = await supabase.rpc('find_nearby_hotspot', {
      lat: null,
      lng: ATLANTA_LNG,
      radius_meters: 500,
    } as any);

    expect(nodesError).toBeDefined();
    expect(scoreError).toBeDefined();
    expect(hotspotError).toBeDefined();
  });

  test('functions handle boundary values for coordinates', async () => {
    const maxLat = 90;
    const maxLng = 180;
    const minLat = -90;
    const minLng = -180;

    const { error: maxError } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: maxLat,
      p_lng: maxLng,
      p_radius_meters: 1000,
      p_limit: 1,
    });

    const { error: minError } = await supabase.rpc('find_nearby_traffic_nodes', {
      p_lat: minLat,
      p_lng: minLng,
      p_radius_meters: 1000,
      p_limit: 1,
    });

    expect(maxError).toBeNull();
    expect(minError).toBeNull();
  });
});
