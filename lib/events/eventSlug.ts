const NON_SLUG_CHARS = /[^\w\s-]/g;
const WHITESPACE_RUNS = /\s+/g;
const DASH_RUNS = /-+/g;
const EDGE_DASHES = /^-|-$/g;
const SLUG_WITH_DATE = /^(.+)-(\d{4}-\d{2}-\d{2})$/;

/**
 * Event slug utilities for SEO-friendly event landing page URLs.
 *
 * Event slug format: {title-slugified}-{date-YYYY-MM-DD}
 * e.g. "food-truck-friday-2026-07-04". The date suffix disambiguates
 * recurring events (same title, different dates) so each event gets a
 * unique URL — a Google requirement for event listings.
 */

const TITLE_SLUG_MAX_LENGTH = 60;

/** Convert an event title into a URL-safe slug segment. */
export function slugifyEventTitle(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(NON_SLUG_CHARS, '')
    .replaceAll(WHITESPACE_RUNS, '-')
    .replaceAll(DASH_RUNS, '-')
    .replaceAll(EDGE_DASHES, '')
    .slice(0, TITLE_SLUG_MAX_LENGTH);
}

/** Build the full event slug from title and ISO start date (YYYY-MM-DD). */
export function buildEventSlug(title: string, startDate: string): string {
  const titleSlug = slugifyEventTitle(title);
  if (!titleSlug) throw new Error(`Cannot build event slug for empty title (date ${startDate})`);
  return `${titleSlug}-${startDate}`;
}

/**
 * Build an event slug without throwing.
 * Returns null when the title cannot be turned into a valid slug segment,
 * so callers can skip or log the row instead of crashing.
 */
export function safeBuildEventSlug(title: string, startDate: string): string | null {
  const titleSlug = slugifyEventTitle(title);
  if (!titleSlug) return null;
  return `${titleSlug}-${startDate}`;
}

/**
 * Parse an event slug back into its title slug and date components.
 * Returns null when the slug does not match the expected
 * "{title}-{YYYY-MM-DD}" format.
 */
export function parseEventSlug(slug: string): { titleSlug: string; date: string } | null {
  const match = slug.match(SLUG_WITH_DATE);
  if (!match) return null;
  return { titleSlug: match[1], date: match[2] };
}