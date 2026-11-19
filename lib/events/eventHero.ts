/**
 * Event category detection and hero visual config.
 *
 * detectEventCategory() maps an event title to one of 7 categories
 * using case-insensitive keyword rules. getEventHero() maps a category
 * to a hero config: an UPPERCASE accent label, and a hex color used for the category
 * stripe. EventHero is intentionally icon-free — the brand brief
 * replaces Lucide icons with a small colored stripe + uppercase label.
 */

import { slugifyCity } from '@/lib/utils/slugify';

const BBQ_TERMS = /bbq|barbecue|fish fry|cookout|fish fest/i;
const MARKET_TERMS = /market|bazaar|craft fair|pop-?up/i;
const MUSIC_TERMS = /porchfest|concert|jazz|live music|symphony/i;
const COMMUNITY_TERMS = /community|celebration|parade|block party|jubilee|jamboree|gala/i;
const FESTIVAL_TERMS = /(festival|fest)/i;
const FESTIVAL_OR_OKTOBERFEST = /(festival|fest|oktoberfest)/i;

export type EventCategory =
  | 'food_truck'
  | 'festival'
  | 'market'
  | 'bbq'
  | 'music'
  | 'community'
  | 'general';

export interface EventHero {
  readonly category: EventCategory;
  /** UPPERCASE category label (e.g. "FARMERS MARKET"). */
  readonly categoryLabel: string;
  /** Hex color for the category stripe + accents. */
  readonly categoryColor: string;
}

const MUSIC_WORDS = /\b(music|jazz|soul|funk|art|film|holiday)\b/i;

function hasBbq(t: string): boolean {
  return BBQ_TERMS.test(t);
}

function hasMarket(t: string): boolean {
  return MARKET_TERMS.test(t);
}

function hasMusic(t: string): boolean {
  return MUSIC_TERMS.test(t);
}

function hasCommunity(t: string): boolean {
  return COMMUNITY_TERMS.test(t);
}

/**
 * Detect an event category from its title. Case-insensitive,
 * first-match-wins. Music-themed festivals resolve to `music` before
 * `festival` so the hero matches the event's character.
 */
export function detectEventCategory(title: string): EventCategory {
  const t = title.toLowerCase();
  if (t.includes('food truck')) return 'food_truck';
  if (hasBbq(t)) return 'bbq';
  if (hasMarket(t)) return 'market';
  if (hasMusic(t)) return 'music';
  if (FESTIVAL_TERMS.test(t) && MUSIC_WORDS.test(t)) return 'music';
  if (hasCommunity(t)) return 'community';
  if (FESTIVAL_OR_OKTOBERFEST.test(t)) return 'festival';
  return 'general';
}

interface CategoryVisual {
  readonly label: string;
  readonly color: string;
}

const CATEGORY_VISUALS: Record<EventCategory, CategoryVisual> = {
  food_truck: { label: 'Food Truck Event', color: '#ea2a2a' },
  festival: { label: 'Festival', color: '#ea2a2a' },
  market: { label: 'Farmers Market', color: '#f59e0b' },
  bbq: { label: 'BBQ & Food', color: '#ea2a2a' },
  music: { label: 'Live Music', color: '#8b5cf6' },
  community: { label: 'Community Event', color: '#10b981' },
  general: { label: 'Event', color: '#6b7280' },
};

export function getEventHero(category: EventCategory): EventHero {
  const visual = CATEGORY_VISUALS[category];
  return {
    category,
    categoryLabel: visual.label,
    categoryColor: visual.color,
  };
}

export function getCitySlug(city: string, state: string): string {
  return slugifyCity(city, state);
}
