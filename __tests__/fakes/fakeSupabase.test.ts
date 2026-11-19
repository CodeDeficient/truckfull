/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createFakeSupabaseClient } from './fakeSupabase';
import type { QueryResult } from './fakeSupabase';

describe('FakeSupabaseClient', () => {
  let fake: ReturnType<typeof createFakeSupabaseClient>;

  beforeEach(() => {
    fake = createFakeSupabaseClient();
  });

  describe('seedTable + select', () => {
    it('returns seeded rows', async () => {
      fake.seedTable('trucks', [
        { id: '1', name: 'Taco Truck' },
        { id: '2', name: 'Burger Bus' },
      ]);

      const result = await fake.client.from('trucks').select('*');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([
        { id: '1', name: 'Taco Truck' },
        { id: '2', name: 'Burger Bus' },
      ]);
    });

    it('returns empty array for unseeded table', async () => {
      const result = await fake.client.from('trucks').select('*');

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });

  describe('.eq() filter', () => {
    beforeEach(() => {
      fake.seedTable('trucks', [
        { id: '1', name: 'Taco Truck', cuisine: 'Mexican' },
        { id: '2', name: 'Burger Bus', cuisine: 'American' },
        { id: '3', name: 'Salsa Van', cuisine: 'Mexican' },
      ]);
    });

    it('filters by single eq', async () => {
      const result = await fake.client.from('trucks').select('*').eq('cuisine', 'Mexican');

      expect(result.data).toEqual([
        { id: '1', name: 'Taco Truck', cuisine: 'Mexican' },
        { id: '3', name: 'Salsa Van', cuisine: 'Mexican' },
      ]);
    });

    it('chains multiple eq filters (AND)', async () => {
      const result = await fake.client
        .from('trucks')
        .select('*')
        .eq('cuisine', 'Mexican')
        .eq('id', '1');

      expect(result.data).toEqual([{ id: '1', name: 'Taco Truck', cuisine: 'Mexican' }]);
    });
  });

  describe('.in() filter', () => {
    beforeEach(() => {
      fake.seedTable('trucks', [
        { id: '1', cuisine: 'Mexican' },
        { id: '2', cuisine: 'American' },
        { id: '3', cuisine: 'Italian' },
        { id: '4', cuisine: 'Japanese' },
      ]);
    });

    it('filters by in values', async () => {
      const result = await fake.client
        .from('trucks')
        .select('*')
        .in('cuisine', ['Mexican', 'Italian']);

      expect(result.data).toEqual([
        { id: '1', cuisine: 'Mexican' },
        { id: '3', cuisine: 'Italian' },
      ]);
    });
  });

  describe('.single()', () => {
    beforeEach(() => {
      fake.seedTable('trucks', [
        { id: '1', name: 'Taco Truck' },
        { id: '2', name: 'Burger Bus' },
      ]);
    });

    it('returns one row when exactly one matches', async () => {
      const result = await fake.client.from('trucks').select('*').eq('id', '1').single();

      expect(result.data).toEqual({ id: '1', name: 'Taco Truck' });
      expect(result.error).toBeNull();
    });

    it('returns PGRST116 error when no rows match', async () => {
      const result = await fake.client.from('trucks').select('*').eq('id', '99').single();

      expect(result.data).toBeNull();
      expect(result.error).toEqual({ code: 'PGRST116', message: 'No rows found' });
    });

    it('returns first row when multiple match', async () => {
      const result = await fake.client.from('trucks').select('*').single();

      expect(result.data).toEqual({ id: '1', name: 'Taco Truck' });
    });
  });

  describe('.insert()', () => {
    it('adds a row to the table', async () => {
      fake.seedTable('trucks', [{ id: '1', name: 'Existing' }]);

      await fake.client.from('trucks').insert({ id: '2', name: 'New Truck' });

      const result = await fake.client.from('trucks').select('*');
      expect(result.data).toEqual([
        { id: '1', name: 'Existing' },
        { id: '2', name: 'New Truck' },
      ]);
    });

    it('insert().select() returns inserted data', async () => {
      const result = await fake.client.from('trucks').insert({ id: '1', name: 'Taco' }).select();

      expect(result.data).toEqual([{ id: '1', name: 'Taco' }]);
      expect(result.error).toBeNull();
    });

    it('insert().select().single() returns single inserted row', async () => {
      const result = await fake.client
        .from('trucks')
        .insert({ id: '1', name: 'Taco' })
        .select()
        .single();

      expect(result.data).toEqual({ id: '1', name: 'Taco' });
    });

    it('insert without select returns null data', async () => {
      const result = await fake.client.from('trucks').insert({ id: '1', name: 'Taco' });

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('insert multiple rows', async () => {
      const result = await fake.client
        .from('trucks')
        .insert([
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
        ])
        .select();

      expect(result.data).toEqual([
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ]);
    });
  });

  describe('.update()', () => {
    beforeEach(() => {
      fake.seedTable('trucks', [
        { id: '1', name: 'Taco Truck', status: 'active' },
        { id: '2', name: 'Burger Bus', status: 'inactive' },
      ]);
    });

    it('updates matching rows', async () => {
      const result = await fake.client
        .from('trucks')
        .update({ status: 'closed' })
        .eq('id', '1')
        .select();

      expect(result.data).toEqual([{ id: '1', name: 'Taco Truck', status: 'closed' }]);
    });

    it('persists update in store', async () => {
      await fake.client.from('trucks').update({ status: 'closed' }).eq('id', '1');

      const rows = await fake.client.from('trucks').select('*');
      const updated = (rows.data as Array<{ id: string; status: string }>).find(
        (r) => r.id === '1',
      );
      expect(updated?.status).toBe('closed');
    });

    it('update().select().single() returns one row', async () => {
      const result = await fake.client
        .from('trucks')
        .update({ status: 'closed' })
        .eq('id', '1')
        .select()
        .single();

      expect(result.data).toEqual({ id: '1', name: 'Taco Truck', status: 'closed' });
    });
  });

  describe('.delete()', () => {
    beforeEach(() => {
      fake.seedTable('trucks', [
        { id: '1', name: 'Taco Truck' },
        { id: '2', name: 'Burger Bus' },
        { id: '3', name: 'Pizza Cart' },
      ]);
    });

    it('removes matching rows', async () => {
      await fake.client.from('trucks').delete().eq('id', '2');

      const result = await fake.client.from('trucks').select('*');
      expect(result.data).toEqual([
        { id: '1', name: 'Taco Truck' },
        { id: '3', name: 'Pizza Cart' },
      ]);
    });

    it('delete().eq().eq() chains multiple filters', async () => {
      await fake.client.from('trucks').delete().eq('id', '1').eq('name', 'Taco Truck');

      const result = await fake.client.from('trucks').select('*');
      expect(result.data).toEqual([
        { id: '2', name: 'Burger Bus' },
        { id: '3', name: 'Pizza Cart' },
      ]);
    });
  });

  describe('.order()', () => {
    it('sorts ascending by default', async () => {
      fake.seedTable('trucks', [
        { id: '1', name: 'C' },
        { id: '2', name: 'A' },
        { id: '3', name: 'B' },
      ]);

      const result = await fake.client.from('trucks').select('*').order('name');

      expect((result.data as Array<{ name: string }>).map((r) => r.name)).toEqual(['A', 'B', 'C']);
    });

    it('sorts descending when specified', async () => {
      fake.seedTable('trucks', [
        { id: '1', name: 'C' },
        { id: '2', name: 'A' },
        { id: '3', name: 'B' },
      ]);

      const result = await fake.client
        .from('trucks')
        .select('*')
        .order('name', { ascending: false });

      expect((result.data as Array<{ name: string }>).map((r) => r.name)).toEqual(['C', 'B', 'A']);
    });

    it('sorts numerically', async () => {
      fake.seedTable('trucks', [
        { id: '1', rating: 4.5 },
        { id: '2', rating: 3.0 },
        { id: '3', rating: 5.0 },
      ]);

      const result = await fake.client.from('trucks').select('*').order('rating');

      expect((result.data as Array<{ rating: number }>).map((r) => r.rating)).toEqual([
        3.0, 4.5, 5.0,
      ]);
    });
  });

  describe('.range()', () => {
    it('paginates results with count', async () => {
      fake.seedTable(
        'trucks',
        Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), name: `Truck ${i + 1}` })),
      );

      const result = await fake.client.from('trucks').select('*').range(0, 4);

      expect(result.data).toHaveLength(5);
      expect(result.count).toBe(20);
      expect((result.data as Array<{ id: string }>)[0].id).toBe('1');
    });

    it('handles second page', async () => {
      fake.seedTable(
        'trucks',
        Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), name: `Truck ${i + 1}` })),
      );

      const result = await fake.client.from('trucks').select('*').range(5, 9);

      expect(result.data).toHaveLength(5);
      expect((result.data as Array<{ id: string }>)[0].id).toBe('6');
    });

    it('combines with order and filters', async () => {
      fake.seedTable(
        'trucks',
        Array.from({ length: 10 }, (_, i) => ({
          id: String(i + 1),
          active: i < 6,
        })),
      );

      const result = await fake.client
        .from('trucks')
        .select('*')
        .eq('active', true)
        .order('id')
        .range(0, 2);

      expect(result.data).toHaveLength(3);
      expect(result.count).toBe(6);
    });
  });

  describe('.rpc()', () => {
    it('returns stubbed result', async () => {
      fake.stubRpc('nearby_trucks', (args) => ({
        trucks: [{ id: '1', lat: args.lat, lng: args.lng }],
      }));

      const result = await fake.client.rpc('nearby_trucks', { lat: 37.7, lng: -122.4 });

      expect(result.error).toBeNull();
      const data = result.data as { trucks: Array<{ id: string; lat: number; lng: number }> };
      expect(data.trucks[0].id).toBe('1');
      expect(data.trucks[0].lat).toBe(37.7);
    });

    it('returns error for unstubbed rpc', async () => {
      const result = await fake.client.rpc('unknown_fn', {});

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('not stubbed');
    });

    it('can override stubs', async () => {
      fake.stubRpc('fn', () => 'first');
      const r1 = await fake.client.rpc('fn', {});
      expect(r1.data).toBe('first');

      fake.stubRpc('fn', () => 'second');
      const r2 = await fake.client.rpc('fn', {});
      expect(r2.data).toBe('second');
    });
  });

  describe('.channel()', () => {
    it('creates channel with on/subscribe/unsubscribe', () => {
      const callback = (..._args: unknown[]) => {};
      const channel = fake.client.channel('test-channel').on('INSERT', {}, callback).subscribe();

      const stored = fake.getChannel('test-channel');
      expect(stored).toBeDefined();
      expect(stored?.isSubscribed()).toBe(true);

      stored?.unsubscribe();
      expect(stored?.isSubscribed()).toBe(false);
    });

    it('returns same channel instance for same name', () => {
      const ch1 = fake.client.channel('test');
      const ch2 = fake.client.channel('test');
      expect(ch1).toBe(ch2);
    });
  });

  describe('clearAll()', () => {
    it('resets all data', async () => {
      fake.seedTable('trucks', [{ id: '1', name: 'Taco' }]);
      fake.stubRpc('fn', () => 'result');

      fake.clearAll();

      const rows = await fake.client.from('trucks').select('*');
      expect(rows.data).toEqual([]);

      const rpcResult = await fake.client.rpc('fn', {});
      expect(rpcResult.error).toBeDefined();
    });
  });

  describe('chaining patterns from codebase', () => {
    it('supports select().eq().order().range()', async () => {
      fake.seedTable('events', [
        { id: '1', truck_id: 't1', date: '2026-01-01' },
        { id: '2', truck_id: 't1', date: '2026-01-03' },
        { id: '3', truck_id: 't2', date: '2026-01-02' },
        { id: '4', truck_id: 't1', date: '2026-01-04' },
      ]);

      const result = await fake.client
        .from('events')
        .select('*')
        .eq('truck_id', 't1')
        .order('date', { ascending: true })
        .range(0, 1);

      expect(result.data).toHaveLength(2);
      expect(result.count).toBe(3);
      const dates = (result.data as Array<{ date: string }>).map((r) => r.date);
      expect(dates).toEqual(['2026-01-01', '2026-01-03']);
    });

    it('supports insert().select().single()', async () => {
      const result = await fake.client
        .from('reviews')
        .insert({ id: 'r1', rating: 5, text: 'Great!' })
        .select()
        .single();

      expect(result.data).toEqual({ id: 'r1', rating: 5, text: 'Great!' });
      expect(result.error).toBeNull();
    });

    it('supports update().eq().select()', async () => {
      fake.seedTable('trucks', [
        { id: '1', name: 'Old', status: 'active' },
        { id: '2', name: 'Other', status: 'active' },
      ]);

      const result = await fake.client
        .from('trucks')
        .update({ status: 'inactive' })
        .eq('id', '1')
        .select();

      expect(result.data).toEqual([{ id: '1', name: 'Old', status: 'inactive' }]);

      const allRows = await fake.client.from('trucks').select('*');
      expect(allRows.data).toHaveLength(2);
    });

    it('supports delete().eq().eq() double filter', async () => {
      fake.seedTable('favorites', [
        { user_id: 'u1', truck_id: 't1' },
        { user_id: 'u1', truck_id: 't2' },
        { user_id: 'u2', truck_id: 't1' },
      ]);

      await fake.client.from('favorites').delete().eq('user_id', 'u1').eq('truck_id', 't1');

      const remaining = await fake.client.from('favorites').select('*');
      expect(remaining.data).toEqual([
        { user_id: 'u1', truck_id: 't2' },
        { user_id: 'u2', truck_id: 't1' },
      ]);
    });

    it('supports select().in().order()', async () => {
      fake.seedTable('trucks', [
        { id: '3', cuisine: 'Italian' },
        { id: '1', cuisine: 'Mexican' },
        { id: '4', cuisine: 'Japanese' },
        { id: '2', cuisine: 'American' },
      ]);

      const result = await fake.client
        .from('trucks')
        .select('*')
        .in('cuisine', ['Mexican', 'American', 'Japanese'])
        .order('cuisine');

      const cuisines = (result.data as Array<{ cuisine: string }>).map((r) => r.cuisine);
      expect(cuisines).toEqual(['American', 'Japanese', 'Mexican']);
    });
  });

  describe('upsert', () => {
    it('inserts new row when id not found', async () => {
      fake.seedTable('trucks', [{ id: '1', name: 'Existing' }]);

      const result = await fake.client.from('trucks').upsert({ id: '2', name: 'New' }).select();

      expect(result.data).toEqual([{ id: '2', name: 'New' }]);
    });

    it('updates existing row when id matches', async () => {
      fake.seedTable('trucks', [{ id: '1', name: 'Old', status: 'active' }]);

      const result = await fake.client.from('trucks').upsert({ id: '1', name: 'Updated' }).select();

      expect(result.data).toEqual([{ id: '1', name: 'Updated', status: 'active' }]);
    });
  });

  describe('limit', () => {
    it('limits result count', async () => {
      fake.seedTable(
        'trucks',
        Array.from({ length: 10 }, (_, i) => ({ id: String(i + 1) })),
      );

      const result = await fake.client.from('trucks').select('*').limit(3);

      expect(result.data).toHaveLength(3);
    });
  });

  describe('is filter', () => {
    it('filters by null', async () => {
      fake.seedTable('trucks', [
        { id: '1', name: 'A', owner: null },
        { id: '2', name: 'B', owner: 'John' },
      ]);

      const result = await fake.client.from('trucks').select('*').is('owner', null);

      expect(result.data).toEqual([{ id: '1', name: 'A', owner: null }]);
    });
  });

  describe('gte/lte filters', () => {
    it('filters by range', async () => {
      fake.seedTable('trucks', [
        { id: '1', rating: 3.0 },
        { id: '2', rating: 4.0 },
        { id: '3', rating: 5.0 },
      ]);

      const result = await fake.client
        .from('trucks')
        .select('*')
        .gte('rating', 3.5)
        .lte('rating', 4.5);

      expect(result.data).toEqual([{ id: '2', rating: 4.0 }]);
    });
  });

  describe('auth', () => {
    it('returns null user by default', async () => {
      const result = await fake.client.auth.getUser();

      expect(result.data.user).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('data isolation between tests', () => {
    it('does not leak data across factory instances', async () => {
      const fake1 = createFakeSupabaseClient();
      const fake2 = createFakeSupabaseClient();

      fake1.seedTable('trucks', [{ id: '1', name: 'Only in fake1' }]);

      const r1 = await fake1.client.from('trucks').select('*');
      const r2 = await fake2.client.from('trucks').select('*');

      expect(r1.data).toHaveLength(1);
      expect(r2.data).toEqual([]);
    });
  });
});
