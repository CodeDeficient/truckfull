import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { MenuItem } from '@/lib/types';

export const MAX_MENU_ITEMS = 500;

export const MenuBodySchema = z.object({
  menu: z
    .array(z.object({ name: z.string().min(1).max(200) }).passthrough())
    .max(MAX_MENU_ITEMS),
});

export async function canEditTruck(userId: string, truckId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const [{ data: truck }, { data: profile }] = await Promise.all([
    supabase.from('food_trucks').select('owner_id').eq('id', truckId).maybeSingle(),
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
  ]);
  if (!truck) return false;
  return truck.owner_id === userId || profile?.role === 'admin';
}

export async function readTruckMenu(truckId: string): Promise<MenuItem[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('menu')
    .eq('id', truckId)
    .single();
  if (error) throw new Error(`Menu read failed: ${error.message}`);
  return Array.isArray(data.menu) ? (data.menu as unknown as MenuItem[]) : [];
}

export async function writeTruckMenu(truckId: string, menu: MenuItem[]): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('food_trucks')
    .update({ menu } as unknown as Record<string, unknown>)
    .eq('id', truckId);
  if (error) throw new Error(`Menu write failed: ${error.message}`);
}
