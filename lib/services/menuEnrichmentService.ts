import { logMessage } from '@/lib/logging';

export type EnrichmentStatus = 'complete' | 'empty';

export interface MenuEnrichmentRow {
  id: string;
  name: string;
  city: string;
  state: string;
  cuisine_type: string[] | null;
  description: string | null;
  facebookUrl: string | null;
  menuCount: number;
  enrichmentStatus: EnrichmentStatus;
  data_quality_score: number;
  is_active: boolean;
}

export interface EnrichmentTarget extends MenuEnrichmentRow {
  facebookUrl: string;
  enrichmentStatus: 'empty';
}

const PLACEHOLDER_NAMES = new Set(['item 1', 'menu item', 'category 1', 'untitled', '']);

function isRealMenuItem(item: { name?: string; category?: string }): boolean {
  if (!item.name || PLACEHOLDER_NAMES.has(item.name.toLowerCase().trim())) return false;
  if (item.category && PLACEHOLDER_NAMES.has(item.category.toLowerCase().trim())) return false;
  return true;
}

function countRealMenuItems(menu: unknown[] | null): number {
  if (!Array.isArray(menu)) return 0;
  let count = 0;
  for (const entry of menu) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const nestedItems = record.items;
    if (Array.isArray(nestedItems)) {
      for (const item of nestedItems) {
        if (typeof item === 'object' && item !== null && isRealMenuItem(item as { name?: string; category?: string })) {
          count++;
        }
      }
    } else if (isRealMenuItem(record as { name?: string; category?: string })) {
      count++;
    }
  }
  return count;
}

export function categorizeEnrichmentStatus(truck: {
  menu: unknown[] | null;
}): EnrichmentStatus {
  return countRealMenuItems(truck.menu) > 0 ? 'complete' : 'empty';
}

export function filterEnrichmentTargets(trucks: MenuEnrichmentRow[]): EnrichmentTarget[] {
  return trucks
    .filter((truck) => truck.is_active && truck.enrichmentStatus === 'empty' && truck.facebookUrl !== null)
    .sort((a, b) => {
      if (b.data_quality_score !== a.data_quality_score) {
        return b.data_quality_score - a.data_quality_score;
      }
      const aLen = a.description?.length ?? 0;
      const bLen = b.description?.length ?? 0;
      return bLen - aLen;
    }) as EnrichmentTarget[];
}

export function buildEnrichmentQuery(trucks: MenuEnrichmentRow[]): MenuEnrichmentRow[] {
  return trucks
    .filter((truck) => truck.is_active)
    .sort((a, b) => {
      const aHasFb = a.facebookUrl === null ? 1 : 0;
      const bHasFb = b.facebookUrl === null ? 1 : 0;
      if (aHasFb !== bHasFb) return aHasFb - bHasFb;
      if (a.enrichmentStatus !== b.enrichmentStatus) {
        return a.enrichmentStatus === 'empty' ? -1 : 1;
      }
      return b.data_quality_score - a.data_quality_score;
    });
}

export function mapEnrichmentRow(row: Record<string, unknown>): MenuEnrichmentRow {
  const socialMedia = row.social_media as Record<string, string> | null;
  const menu = row.menu as unknown[] | null;
  const facebookUrl = socialMedia?.facebook ?? null;

  return {
    id: row.id as string,
    name: row.name as string,
    city: row.city as string,
    state: row.state as string,
    cuisine_type: row.cuisine_type as string[] | null,
    description: row.description as string | null,
    facebookUrl,
    menuCount: countRealMenuItems(menu),
    enrichmentStatus: categorizeEnrichmentStatus({ menu }),
    data_quality_score: (row.data_quality_score as number) ?? 0,
    is_active: (row.is_active as boolean) ?? false,
  };
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface MenuItem {
  name: string;
  price: number | null;
  description?: string;
  is_popular?: boolean;
  dietary?: string[];
}

export interface EnrichmentInput {
  slug: string;
  menu: MenuCategory[];
  contact_info?: Record<string, string>;
  operating_hours?: Record<string, unknown>;
  current_location?: Record<string, unknown>;
}

export interface EnrichmentResult {
  valid: boolean;
  error?: string;
}

export function validateEnrichmentInput(slug: string, menu: MenuCategory[]): EnrichmentResult {
  if (!slug) {
    return { valid: false, error: 'slug is required' };
  }
  if (!Array.isArray(menu) || menu.length === 0) {
    return { valid: false, error: 'menu must have at least one category' };
  }
  for (const category of menu) {
    if (!category.name) {
      return { valid: false, error: 'each menu category must have a name' };
    }
    if (!Array.isArray(category.items) || category.items.length === 0) {
      return { valid: false, error: 'each menu category must have items' };
    }
    for (const item of category.items) {
      if (!item.name) {
        return { valid: false, error: 'each menu item must have a name' };
      }
    }
  }
  return { valid: true };
}

export function normalizeMenuItem(raw: unknown): MenuItem {
  const item = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const normalized: MenuItem = {
    name: String(item.name ?? ''),
    price: null,
  };

  if (item.price !== undefined && item.price !== null && item.price !== '') {
    const num = Number(item.price);
    normalized.price = Number.isFinite(num) ? num : null;
  }

  if (typeof item.description === 'string') {
    normalized.description = item.description;
  }

  if (item.is_popular === true) {
    normalized.is_popular = true;
  }

  if (Array.isArray(item.dietary)) {
    normalized.dietary = item.dietary.filter((d): d is string => typeof d === 'string');
  }

  return normalized;
}

export function normalizeMenu(menu: readonly MenuCategory[]): MenuCategory[] {
  return menu.map((category) => ({
    name: category.name,
    items: category.items.map((item) => normalizeMenuItem(item)),
  }));
}

const SAFE_KEYS = new Set(['phone', 'email', 'website', 'instagram', 'facebook', 'twitter', 'tiktok', 'address']);

export function mergeContactInfo(
  existing: Record<string, string> | null | undefined,
  incoming: Record<string, string>,
): Record<string, string> {
  const merged: Record<string, string> = existing ?? {};
  for (const [key, value] of Object.entries(incoming)) {
    if (SAFE_KEYS.has(key) && typeof value === 'string' && value !== '') {
      merged[key] = value;
    }
  }
  return merged;
}

export function buildEnrichmentUpdate(input: {
  menu: MenuCategory[];
  contact_info?: Record<string, string>;
  operating_hours?: Record<string, unknown>;
  current_location?: Record<string, unknown>;
}): Record<string, unknown> {
  const update: Record<string, unknown> = {
    menu: normalizeMenu(input.menu),
    updated_at: new Date().toISOString(),
  };

  if (input.contact_info) {
    update.contact_info = input.contact_info;
  }

  if (input.operating_hours) {
    update.operating_hours = input.operating_hours;
  }

  if (input.current_location) {
    update.current_location = input.current_location;
  }

  return update;
}

export async function fetchEnrichmentData(): Promise<MenuEnrichmentRow[]> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('food_trucks')
    .select(
      'id, name, city, state, cuisine_type, description, social_media, menu, data_quality_score, is_active',
    )
    .order('data_quality_score', { ascending: false })
    .limit(500);

  if (error) {
    logMessage('Failed to fetch enrichment data:', error.message);
    return [];
  }

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((row) => mapEnrichmentRow(row));
}
