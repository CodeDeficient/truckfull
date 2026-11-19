import type { Database } from '@/lib/database.remote.types';

type OwnerTruckRow = Database['public']['Tables']['food_trucks']['Row'];

export async function fetchOwnerTrucks(): Promise<OwnerTruckRow[]> {
  const response = await fetch('/api/owner/trucks', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Owner trucks API returned ${response.status}`);
  const body = (await response.json()) as { trucks?: OwnerTruckRow[] };
  return body.trucks ?? [];
}
