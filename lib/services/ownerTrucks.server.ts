import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/database.remote.types';

const TRAILING_SLASHES = /\/+$/;

export type OwnerTruckRow = Database['public']['Tables']['food_trucks']['Row'];

export async function listOwnerTrucks(ownerId: string): Promise<OwnerTruckRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Owner truck lookup failed: ${error.message}`);
  return data ?? [];
}

export function isOwnAvatarUrl(url: string, userId: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  const prefix = `${base.replace(TRAILING_SLASHES, '')}/storage/v1/object/public/user-avatars/avatars/${userId}/`;
  return url.startsWith(prefix) && !url.slice(prefix.length).includes('..');
}

export async function setOwnerTruckPhotos(ownerId: string, photoUrl: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data: trucks, error } = await admin
    .from('food_trucks')
    .select('id, social_media')
    .eq('owner_id', ownerId);
  if (error) throw new Error(`Owner truck lookup failed: ${error.message}`);
  for (const truck of trucks ?? []) {
    const socialMedia =
      truck.social_media && typeof truck.social_media === 'object' && !Array.isArray(truck.social_media)
        ? truck.social_media
        : {};
    const { error: updateError } = await admin
      .from('food_trucks')
      .update({ social_media: { ...socialMedia, photo_url: photoUrl } })
      .eq('id', truck.id)
      .eq('owner_id', ownerId);
    if (updateError) throw new Error(`Owner truck photo update failed: ${updateError.message}`);
  }
  return trucks?.length ?? 0;
}
