import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabasePublicReader } from '@/lib/supabase/admin';
import { redactDirectContact } from '@/lib/mappers/publicListView';
import { createSharedLoader, freezeRows } from '@/lib/services/sharedLoader';
import { toCatalogLocation, type CatalogLocation } from '@/lib/services/catalogLocation';

export const PUBLIC_TRUCK_CATALOG_LIMIT = 10_000;
export const PUBLIC_TRUCK_CATALOG_REVALIDATE_SECONDS = 86_400;
export const PUBLIC_TRUCK_CATALOG_TAG = 'public-truck-catalog';
export const PUBLIC_TRUCK_CATALOG_RPC = 'get_public_truck_catalog_v2';
export const PUBLIC_TRUCK_CATALOG_SHARE_MS = 5 * 60 * 1000;
export const PUBLIC_TRUCK_CATALOG_SHAPE = 'lean-v1';
export const PUBLIC_TRUCK_CATALOG_COLUMNS =
  'id,name,slug,description,cuisine_type,city,state,current_location,operating_hours,price_range,data_quality_score,is_claimed,view_count,photo_url';

export interface PublicTruckCatalogRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string | null;
  readonly description: string | null;
  readonly cuisine_type: string[] | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly current_location: CatalogLocation | null;
  readonly operating_hours: Record<string, unknown> | null;
  readonly price_range: string | null;
  readonly data_quality_score: number | null;
  readonly is_claimed: boolean | null;
  readonly view_count: number | null;
  readonly photo_url: string | null;
}

type CatalogRpcRow = Omit<PublicTruckCatalogRow, 'current_location'> & {
  readonly current_location: unknown;
};

export interface PublicTruckProfileRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string | null;
  readonly description: string | null;
  readonly cuisine_type: string[] | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly street_address: string | null;
  readonly zip: string | null;
  readonly contact_info: Record<string, unknown> | null;
  readonly social_media: Record<string, unknown> | null;
  readonly current_location: Record<string, unknown> | null;
  readonly menu: unknown;
  readonly operating_hours: Record<string, unknown> | null;
  readonly timezone: string | null;
  readonly price_range: string | null;
  readonly specialties: string[] | null;
  readonly last_synced_at: string | null;
  readonly verification_status: string | null;
  readonly data_quality_score: number | null;
  readonly average_rating: number | null;
  readonly review_count: number | null;
  readonly is_active: boolean | null;
  readonly is_claimed: boolean | null;
  readonly view_count: number | null;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}

function toCatalogListRow(row: CatalogRpcRow): PublicTruckCatalogRow {
  return {
    ...row,
    description:
      typeof row.description === 'string' ? redactDirectContact(row.description) : row.description,
    current_location: toCatalogLocation(row.current_location),
  };
}

type RpcResult<T> = { data: T[] | null; error: { message: string } | null };

export const PUBLIC_TRUCK_CATALOG_PAGE_SIZE = 1000;

export const CATALOG_READ_TIMEOUT_MS = 15_000;

async function fetchPublicTruckCatalogPage(
  limit: number,
  from: number,
  to: number,
): Promise<PublicTruckCatalogRow[]> {
  const { data, error } = (await getSupabasePublicReader()
    .rpc(PUBLIC_TRUCK_CATALOG_RPC, { p_limit: limit })
    .select(PUBLIC_TRUCK_CATALOG_COLUMNS)
    .order('data_quality_score', { ascending: false, nullsFirst: true })
    .order('id', { ascending: true })
    .abortSignal(AbortSignal.timeout(CATALOG_READ_TIMEOUT_MS))
    .range(from, to)) as RpcResult<CatalogRpcRow>;
  if (error) throw error;
  return (data ?? []).map((row) => toCatalogListRow(row));
}

export async function getPublicTruckCatalog(limit = 5000): Promise<PublicTruckCatalogRow[]> {
  const rows: PublicTruckCatalogRow[] = [];
  while (rows.length < limit) {
    const from = rows.length;
    const to = Math.min(from + PUBLIC_TRUCK_CATALOG_PAGE_SIZE, limit) - 1;
    const page = await fetchPublicTruckCatalogPage(limit, from, to);
    rows.push(...page);
    if (page.length < to - from + 1) break;
  }
  return rows;
}

const loadPublicTruckCatalogFromDataCache = unstable_cache(
  () => getPublicTruckCatalog(PUBLIC_TRUCK_CATALOG_LIMIT),
  [PUBLIC_TRUCK_CATALOG_TAG, PUBLIC_TRUCK_CATALOG_RPC, PUBLIC_TRUCK_CATALOG_SHAPE],
  {
    revalidate: PUBLIC_TRUCK_CATALOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_TRUCK_CATALOG_TAG],
  },
);

export const getCachedPublicTruckCatalog = createSharedLoader(
  async (): Promise<readonly PublicTruckCatalogRow[]> =>
    freezeRows(await loadPublicTruckCatalogFromDataCache()),
  PUBLIC_TRUCK_CATALOG_SHARE_MS,
);

export async function getPublicTruckByIdentifier(
  identifier: string,
): Promise<PublicTruckProfileRow | null> {
  const { data, error } = (await getSupabasePublicReader()
    .rpc('get_public_truck_by_identifier', { p_identifier: identifier })
    .abortSignal(AbortSignal.timeout(CATALOG_READ_TIMEOUT_MS))) as RpcResult<PublicTruckProfileRow>;
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getPublicTruckCount(options?: {
  cities?: readonly string[] | null;
  claimedOnly?: boolean;
  requireLocation?: boolean;
}): Promise<number> {
  const { data, error } = (await getSupabasePublicReader()
    .rpc('get_public_truck_count', {
      p_cities: options?.cities && options.cities.length > 0 ? [...options.cities] : undefined,
      p_claimed_only: options?.claimedOnly ?? false,
      p_require_location: options?.requireLocation ?? false,
    })
    .abortSignal(AbortSignal.timeout(CATALOG_READ_TIMEOUT_MS))) as {
    data: number | null;
    error: { message: string } | null;
  };
  if (error) throw error;
  return data ?? 0;
}
