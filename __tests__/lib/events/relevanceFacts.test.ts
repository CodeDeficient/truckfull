import { describe, expect, it } from '@jest/globals';
import {
  buildListingText,
  decideRelevance,
  isQuoteInListing,
  parseEventFacts,
  type EventFacts,
  type EventListing,
} from '@/lib/events/relevanceFacts';

const LISTING: EventListing = {
  title: 'Fall Festival on Main',
  startDate: '2026-10-24',
  venue: 'Main Street',
  organizer: 'Downtown Association',
  category: 'Community & Culture',
  organizerTags: ['Festival'],
  summary: 'A day of music and fun downtown.',
  fullDescription: 'Local food trucks will be serving lunch all day.\nLive bands on two stages.',
};

function facts(overrides: Partial<EventFacts> = {}): EventFacts {
  return {
    food_sellers: 'not_mentioned',
    food_evidence: null,
    setting: 'outdoor',
    event_kind: 'festival_or_fair',
    audience: 'general',
    ...overrides,
  };
}

const QUOTED_TRUCKS = {
  food_sellers: 'outside_vendors',
  food_evidence: 'Local food trucks will be serving lunch all day.',
} as const;

describe('decideRelevance', () => {
  it('confirms an event whose listing quotes outside food sellers', () => {
    expect(decideRelevance(facts(QUOTED_TRUCKS), LISTING)).toBe('confirmed');
  });

  it('does not confirm when the quoted evidence is not in the listing', () => {
    const invented = facts({ ...QUOTED_TRUCKS, food_evidence: 'Twenty food trucks on site.' });
    expect(decideRelevance(invented, LISTING)).toBe('likely');
    expect(decideRelevance({ ...invented, event_kind: 'concert_or_show' }, LISTING)).toBe('no');
  });

  it('marks outdoor festivals and markets without named sellers as likely', () => {
    expect(decideRelevance(facts(), LISTING)).toBe('likely');
    expect(decideRelevance(facts({ event_kind: 'market', setting: 'unknown' }), LISTING)).toBe(
      'likely',
    );
  });

  it('rejects indoor and kids-only markets', () => {
    expect(decideRelevance(facts({ event_kind: 'market', setting: 'indoor' }), LISTING)).toBe('no');
    expect(decideRelevance(facts({ event_kind: 'market', audience: 'kids_only' }), LISTING)).toBe(
      'no',
    );
  });

  it('rejects host-served food even at a festival', () => {
    expect(decideRelevance(facts({ food_sellers: 'host_or_venue' }), LISTING)).toBe('no');
  });

  it('rejects parades, races and car shows that name no food sellers', () => {
    for (const kind of ['parade', 'sports_or_race', 'car_show'] as const) {
      expect(decideRelevance(facts({ event_kind: kind }), LISTING)).toBe('no');
    }
  });

  it('rejects nightlife unless it is outdoors with quoted food sellers', () => {
    const party = facts({ ...QUOTED_TRUCKS, event_kind: 'nightlife_or_party' });
    expect(decideRelevance({ ...party, setting: 'indoor' }, LISTING)).toBe('no');
    expect(decideRelevance({ ...party, setting: 'unknown' }, LISTING)).toBe('no');
    expect(decideRelevance(party, LISTING)).toBe('confirmed');
  });

  it('rejects classes even outdoors with quoted food sellers', () => {
    expect(
      decideRelevance(facts({ ...QUOTED_TRUCKS, event_kind: 'class_or_workshop' }), LISTING),
    ).toBe('no');
  });

  it('rejects every oyster roast regardless of food sellers', () => {
    const roast = { ...LISTING, title: 'Annual Oyster  Roast and Low Country Boil' };
    expect(decideRelevance(facts(QUOTED_TRUCKS), roast)).toBe('no');
  });
});

describe('isQuoteInListing', () => {
  it('matches quotes ignoring case, punctuation and spacing', () => {
    expect(isQuoteInListing('local FOOD trucks -- will be serving', LISTING)).toBe(true);
  });

  it('rejects missing, short and absent quotes', () => {
    expect(isQuoteInListing(null, LISTING)).toBe(false);
    expect(isQuoteInListing('food', LISTING)).toBe(false);
    expect(isQuoteInListing('BBQ vendors from across the state', LISTING)).toBe(false);
  });
});

describe('parseEventFacts', () => {
  it('reads JSON wrapped in a code fence', () => {
    const text = '```json\n{"food_sellers":"market","food_evidence":null}\n```';
    expect(parseEventFacts(text)).toBeNull();
    const valid =
      '```json\n{"food_sellers":"not_mentioned","food_evidence":null,"setting":"outdoor","event_kind":"market","audience":"general"}\n```';
    expect(parseEventFacts(valid)).toEqual(facts({ event_kind: 'market' }));
  });

  it('falls back to safe defaults for unknown descriptive fields', () => {
    const text = JSON.stringify({
      food_sellers: 'host_or_venue',
      setting: 'patio',
      event_kind: 'gala',
      audience: 'everyone',
    });
    expect(parseEventFacts(text)).toEqual({
      food_sellers: 'host_or_venue',
      food_evidence: null,
      setting: 'unknown',
      event_kind: 'other',
      audience: 'general',
    });
  });

  it('returns null for text without valid JSON', () => {
    expect(parseEventFacts('I could not read this listing.')).toBeNull();
    expect(parseEventFacts('{not json}')).toBeNull();
  });
});

describe('buildListingText', () => {
  it('includes the full description and skips empty fields', () => {
    const text = buildListingText({ ...LISTING, organizer: null, organizerTags: [] });
    expect(text).toContain('Full description:\nLocal food trucks will be serving lunch all day.');
    expect(text).not.toContain('Organizer');
  });
});
