// Fix the geolocation helper to improve GPS accuracy and timeout handling
import type { FoodTruck, FoodTruckDomain, FoodTruckOperatingHours, MenuItem } from '@/lib/types';
import { fromDomainToFoodTruck } from '@/lib/mappers/domain';
import { FoodTruckServiceClient } from '@/lib/supabase/services/foodTruckService.client';
import { dateKeyInTimezone } from '@/lib/services/scheduleOverride';
import { previousDateKey } from '@/lib/services/currentDaySchedule';
import {
  formatClockTimeInTimezone,
  formatWeekdayInTimezone,
} from '@/lib/services/timezoneFormatter';
import { logDebug, logWarning } from '@/lib/logging';
import type { NearbySeed } from '@/lib/filters/nearbyLoadPlan';

/**
 * Determines if a food truck is currently open based on its operating hours
 * @param truck - The food truck to check
 * @returns boolean indicating if the truck is currently open
 */
export function isTruckOpen(truck: FoodTruckDomain): boolean {
  const now = new Date();
  const hours = getCurrentHours(truck, now);
  const currentTime = getCurrentTime(now, truck.timezone);

  if (!hours || hours.closed) {
    return false;
  }

  return isWithinHours(
    parseTime(currentTime),
    parseTime(hours.open ?? '00:00'),
    parseTime(hours.close ?? '23:59'),
    hours.endsNextDay === true,
  );
}

/**
 * Formats a price value with currency symbol
 * @param price - The price to format
 * @returns Formatted price string
 */
export function formatPrice(price: string | number): string {
  const numericPrice = typeof price === 'string' ? Number.parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericPrice);
}

/**
 * Converts military time (24-hour) to 12-hour format
 * @param time - Time in HH:MM format (e.g., "07:00", "14:30")
 * @returns Time in 12-hour format with am/pm (e.g., "7:00a", "2:30p")
 */
export function formatTime12Hour(time: string | undefined): string {
  if (!time) return '';

  const [hoursStr, minutes] = time.split(':');
  const hours = Number.parseInt(hoursStr, 10);

  if (hours === 0) {
    return `12:${minutes}a`;
  } else if (hours < 12) {
    return `${hours}:${minutes}a`;
  } else if (hours === 12) {
    return `12:${minutes}p`;
  } else {
    return `${hours - 12}:${minutes}p`;
  }
}

/**
 * Gets today's operating hours for a food truck
 * @param truck - The food truck to get hours for
 * @returns Today's operating hours or null if not available
 */
export function getTodayHours(truck: FoodTruckDomain): { open: string; close: string } | null {
  const now = new Date();
  const hours = getCurrentHours(truck, now);
  if (!hours || hours.closed) {
    return null;
  }

  return {
    open: hours.open ?? '00:00',
    close: hours.close ?? '23:59',
  };
}

/**
 * Gets the price range for a food truck based on menu items
 * @param truck - The food truck to get price range for
 * @returns Price range string (e.g., "$ - $$")
 */
export function getPriceRange(truck: FoodTruckDomain): string {
  if (!truck.menu_items || truck.menu_items.length === 0) {
    return '$';
  }

  const prices = truck.menu_items
    .map((item) => item.price)
    .filter((price): price is number => price != null);

  if (prices.length === 0) {
    return '$';
  }

  const minPrice = Math.min(...prices);

  if (minPrice < 5) return '$';
  if (minPrice < 10) return '$$';
  if (minPrice < 15) return '$$$';
  return '$$$$';
}

/**
 * Gets popular menu items for a food truck
 * @param truck - The food truck to get popular items for
 * @returns Array of popular menu items with defined names
 */
export function getPopularItems(truck: FoodTruckDomain): Array<{ name: string; price?: number }> {
  if (!truck.menu_items || truck.menu_items.length === 0) {
    return [];
  }

  // For now, return all items marked as popular
  // In a real implementation, this might consider ratings, sales data, etc.

  return truck.menu_items
    .filter((item) => item.is_popular && typeof item.name === 'string' && item.name.length > 0) // Only include items with valid names
    .map((item) => ({ name: item.name, price: item.price }));
}

/**
 * Helper function to get user location with improved timeout and error handling
 * @returns Promise with user location coordinates
 */
export async function getUserLocationHelper(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  if (!navigator.geolocation) {
    logWarning('Geolocation is not supported by this browser');
    return null;
  }

  if (!navigator.permissions) {
    return null;
  }
  try {
    // eslint-disable-next-line sonarjs/no-intrusive-permissions
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    if (permission.state !== 'granted') {
      return null;
    }
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, 5000);

    // eslint-disable-next-line sonarjs/no-intrusive-permissions
    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        clearTimeout(timeoutId);
        logDebug('User location:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        clearTimeout(timeoutId);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300_000,
      },
    );
  });
}

export function requestDeviceLocation(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    // eslint-disable-next-line sonarjs/no-intrusive-permissions
    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) =>
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

/**
 * Helper function to load food trucks
 * @param _filters - Optional filters for loading trucks
 * @returns Promise with array of food trucks
 */
export async function loadFoodTrucksHelper(
  _filters?: Record<string, unknown>,
): Promise<FoodTruck[]> {
  const { trucks: domainTrucks } = await FoodTruckServiceClient.getPublicTrucks(10_000); // Load all trucks
  const trucks: FoodTruck[] = domainTrucks.map((truck: FoodTruckDomain) =>
    fromDomainToFoodTruck(truck),
  );
  return trucks;
}

/**
 * Helper function to load nearby food trucks
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @param _radius - Search radius in miles
 * @returns Promise with array of nearby food trucks
 */
export async function loadNearbyTrucksHelper(
  latitude: number,
  longitude: number,
  _radius: number = 5,
  seed?: NearbySeed,
): Promise<FoodTruck[]> {
  const { trucks: domainTrucks } = await FoodTruckServiceClient.getTrucksByLocation(
    latitude,
    longitude,
    _radius,
    seed,
  );
  const trucks = domainTrucks.map((truck: FoodTruckDomain) => {
    const ft = fromDomainToFoodTruck(truck);
    // Explicitly copy owner_id just to be safe
    ft.owner_id = truck.owner_id ?? null;
    return ft;
  });
  return trucks;
}

// Re-export calculateDistance from geoUtils for backward compatibility
export { calculateDistance } from './geoUtils';

export function isViableTruck(truck: FoodTruckDomain): boolean {
  // Basic viability checks
  return !!(truck.name && truck.id);
}

/**
 * Determines if a truck can show live status based on whether it's claimed
 * Claimed trucks can display open/closed status regardless of subscription tier
 * @param truck - The food truck to check
 * @param _ownerTier - The subscription tier of the truck's owner (unused, kept for API compatibility)
 * @returns boolean indicating if the truck can show live status
 */
export function canShowLiveStatus(truck: FoodTruckDomain, _ownerTier?: string): boolean {
  return !!truck.is_claimed;
}

/**
 * Wrapper function for isTruckOpen that respects claim status
 * @param truck - The food truck to check
 * @param ownerTier - The subscription tier of the truck's owner (unused, kept for API compatibility)
 * @returns boolean indicating if the truck is currently open (if claimed) or null if not claimed
 */
export function getTruckOpenStatus(truck: FoodTruckDomain, ownerTier?: string): boolean | null {
  if (!canShowLiveStatus(truck, ownerTier)) {
    return null;
  }

  return isTruckOpen(truck);
}

/**
 * Compute open status from operating hours and claim status.
 * Extracted from shouldShowTruckStatus for use by components that
 * don't have a full FoodTruckDomain object.
 */
export function getTruckStatusFromHours(
  operatingHours: FoodTruckOperatingHours | null | undefined,
  isClaimed: boolean | null | undefined,
  timezone?: string | null,
  currentDayHours?: FoodTruck['current_day_hours'],
): boolean | null {
  if (!isClaimed) return null;

  const now = new Date();
  const currentHours = currentDayHours ?? getHoursForDate(operatingHours, now, timezone);

  if (!currentHours || currentHours.closed || !currentHours.open || !currentHours.close) {
    return false;
  }

  const [openHours, openMinutes] = currentHours.open.split(':').map(Number);
  const [closeHours, closeMinutes] = currentHours.close.split(':').map(Number);

  const currentTime = parseTime(getCurrentTime(now, timezone));
  return isWithinHours(
    currentTime,
    openHours * 60 + openMinutes,
    closeHours * 60 + closeMinutes,
    currentHours.endsNextDay === true,
  );
}

/**
 * Enhanced function to determine if a truck's live status should be displayed
 * considering the owner relationship
 *
 * @param truck The food truck data
 * @param _ownerTier The subscription tier of the truck's owner (unused, kept for API compatibility)
 * @returns boolean | null - true if open, false if closed, null if status shouldn't be shown
 */
export function shouldShowTruckStatus(truck: FoodTruckDomain, _ownerTier?: string): boolean | null {
  return getTruckStatusFromHours(
    truck.operating_hours,
    truck.is_claimed,
    truck.timezone,
    getCurrentDayHours(truck),
  );
}

export function getCurrentTimeInTimezone(now: Date, timezone?: string | null): string {
  return formatClockTimeInTimezone(now, timezone);
}

export function getCurrentDayHours(
  truck: FoodTruckDomain,
  now: Date = new Date(),
): FoodTruck['current_day_hours'] {
  if (truck.current_day_hours && isCurrentDaySnapshot(truck, now)) {
    return truck.current_day_hours;
  }
  if (truck.current_day_hours && isActiveOvernightSnapshot(truck, now)) {
    return truck.current_day_hours;
  }
  return getHoursForDate(truck.operating_hours, now, truck.timezone);
}

function getCurrentHours(truck: FoodTruckDomain, now: Date): FoodTruck['current_day_hours'] {
  return getCurrentDayHours(truck, now);
}

function isCurrentDaySnapshot(truck: FoodTruckDomain, now: Date): boolean {
  if (!truck.current_day_service_date || !truck.timezone) return true;
  return dateKeyInTimezone(now.toISOString(), truck.timezone) === truck.current_day_service_date;
}

function isActiveOvernightSnapshot(truck: FoodTruckDomain, now: Date): boolean {
  const hours = truck.current_day_hours;
  if (!hours?.endsNextDay || !hours.open || !hours.close || isCurrentDaySnapshot(truck, now)) {
    return false;
  }
  const currentDate = truck.timezone ? dateKeyInTimezone(now.toISOString(), truck.timezone) : null;
  if (!currentDate || previousDateKey(currentDate) !== truck.current_day_service_date) return false;
  const current = parseTime(getCurrentTime(now, truck.timezone));
  return current <= parseTime(hours.close);
}

function getHoursForDate(
  operatingHours: FoodTruckOperatingHours | null | undefined,
  now: Date,
  timezone?: string | null,
): FoodTruck['current_day_hours'] {
  const day = getCurrentDayName(now, timezone) as keyof NonNullable<FoodTruck['operating_hours']>;
  return operatingHours?.[day];
}

export function getCurrentDayName(now: Date, timezone?: string | null): string {
  return formatWeekdayInTimezone(now, timezone);
}

export function formatDateInTimezone(now: Date, timezone?: string | null, daysAhead = 0): string {
  const localDateKey = timezone
    ? dateKeyInTimezone(now.toISOString(), timezone)
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const localDate = new Date(`${localDateKey ?? now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  localDate.setUTCDate(localDate.getUTCDate() + daysAhead);
  return localDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function isWithinHours(current: number, open: number, close: number, endsNextDay: boolean): boolean {
  return endsNextDay ? current >= open || current <= close : current >= open && current <= close;
}

function getCurrentTime(now: Date, timezone?: string | null): string {
  return getCurrentTimeInTimezone(now, timezone);
}

function parseTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Parses menu data into categories and items
 * Handles both grouped (Flash-style) and flat (Spreadsheet-style) formats
 * @param rawMenu - The raw menu data from the truck object
 * @returns Object containing categories array and itemsByCategory map
 */
export function parseMenuData(rawMenu: unknown): {
  categories: string[];
  itemsByCategory: Record<string, MenuItem[]>;
} {
  let categories: string[] = [];
  const itemsByCategory: Record<string, MenuItem[]> = {};

  if (Array.isArray(rawMenu) && rawMenu.length > 0) {
    // Check if the first item has an 'items' array property - indicates grouped format
    const firstItem = rawMenu[0] as Record<string, unknown>;
    const isGrouped = Array.isArray(firstItem.items);

    if (isGrouped) {
      // Grouped format: [{name: "Soups", items: [...]}, ...]
      // Use type assertion carefully since we've validated structure
      const grouped = rawMenu as unknown as { name: string; items: MenuItem[] }[];
      categories = grouped.map((cat) => cat.name);
      for (const cat of grouped) {
        itemsByCategory[cat.name] = cat.items;
      }
    } else {
      // Flat format: [{name: "Item", category: "Soups"}, ...]
      const flat = rawMenu as MenuItem[];
      const categorySet = new Set<string>();

      for (const item of flat) {
        // Use 'Main Menu' as fallback for items without category
        const cat = item.category || 'Menu';
        categorySet.add(cat);

        if (!itemsByCategory[cat]) {
          itemsByCategory[cat] = [];
        }
        itemsByCategory[cat].push(item);
      }

      categories = [...categorySet];
    }
  }

  return { categories, itemsByCategory };
}
