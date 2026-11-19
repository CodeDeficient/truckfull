/**
 * Pure date helpers for the event SEO horizon and floor.
 *
 * - 365-day horizon — events more than 365 days out are excluded from
 *   SEO pages and the sitemap so we don't index speculative listings.
 * - 730-day floor (2 years) — events older than 2 years are excluded
 *   from pre-rendering and the sitemap to bound build time.
 */

export const SEO_HORIZON_DAYS = 365;
export const SEO_FLOOR_DAYS = 730;

/** ISO date (YYYY-MM-DD) of `today` + SEO_HORIZON_DAYS, in UTC. */
export function horizonDate(today: Date): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + SEO_HORIZON_DAYS);
  return d.toISOString().split('T')[0];
}

/** ISO date (YYYY-MM-DD) of `today` - SEO_FLOOR_DAYS, in UTC. */
export function floorDate(today: Date): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - SEO_FLOOR_DAYS);
  return d.toISOString().split('T')[0];
}

/** ISO date (YYYY-MM-DD) of `today`, in UTC. */
export function todayDate(today: Date): string {
  return new Date(today).toISOString().split('T')[0];
}

/** True when the event has ended (before `today`). For multi-day events,
 *  checks both start and end dates so an ongoing multi-day event is not
 *  marked as past. An event happening today is not past. */
export function isPastEvent(
  eventStartDate: string | null,
  eventEndDate?: string | null,
  today: Date = new Date(),
): boolean {
  if (!eventStartDate) return false;
  const start = new Date(`${eventStartDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start)) return false;
  if (eventEndDate) {
    const end = new Date(`${eventEndDate}T23:59:59Z`).getTime();
    if (!Number.isNaN(end) && today.getTime() <= end) return false;
  }
  const todayStr = today.toISOString().split('T')[0];
  if (eventStartDate >= todayStr) return false;
  return start < today.getTime();
}