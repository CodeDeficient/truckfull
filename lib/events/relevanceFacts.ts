import { z } from 'zod';

const JSON_OBJECT = /\{[\s\S]*\}/;
const NON_ALPHANUMERIC_RUNS = /[^a-z0-9]+/g;

export const FACTS_MODEL = 'glm-5.3-flash';

export type RelevanceOutcome = 'confirmed' | 'likely' | 'no';

export const FOOD_SELLERS = [
  'outside_vendors',
  'host_or_venue',
  'attendees_bring_own',
  'not_mentioned',
] as const;

export const EVENT_KINDS = [
  'festival_or_fair',
  'market',
  'nightlife_or_party',
  'concert_or_show',
  'class_or_workshop',
  'sports_or_race',
  'parade',
  'hosted_meal_or_fundraiser_dinner',
  'trick_or_treat',
  'car_show',
  'kids_activity',
  'networking_or_conference',
  'tour_or_tasting',
  'other',
] as const;

const SETTINGS = ['outdoor', 'indoor', 'unknown'] as const;
const AUDIENCES = ['general', 'kids_only', 'adults_only'] as const;

function oneOfOr<const T extends readonly string[]>(values: T, fallback: T[number]) {
  return z
    .unknown()
    .default(null)
    .transform((value): T[number] =>
      typeof value === 'string' && values.includes(value) ? value : fallback,
    );
}

export const EventFactsSchema = z.object({
  food_sellers: z.enum(FOOD_SELLERS),
  food_evidence: z
    .unknown()
    .default(null)
    .transform((value): string | null => (typeof value === 'string' ? value : null)),
  setting: oneOfOr(SETTINGS, 'unknown'),
  event_kind: oneOfOr(EVENT_KINDS, 'other'),
  audience: oneOfOr(AUDIENCES, 'general'),
});

export type EventFacts = z.infer<typeof EventFactsSchema>;

export interface EventListing {
  readonly title: string;
  readonly startDate: string | null;
  readonly venue: string | null;
  readonly organizer: string | null;
  readonly category: string | null;
  readonly organizerTags: readonly string[];
  readonly summary: string | null;
  readonly fullDescription: string | null;
}

export const FACTS_SYSTEM_PROMPT = `You read event listings for a food truck finder in Georgia and the Carolinas. Report facts only. Do not decide whether the event is relevant.

Return only a JSON object with these keys:
"food_sellers": one of
  "outside_vendors" - the listing says food trucks, food vendors, food booths or named outside food businesses will sell food at the event
  "host_or_venue" - food comes from the organizer, the venue's own kitchen or bar, a caterer included in the ticket, a church or club cooking the meal, or a restaurant hosting its own event
  "attendees_bring_own" - guests are told to bring their own food or picnic
  "not_mentioned" - the listing does not say who provides food, or food is not mentioned
"food_evidence": the exact sentence from the listing that supports food_sellers, copied word for word, or null
"setting": "outdoor", "indoor" or "unknown"
"event_kind": one of ${EVENT_KINDS.map((kind) => `"${kind}"`).join(', ')}
"audience": "general", "kids_only" or "adults_only"

Rules:
- "vendors" alone, or vendors selling crafts, clothing or goods, is not outside_vendors. It must be clear the vendors sell food.
- "Food available" or "food for purchase" with no seller named, at a brewery, bar, restaurant or event venue, is host_or_venue.
- Treats or candy handed out are not food sellers.
- Nightclub events, DJ parties, day parties, bar crawls, galas and 21+ parties are nightlife_or_party.
- Use only the listing text. Do not guess from what similar events usually have.`;

const OYSTER_ROAST = /\boyster\s+roast/i;
const OPEN_KINDS = new Set<EventFacts['event_kind']>(['festival_or_fair', 'market']);
const BLOCKED_KINDS = new Set<EventFacts['event_kind']>([
  'nightlife_or_party',
  'class_or_workshop',
]);
const MIN_QUOTE_LENGTH = 6;
const QUOTE_MATCH_LENGTH = 80;

export function buildListingText(listing: EventListing): string {
  return [
    `Title: ${listing.title}`,
    listing.startDate ? `Date: ${listing.startDate}` : '',
    listing.venue ? `Venue: ${listing.venue}` : '',
    listing.organizer ? `Organizer: ${listing.organizer}` : '',
    listing.category ? `Eventbrite category: ${listing.category}` : '',
    listing.organizerTags.length > 0 ? `Organizer tags: ${listing.organizerTags.join(', ')}` : '',
    listing.summary ? `Summary: ${listing.summary}` : '',
    listing.fullDescription ? `Full description:\n${listing.fullDescription}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function parseEventFacts(text: string): EventFacts | null {
  const match = JSON_OBJECT.exec(text);
  if (!match) return null;
  try {
    const parsed = EventFactsSchema.safeParse(JSON.parse(match[0]));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replaceAll(NON_ALPHANUMERIC_RUNS, ' ').trim();
}

export function isQuoteInListing(quote: string | null, listing: EventListing): boolean {
  if (!quote) return false;
  const needle = normalize(quote).slice(0, QUOTE_MATCH_LENGTH);
  if (needle.length < MIN_QUOTE_LENGTH) return false;
  const haystack = normalize(
    [listing.title, listing.summary ?? '', listing.fullDescription ?? ''].join(' '),
  );
  return haystack.includes(needle);
}

export function decideRelevance(facts: EventFacts, listing: EventListing): RelevanceOutcome {
  if (OYSTER_ROAST.test(listing.title)) return 'no';
  const vendorsQuoted =
    facts.food_sellers === 'outside_vendors' && isQuoteInListing(facts.food_evidence, listing);
  const outdoorPartyWithVendors =
    facts.event_kind === 'nightlife_or_party' && facts.setting === 'outdoor' && vendorsQuoted;
  if (BLOCKED_KINDS.has(facts.event_kind) && !outdoorPartyWithVendors) return 'no';
  if (vendorsQuoted) return 'confirmed';
  const openEvent =
    OPEN_KINDS.has(facts.event_kind) &&
    facts.setting !== 'indoor' &&
    facts.audience !== 'kids_only';
  const sellersUnclear =
    facts.food_sellers === 'outside_vendors' || facts.food_sellers === 'not_mentioned';
  return openEvent && sellersUnclear ? 'likely' : 'no';
}
