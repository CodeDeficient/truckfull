/**
 * @jest-environment node
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const rows = new Map<string, unknown>();

function queryFor(table: string): Record<string, unknown> {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: rows.get(table) ?? null, error: null }),
  };
  return query;
}

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => queryFor(table) }),
}));

const { MAX_MENU_ITEMS, MenuBodySchema, canEditTruck } = await import(
  '@/lib/services/ownerTruckMenu.server'
);

describe('canEditTruck', () => {
  beforeEach(() => rows.clear());

  it('allows the truck owner', async () => {
    rows.set('food_trucks', { owner_id: 'user-1' });
    rows.set('profiles', { role: 'user' });
    expect(await canEditTruck('user-1', 'truck-1')).toBe(true);
  });

  it('allows an admin', async () => {
    rows.set('food_trucks', { owner_id: 'someone-else' });
    rows.set('profiles', { role: 'admin' });
    expect(await canEditTruck('user-1', 'truck-1')).toBe(true);
  });

  it('rejects another signed-in user', async () => {
    rows.set('food_trucks', { owner_id: 'someone-else' });
    rows.set('profiles', { role: 'user' });
    expect(await canEditTruck('user-1', 'truck-1')).toBe(false);
  });

  it('rejects a truck that does not exist', async () => {
    rows.set('profiles', { role: 'admin' });
    expect(await canEditTruck('user-1', 'missing')).toBe(false);
  });
});

describe('MenuBodySchema', () => {
  it('keeps extra item fields', () => {
    const parsed = MenuBodySchema.parse({ menu: [{ name: 'Taco', price: 3 }] });
    expect(parsed.menu[0]).toEqual({ name: 'Taco', price: 3 });
  });

  it('rejects items without a name and oversized menus', () => {
    expect(MenuBodySchema.safeParse({ menu: [{ price: 3 }] }).success).toBe(false);
    const tooMany = Array.from({ length: MAX_MENU_ITEMS + 1 }, (_, i) => ({ name: `Item ${i}` }));
    expect(MenuBodySchema.safeParse({ menu: tooMany }).success).toBe(false);
  });
});
