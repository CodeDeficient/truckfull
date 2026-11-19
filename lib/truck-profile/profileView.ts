import type { PublicTruckRow } from '@/lib/services/publicTruckPage';
import { getMenuEntries } from '@/lib/utils/menuLazyLoad';
import { transformPhotoUrl } from '@/lib/utils/photoTransform';
import { sanitizeUrl } from '@/lib/utils/url';
import { dateKeyInTimezone, weekdayForDateKey } from '@/lib/services/scheduleOverride';
import { formatWeekdayInTimezone } from '@/lib/services/timezoneFormatter';
import { hasValidCoordinates } from '@/lib/services/activeLocation';
import type { NextStop } from '@/lib/truck-profile/nextStop';

const QUOTED_IN_NAME_DESCRIPTION = /^["“].+["”]\s+in name[.!]?$/i;

export interface ProfileMenuItem {
  readonly name: string;
  readonly description?: string;
  readonly price?: string;
}

export interface ProfileMenuCategory {
  readonly name: string;
  readonly items: readonly ProfileMenuItem[];
}

export interface ProfileHoursDay {
  readonly day: string;
  readonly label: string;
  readonly status: 'open' | 'closed' | 'all-day' | 'blank';
  readonly hours?: string;
}

export interface ProfileScheduleUpdate {
  readonly date: string;
  readonly source: 'manual' | 'facebook';
}

export interface TruckProfileView {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly cuisines: readonly string[];
  readonly priceRange: string | null;
  readonly photoUrl: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly website: string | null;
  readonly facebook: string | null;
  readonly instagram: string | null;
  readonly address: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly menu: readonly ProfileMenuCategory[];
  readonly menuItemCount: number;
  readonly hours: readonly ProfileHoursDay[];
  readonly hasPublishedHours: boolean;
  readonly isClaimed: boolean;
  readonly nextStop: NextStop | null;
  readonly timezone: string | null;
  readonly scheduleUpdate: ProfileScheduleUpdate | null;
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function safeUrl(value: unknown): string | null {
  return typeof value === 'string' ? sanitizeUrl(value) : null;
}

const UNCATEGORIZED_LABEL = 'Menu';

function normalizeMenuItem(item: unknown): ProfileMenuItem | null {
  if (!isRecord(item) || typeof item.name !== 'string') return null;
  const priceValue = item.price;
  const price =
    typeof priceValue === 'number' && Number.isFinite(priceValue)
      ? `$${priceValue.toFixed(2)}`
      : typeof priceValue === 'string' && priceValue.trim()
        ? priceValue.trim()
        : undefined;
  return {
    name: item.name,
    description: typeof item.description === 'string' ? item.description : undefined,
    price,
  };
}

function normalizeMenu(rawMenu: unknown): ProfileMenuCategory[] {
  const entries = getMenuEntries(rawMenu);
  const grouped = new Map<string, ProfileMenuItem[]>();

  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const name = typeof entry.name === 'string' ? entry.name : null;
    if (!name) continue;

    const isCategory = Array.isArray(entry.items);
    const categoryName = isCategory
      ? name
      : typeof entry.category === 'string' && entry.category.trim()
        ? entry.category.trim()
        : UNCATEGORIZED_LABEL;
    const rawItems = isCategory ? (entry.items as unknown[]) : [entry];

    const bucket = grouped.get(categoryName) ?? [];
    for (const rawItem of rawItems) {
      const item = normalizeMenuItem(rawItem);
      if (item) bucket.push(item);
    }
    if (bucket.length > 0) grouped.set(categoryName, bucket);
  }

  return [...grouped].map(([name, items]) => ({ name, items }));
}

export function normalizeProfileHours(
  rawHours: unknown,
  currentDayHours: unknown,
  currentDayServiceDate: string | null | undefined,
  timezone: string | null,
): { hours: ProfileHoursDay[]; hasPublishedHours: boolean } {
  const displayHours = isRecord(rawHours) ? { ...rawHours } : {};
  if (isRecord(currentDayHours)) {
    displayHours[
      (currentDayServiceDate ? weekdayForDateKey(currentDayServiceDate) : null) ??
        formatWeekdayInTimezone(new Date(), timezone)
    ] = currentDayHours;
  }

  let published = false;
  const hours: ProfileHoursDay[] = DAY_ORDER.map((day) => {
    const entry = displayHours[day];
    const label = day.charAt(0).toUpperCase() + day.slice(1);
    if (!isRecord(entry)) return { day, label, status: 'blank' as const };
    if (entry.closed === true) return { day, label, status: 'closed' as const };
    if (entry.isAllDay === true) {
      published = true;
      return { day, label, status: 'all-day' as const };
    }
    if (typeof entry.open === 'string' && typeof entry.close === 'string') {
      published = true;
      return { day, label, status: 'open' as const, hours: `${entry.open} – ${entry.close}` };
    }
    return { day, label, status: 'blank' as const };
  });

  return { hours, hasPublishedHours: published };
}

export function normalizeProfileDescription(description: string | null): string | null {
  const value = description?.trim();
  if (!value || QUOTED_IN_NAME_DESCRIPTION.test(value)) return null;
  return value;
}

function toCoordinatePair(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const candidate = { lat, lng };
  return hasValidCoordinates(candidate) ? candidate : null;
}

function firstValidCoordinate(
  candidates: readonly (readonly [unknown, unknown])[],
): { lat: number; lng: number } | null {
  for (const [lat, lng] of candidates) {
    const coordinates = toCoordinatePair(lat, lng);
    if (coordinates) return coordinates;
  }
  return null;
}

function resolveProfileCoordinates(
  row: PublicTruckRow,
  location: Record<string, unknown>,
): { lat: number; lng: number } | null {
  const liveCoordinates: readonly [unknown, unknown] = [row.live_gps_lat, row.live_gps_lng];
  const currentCoordinates: readonly [unknown, unknown] = [location.lat, location.lng];
  const defaultCoordinates: readonly [unknown, unknown] = [row.default_lat, row.default_lng];

  if (row.status === 'live') {
    return firstValidCoordinate([liveCoordinates, defaultCoordinates, currentCoordinates]);
  }
  return firstValidCoordinate([defaultCoordinates, currentCoordinates]);
}

const SCHEDULE_UPDATE_SOURCES: Partial<Record<string, ProfileScheduleUpdate['source']>> = {
  manual: 'manual',
  facebook: 'facebook',
};

function normalizeScheduleUpdate(row: PublicTruckRow): ProfileScheduleUpdate | null {
  const at = row.schedule_updated_at;
  if (!at || Number.isNaN(new Date(at).getTime())) return null;
  const source = SCHEDULE_UPDATE_SOURCES[row.schedule_updated_by ?? ''];
  if (!source) return null;
  const date = row.timezone
    ? dateKeyInTimezone(at, row.timezone)
    : new Date(at).toISOString().slice(0, 10);
  return date ? { date, source } : null;
}

export function buildTruckProfileView(row: PublicTruckRow): TruckProfileView {
  const isClaimed = row.is_claimed === true;
  const contact = isRecord(row.contact_info) ? row.contact_info : {};
  const social = isRecord(row.social_media) ? row.social_media : {};
  const location = isRecord(row.current_location) ? row.current_location : {};

  const photoRaw = typeof social.photo_url === 'string' ? social.photo_url : null;
  const photoUrl = photoRaw ? (transformPhotoUrl(photoRaw) ?? null) : null;

  const menu = normalizeMenu(row.menu);
  const menuItemCount = menu.reduce((sum, category) => sum + category.items.length, 0);
  const { hours, hasPublishedHours } = normalizeProfileHours(
    row.operating_hours,
    row.current_day_hours,
    row.current_day_service_date,
    row.timezone,
  );
  const coordinates = resolveProfileCoordinates(row, location);

  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name,
    description: normalizeProfileDescription(row.description),
    city: row.city ?? null,
    state: row.state ?? null,
    cuisines: Array.isArray(row.cuisine_type) ? row.cuisine_type : [],
    priceRange: row.price_range ?? null,
    photoUrl,
    phone: typeof contact.phone === 'string' ? contact.phone : null,
    email: typeof contact.email === 'string' ? contact.email : null,
    website: safeUrl(contact.website),
    facebook: safeUrl(social.facebook),
    instagram: safeUrl(social.instagram),
    address: typeof location.address === 'string' ? location.address : null,
    lat: coordinates?.lat ?? null,
    lng: coordinates?.lng ?? null,
    menu,
    menuItemCount,
    hours,
    hasPublishedHours,
    isClaimed,
    nextStop: isClaimed ? (row.next_stop ?? null) : null,
    timezone: row.timezone ?? null,
    scheduleUpdate: isClaimed ? normalizeScheduleUpdate(row) : null,
  };
}
