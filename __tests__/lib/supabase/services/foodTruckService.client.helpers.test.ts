/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ENRICH_TIERS_BATCH_LIMIT,
  ENRICH_TIERS_ENDPOINT,
  PUBLIC_TRUCK_CLIENT_COLUMNS,
  applyTiersToTrucks,
  extractOwnerIdsForEnrichment,
} from '@/lib/supabase/services/foodTruckService.client.helpers';

const makeTruck = (overrides: Record<string, unknown>) => ({
  id: 'truck-1',
  name: 'Test Truck',
  ...overrides,
});

describe('foodTruckService.client.helpers', () => {
  describe('extractOwnerIdsForEnrichment', () => {
    it('returns empty array for empty input', () => {
      expect(extractOwnerIdsForEnrichment([])).toEqual([]);
    });

    it('extracts unique owner_ids in first-seen order', () => {
      const trucks = [
        makeTruck({ id: 'a', owner_id: 'owner-1' }),
        makeTruck({ id: 'b', owner_id: 'owner-2' }),
        makeTruck({ id: 'c', owner_id: 'owner-1' }),
      ];
      expect(extractOwnerIdsForEnrichment(trucks)).toEqual(['owner-1', 'owner-2']);
    });

    it('skips trucks with null or missing owner_id', () => {
      const trucks = [
        makeTruck({ id: 'a', owner_id: 'owner-1' }),
        makeTruck({ id: 'b', owner_id: null }),
        makeTruck({ id: 'c' }),
        makeTruck({ id: 'd', owner_id: '' }),
        makeTruck({ id: 'e', owner_id: 'owner-2' }),
      ];
      expect(extractOwnerIdsForEnrichment(trucks)).toEqual(['owner-1', 'owner-2']);
    });
  });

  describe('applyTiersToTrucks', () => {
    it('returns trucks unchanged when no owner_id is set', () => {
      const trucks = [makeTruck({ id: 'a' }), makeTruck({ id: 'b' })];
      expect(applyTiersToTrucks(trucks, {})).toEqual(trucks);
    });

    it('merges subscription_tier from the tiers map', () => {
      const trucks = [
        makeTruck({ id: 'a', owner_id: 'owner-1' }),
        makeTruck({ id: 'b', owner_id: 'owner-2' }),
      ];
      const tiers = { 'owner-1': 'pro', 'owner-2': 'free' };
      const result = applyTiersToTrucks(trucks, tiers);
      expect(result[0]?.subscription_tier).toBe('pro');
      expect(result[1]?.subscription_tier).toBe('free');
    });

    it('maps owners missing from the tiers map to undefined tier', () => {
      const trucks = [makeTruck({ id: 'a', owner_id: 'owner-1' })];
      const result = applyTiersToTrucks(trucks, {});
      expect(result[0]?.subscription_tier).toBeUndefined();
    });

    it('maps null tier in the response to undefined', () => {
      const trucks = [makeTruck({ id: 'a', owner_id: 'owner-1' })];
      const tiers: Record<string, string | null> = { 'owner-1': null };
      const result = applyTiersToTrucks(trucks, tiers);
      expect(result[0]?.subscription_tier).toBeUndefined();
    });
  });

  describe('constants', () => {
    it('exposes the enrich-tiers endpoint and batch limit', () => {
      expect(ENRICH_TIERS_ENDPOINT).toBe('/api/trucks/enrich-tiers');
      expect(ENRICH_TIERS_BATCH_LIMIT).toBe(500);
    });
  });
});

describe('public truck client columns', () => {
  const selected = new Set(PUBLIC_TRUCK_CLIENT_COLUMNS.split(','));
  const mapperSource = readFileSync(join(process.cwd(), 'lib/mappers/publicView.ts'), 'utf8');
  const mapperFields = new Set(
    [...mapperSource.matchAll(/viewData\.([a-z_]+)/g)].map((match) => match[1] ?? ''),
  );
  for (const computed of ['subscription_tier', 'current_day_hours', 'current_day_service_date']) {
    mapperFields.delete(computed);
  }

  it('selects every food_trucks column the public view mapper reads', () => {
    const missing = [...mapperFields].filter((field) => !selected.has(field));
    expect(missing).toEqual([]);
  });

  it('reads every mapped field directly, with no cast hiding a column from this check', () => {
    expect(mapperSource).not.toMatch(/\(viewData as \{/);
    expect([...mapperFields]).toEqual(expect.arrayContaining(['menu', 'price_range', 'specialties']));
  });

  it('never selects the PostGIS column the browser does not use', () => {
    expect(selected.has('location_geog')).toBe(false);
    expect(PUBLIC_TRUCK_CLIENT_COLUMNS).not.toContain('*');
  });
});
