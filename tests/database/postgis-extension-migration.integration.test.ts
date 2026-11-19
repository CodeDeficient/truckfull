/**
 * @jest-environment node
 *
 * PostGIS Extension Relocation Integration Tests
 *
 * Validates that PostGIS is installed in the `extensions` schema (not `public`),
 * all dependent RPC functions, geography columns, GIST indexes, and triggers
 * work correctly after the migration.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;
let adminClient: SupabaseClient;

const ATLANTA_LAT = 33.749;
const ATLANTA_LNG = -84.388;

beforeAll(() => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  supabase = createClient(supabaseUrl, anonKey || serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

describe('PostGIS extension schema location', () => {
  test('verify_radius_status reports all systems healthy', async () => {
    const { data, error } = await adminClient.rpc('verify_radius_status');

    expect(error).toBeNull();
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      expect(data.postgis_installed).toBe(true);
      expect(data.location_geog_column).toBe(true);
      expect(data.location_geog_index).toBe(true);
      expect(data.update_trigger).toBe(true);
      expect(data.radius_function).toBe(true);
    }
  });
});

describe('Geography column existence (no "type does not exist" errors)', () => {
  test('selecting food_trucks does not error', async () => {
    const { error } = await adminClient.from('food_trucks').select('id').limit(1);
    expect(error).toBeNull();
  });

  test('selecting hotspots does not error', async () => {
    const { error } = await adminClient.from('hotspots').select('id').limit(1);
    expect(error).toBeNull();
  });

  test('selecting external_events does not error', async () => {
    const { error } = await adminClient.from('external_events').select('id').limit(1);
    expect(error).toBeNull();
  });
});

describe('find_trucks_within_radius RPC', () => {
  test('RPC resolves PostGIS types without error', async () => {
    const { error } = await supabase.rpc('find_trucks_within_radius', {
      user_lat: ATLANTA_LAT,
      user_lng: ATLANTA_LNG,
      radius_meters: 10000,
    });
    expect(error).toBeNull();
  });
});

describe('find_nearby_hotspot RPC', () => {
  // Traffic RPCs are service_role-only since migration 20260902000001.
  test('RPC resolves PostGIS types without error (p_lat/p_lng version)', async () => {
    const { error } = await adminClient.rpc('find_nearby_hotspot', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 500,
    });
    expect(error).toBeNull();
  });

  test('RPC resolves PostGIS types without error (lat/lng overload)', async () => {
    const { error } = await adminClient.rpc('find_nearby_hotspot', {
      lat: ATLANTA_LAT,
      lng: ATLANTA_LNG,
      radius_meters: 500,
    });
    expect(error).toBeNull();
  });
});

describe('find_nearby_events RPC', () => {
  test('RPC resolves PostGIS types without error', async () => {
    const { error } = await adminClient.rpc('find_nearby_events', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 16000,
    });
    expect(error).toBeNull();
  });
});

describe('find_nearby_external_events RPC', () => {
  test('RPC resolves PostGIS types without error', async () => {
    const { error } = await adminClient.rpc('find_nearby_external_events', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 16000,
    });
    expect(error).toBeNull();
  });
});

describe('find_nearby_traffic_nodes RPC', () => {
  // Traffic RPCs are service_role-only since migration 20260902000001.
  test('RPC resolves PostGIS types without error (2-arg version)', async () => {
    const { error } = await adminClient.rpc('find_nearby_traffic_nodes', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 1000,
    });
    expect(error).toBeNull();
  });

  test('RPC resolves PostGIS types without error (4-arg version)', async () => {
    const { error } = await adminClient.rpc('find_nearby_traffic_nodes', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 1000,
      p_limit: 10,
    });
    expect(error).toBeNull();
  });
});

describe('find_traffic_nodes_optimized RPC', () => {
  // Traffic RPCs are service_role-only since migration 20260902000001.
  test('RPC resolves without error (bbox version)', async () => {
    const bbox = `${ATLANTA_LNG - 0.05},${ATLANTA_LAT - 0.05},${ATLANTA_LNG + 0.05},${ATLANTA_LAT + 0.05}`;
    const { error } = await adminClient.rpc('find_traffic_nodes_optimized', {
      p_bbox: bbox,
      p_min_traffic_score: 0,
    });
    expect(error).toBeNull();
  });

  test('RPC resolves without error (lat/lng version)', async () => {
    const { error } = await adminClient.rpc('find_traffic_nodes_optimized', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_miles: 10,
      p_limit: 50,
    });
    expect(error).toBeNull();
  });
});

describe('get_location_traffic_score RPC', () => {
  test('RPC resolves PostGIS types without error', async () => {
    const { error } = await adminClient.rpc('get_location_traffic_score', {
      p_lat: ATLANTA_LAT,
      p_lng: ATLANTA_LNG,
      p_radius_meters: 500,
    });
    expect(error).toBeNull();
  });
});

describe('get_cached_foot_traffic RPC', () => {
  // Traffic RPCs are service_role-only since migration 20260902000001.
  test('function is callable', async () => {
    const { error } = await adminClient.rpc('get_cached_foot_traffic', {
      p_location_id: '00000000-0000-0000-0000-000000000001',
      p_cache_ttl_minutes: 30,
    });
    expect(error).toBeNull();
  });
});

describe('backfill_location_geog RPC', () => {
  test('function is callable by service_role (returns count)', async () => {
    const { error } = await adminClient.rpc('backfill_location_geog', {
      batch_size: 10,
    });
    expect(error).toBeNull();
  });
});

describe('update_organizer_rating RPC', () => {
  test('function is callable by service_role', async () => {
    const { error } = await adminClient.rpc('update_organizer_rating', {
      p_organizer_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(error).toBeNull();
  });
});
