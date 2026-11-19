import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  PUBLIC_TRUCK_CATALOG_REVALIDATE_SECONDS,
  PUBLIC_TRUCK_CATALOG_TAG,
} from '@/lib/services/publicTruckData.server';
import { getCompletenessFlags, type CompletenessFlags } from '@/lib/city/truckCompleteness';

const ID_CHUNK = 100;

async function fetchCompleteness(ids: readonly string[]): Promise<Record<string, CompletenessFlags>> {
  const out: Record<string, CompletenessFlags> = {};
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const { data, error } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('id, street_address, contact_info, social_media, menu, is_claimed')
      .in('id', ids.slice(i, i + ID_CHUNK));
    if (error) throw error;
    for (const row of data ?? []) out[row.id] = getCompletenessFlags(row);
  }
  return out;
}

export async function getCityTruckCompleteness(
  citySlug: string,
  ids: readonly string[],
): Promise<Record<string, CompletenessFlags>> {
  const sortedIds = [...ids].sort();
  const idsKey = createHash('sha256').update(sortedIds.join(',')).digest('hex').slice(0, 16);
  return unstable_cache(() => fetchCompleteness(sortedIds), ['city-truck-completeness', citySlug, idsKey], {
    revalidate: PUBLIC_TRUCK_CATALOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_TRUCK_CATALOG_TAG],
  })();
}
