import { describe, it, expect } from '@jest/globals';
import {
  normalizeTitle,
  normalizeOrganizer,
  normalizeAddressForDedup,
  coordinateDistanceMeters,
  timeDifferenceMinutes,
  computeStringSimilarity,
  evaluatePair,
} from '@/lib/dedup/dedupHelpers';
import type { DedupEventInput, PairEvaluation } from '@/lib/dedup/dedupTypes';
import {
  NULL_ORGANIZER_NEUTRAL_SCORE,
  NULL_ADDRESS_NEUTRAL_SCORE,
  PAIR_REASON,
} from '@/lib/dedup/dedupConstants';

function makeEvent(overrides: Partial<DedupEventInput> = {}): DedupEventInput {
  return {
    id: 'evt-1',
    title: 'Downtown Food Festival',
    event_start_date: '2026-08-15',
    event_start_time: '18:00:00',
    location_lat: 33.47,
    location_lng: -81.97,
    location_address: '123 Main St',
    city: 'Augusta',
    state: 'GA',
    source: 'eventbrite',
    source_type: 'eventbrite',
    organization: 'Downtown Development Authority',
    vetting_score: null,
    ingested_at: null,
    ...overrides,
  };
}

function evaluateToReasons(evaluation: PairEvaluation): readonly string[] {
  return [...evaluation.reasons].sort();
}

describe('normalizeTitle', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeTitle('Downtown Food Festival!')).toBe('downtown food festival');
  });

  it('collapses whitespace', () => {
    expect(normalizeTitle('Downtown   Food  Festival')).toBe('downtown food festival');
  });

  it('returns empty string for null', () => {
    expect(normalizeTitle(null)).toBe('');
  });

  it('handles empty string', () => {
    expect(normalizeTitle('')).toBe('');
  });
});

describe('normalizeOrganizer', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeOrganizer('Augusta Downtown Assoc.')).toBe('augusta downtown assoc');
  });

  it('returns empty string for null', () => {
    expect(normalizeOrganizer(null)).toBe('');
  });
});

describe('normalizeAddressForDedup', () => {
  it('normalizes street abbreviations', () => {
    expect(normalizeAddressForDedup('123 Main Street')).toBe('123 main st');
  });

  it('normalizes avenue', () => {
    expect(normalizeAddressForDedup('456 Broad Avenue')).toBe('456 broad ave');
  });

  it('handles null', () => {
    expect(normalizeAddressForDedup(null)).toBe('');
  });

  it('Main St matches Main Street after normalization', () => {
    expect(normalizeAddressForDedup('123 Main St')).toBe(normalizeAddressForDedup('123 Main Street'));
  });

  it('Broad Ave matches Broad Avenue', () => {
    expect(normalizeAddressForDedup('456 Broad Ave')).toBe(normalizeAddressForDedup('456 Broad Avenue'));
  });
});

describe('coordinateDistanceMeters', () => {
  it('returns 0 for identical coordinates', () => {
    const d = coordinateDistanceMeters(33.47, -81.97, 33.47, -81.97);
    expect(d).not.toBeNull();
    expect(d!).toBeLessThan(1);
  });

  it('returns small distance for nearby points (~50m)', () => {
    const d = coordinateDistanceMeters(33.4700, -81.9700, 33.4703, -81.9699);
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(20);
    expect(d!).toBeLessThan(80);
  });

  it('returns null when any coordinate is null', () => {
    expect(coordinateDistanceMeters(null, -81.97, 33.47, -81.97)).toBeNull();
    expect(coordinateDistanceMeters(33.47, null, 33.47, -81.97)).toBeNull();
    expect(coordinateDistanceMeters(33.47, -81.97, null, -81.97)).toBeNull();
    expect(coordinateDistanceMeters(33.47, -81.97, 33.47, null)).toBeNull();
  });
});

describe('timeDifferenceMinutes', () => {
  it('returns 0 for identical HH:MM times', () => {
    expect(timeDifferenceMinutes('18:00', '18:00')).toBe(0);
  });

  it('returns 5 for 6:00 PM and 6:05 PM', () => {
    expect(timeDifferenceMinutes('6:00 PM', '6:05 PM')).toBe(5);
  });

  it('returns 120 for 6:00 PM and 8:00 PM', () => {
    expect(timeDifferenceMinutes('6:00 PM', '8:00 PM')).toBe(120);
  });

  it('returns 240 for 6:00 PM and 10:00 PM', () => {
    expect(timeDifferenceMinutes('6:00 PM', '10:00 PM')).toBe(240);
  });

  it('handles HH:MM:SS format', () => {
    expect(timeDifferenceMinutes('18:00:00', '18:05:00')).toBe(5);
  });

  it('handles non-crossover AM/PM times', () => {
    expect(timeDifferenceMinutes('2:00 PM', '4:00 PM')).toBe(120);
  });

  it('returns null when either time is null', () => {
    expect(timeDifferenceMinutes(null, '18:00')).toBeNull();
    expect(timeDifferenceMinutes('18:00', null)).toBeNull();
  });

  it('handles ISO datetime strings', () => {
    expect(timeDifferenceMinutes('2026-08-15T18:00:00', '2026-08-15T19:30:00')).toBe(90);
  });

  it('returns null for unparseable times', () => {
    expect(timeDifferenceMinutes('not-a-time', '18:00')).toBeNull();
  });
});

describe('computeStringSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(computeStringSimilarity('hello world', 'hello world')).toBe(1);
  });

  it('returns 1 for identical strings with different case and punctuation', () => {
    expect(computeStringSimilarity('Hello, World!', 'hello world')).toBe(1);
  });

  it('returns 0 for strings with no common words', () => {
    expect(computeStringSimilarity('abc def', 'xyz klm')).toBe(0);
  });

  it('returns 1 when both strings are empty', () => {
    expect(computeStringSimilarity('', '')).toBe(1);
  });

  it('returns 0 when one string is empty', () => {
    expect(computeStringSimilarity('hello', '')).toBe(0);
  });

  it('high similarity for "Augusta Downtown Assoc" and "Augusta Downtown Association"', () => {
    const sim = computeStringSimilarity('Augusta Downtown Assoc', 'Augusta Downtown Association');
    expect(sim).toBeGreaterThanOrEqual(0.5);
  });

  it('is symmetric', () => {
    const ab = computeStringSimilarity('Downtown Food Festival', 'Uptown Food Fest');
    const ba = computeStringSimilarity('Uptown Food Fest', 'Downtown Food Festival');
    expect(ab).toBe(ba);
  });
});

describe('evaluatePair - determinism', () => {
  it('produces identical results for identical inputs', () => {
    const a = makeEvent();
    const b = makeEvent({ id: 'evt-2', source: 'civicplus_rss', source_type: 'civicplus_rss' });

    const first = evaluatePair(a, b);
    const second = evaluatePair(a, b);

    expect(first.score).toBe(second.score);
    expect(first.strength).toBe(second.strength);

    const firstReasons = [...first.reasons].sort();
    const secondReasons = [...second.reasons].sort();
    expect(firstReasons).toEqual(secondReasons);
  });

  it('is symmetric (swap a and b produces same score and reasons set)', () => {
    const a = makeEvent({ id: 'evt-1', source: 'eventbrite', source_type: 'eventbrite' });
    const b = makeEvent({ id: 'evt-2', source: 'civicplus_rss', source_type: 'civicplus_rss' });

    const forward = evaluatePair(a, b);
    const backward = evaluatePair(b, a);

    expect(forward.score).toBe(backward.score);
    expect([...forward.reasons].sort()).toEqual([...backward.reasons].sort());
    expect(forward.strength).toBe(backward.strength);
  });
});

describe('evaluatePair - null safety', () => {
  it('does not throw when all optional fields are null', () => {
    const a = makeEvent({
      location_lat: null,
      location_lng: null,
      location_address: null,
      organization: null,
      event_start_time: null,
    });
    const b = makeEvent({
      id: 'evt-2',
      location_lat: null,
      location_lng: null,
      location_address: null,
      organization: null,
      event_start_time: null,
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
    });

    expect(() => evaluatePair(a, b)).not.toThrow();
  });

  it('returns non-against strength when all inputs are null', () => {
    const a = makeEvent({
      location_lat: null,
      location_lng: null,
      location_address: null,
      organization: null,
      event_start_time: null,
    });
    const b = makeEvent({
      id: 'evt-2',
      location_lat: null,
      location_lng: null,
      location_address: null,
      organization: null,
      event_start_time: null,
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
    });

    const result = evaluatePair(a, b);
    expect(result.strength).not.toBe('against');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('evaluatePair - score clamping', () => {
  it('clamps score to minimum 0', () => {
    const a = makeEvent({ location_lat: 33.47, location_lng: -81.97, event_start_time: '10:00' });
    const b = makeEvent({
      id: 'evt-2',
      source: 'eventbrite',
      source_type: 'eventbrite',
      location_lat: 34.00,
      location_lng: -82.00,
      event_start_time: '22:00',
    });

    const result = evaluatePair(a, b);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.strength).toBe('against');
  });

  it('clamps score to maximum 100', () => {
    const a = makeEvent();
    const b = makeEvent({
      id: 'evt-2',
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
      title: 'Downtown Food Festival',
      event_start_date: '2026-08-15',
      event_start_time: '18:00:00',
      location_lat: 33.47,
      location_lng: -81.97,
      location_address: '123 Main St',
      organization: 'Downtown Development Authority',
    });

    const result = evaluatePair(a, b);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('evaluatePair - identical events', () => {
  it('returns strong for identical events from different sources', () => {
    const a = makeEvent();
    const b = makeEvent({ id: 'evt-2', source: 'civicplus_rss', source_type: 'civicplus_rss' });

    const result = evaluatePair(a, b);
    expect(result.strength).toBe('strong');
    expect(result.score).toBe(100);
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.COORDINATE_SAME_VENUE);
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.TIME_CLOSE);
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.TITLE_HIGH_SIMILARITY);
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.ORGANIZER_MATCH);
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.ADDRESS_MATCH);
  });
});

describe('evaluatePair - cross-city dedup', () => {
  it('returns strong for same event in different cities with same coords', () => {
    const a = makeEvent();
    const b = makeEvent({
      id: 'evt-2',
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
      city: 'North Augusta',
      state: 'SC',
    });

    const result = evaluatePair(a, b);
    expect(result.strength).toBe('strong');
    expect(result.score).toBe(100);
  });
});

describe('evaluatePair - hard contradictions', () => {
  it('returns against when coordinates differ by >1000m', () => {
    const a = makeEvent({ location_lat: 33.47, location_lng: -81.97 });
    const b = makeEvent({
      id: 'evt-2',
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
      location_lat: 33.50,
      location_lng: -81.95,
    });

    const result = evaluatePair(a, b);
    expect(result.strength).toBe('against');
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.COORDINATE_CONTRADICTION);
  });

  it('returns against when time differs by >240min', () => {
    const a = makeEvent({ event_start_time: '10:00' });
    const b = makeEvent({
      id: 'evt-2',
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
      event_start_time: '18:00',
    });

    const result = evaluatePair(a, b);
    expect(result.strength).toBe('against');
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.TIME_CONTRADICTION);
  });

  it('returns against when both coordinate and time contradict', () => {
    const a = makeEvent({ location_lat: 33.47, location_lng: -81.97, event_start_time: '10:00' });
    const b = makeEvent({
      id: 'evt-2',
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
      location_lat: 34.00,
      location_lng: -82.00,
      event_start_time: '22:00',
    });

    const result = evaluatePair(a, b);
    expect(result.strength).toBe('against');
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.COORDINATE_CONTRADICTION);
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.TIME_CONTRADICTION);
  });
});

describe('evaluatePair - against preserves diagnostic evidence', () => {
  it('hard contradiction preserves positive evidence in score and reasons', () => {
    const a = makeEvent({
      title: 'Annual BBQ Cookoff',
      location_lat: 33.47,
      location_lng: -81.97,
      event_start_time: '18:00',
      organization: 'Test Organizer',
      location_address: '123 Main St',
    });
    const b = makeEvent({
      id: 'evt-2',
      source: 'eventbrite',
      source_type: 'eventbrite',
      title: 'Annual BBQ Cookoff',
      location_lat: 33.52,
      location_lng: -81.93,
      event_start_time: '18:05',
      organization: 'Test Organizer',
      location_address: '123 Main St',
    });

    const result = evaluatePair(a, b);
    expect(result.strength).toBe('against');
    expect(result.score).toBeGreaterThan(0);
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.TITLE_HIGH_SIMILARITY);
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.TIME_CLOSE);
    expect(evaluateToReasons(result)).toContain(PAIR_REASON.COORDINATE_CONTRADICTION);
  });
});

describe('evaluatePair - conflicting evidence', () => {
  it('conflicting evidence (strong title/date but >1km apart) cannot produce strong', () => {
    const a = makeEvent({
      title: 'Annual BBQ Cookoff',
      location_lat: 33.47,
      location_lng: -81.97,
      event_start_time: '18:00',
    });
    const b = makeEvent({
      id: 'evt-2',
      source: 'eventbrite',
      source_type: 'eventbrite',
      title: 'Annual BBQ Cookoff',
      location_lat: 33.52,
      location_lng: -81.93,
      event_start_time: '18:05',
    });

    const result = evaluatePair(a, b);
    expect(result.strength).not.toBe('strong');
    expect(result.strength).toBe('against');
  });

  it('same title/date but different organizer and address does not trigger against', () => {
    const a = makeEvent({
      location_address: '123 Main St',
      organization: 'Downtown Authority',
    });
    const b = makeEvent({
      id: 'evt-2',
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
      location_address: '456 Oak Ave',
      organization: 'City Parks Dept',
    });

    const result = evaluatePair(a, b);
    expect(result.strength).not.toBe('against');
  });
});

describe('evaluatePair - strength levels', () => {
  it('returns strong for score >= 80', () => {
    const a = makeEvent();
    const b = makeEvent({ id: 'evt-2', source: 'civicplus_rss', source_type: 'civicplus_rss' });

    const result = evaluatePair(a, b);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.strength).toBe('strong');
  });

  it('returns moderate for score >= 50 and < 80', () => {
    const a = makeEvent({ title: 'Annual BBQ Cookoff', event_start_time: '18:00' });
    const b = makeEvent({
      id: 'evt-2',
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
      title: 'BBQ Cookoff 2026',
      event_start_time: '18:30',
      organization: null,
      location_address: null,
    });

    const result = evaluatePair(a, b);
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThan(80);
    expect(result.strength).toBe('moderate');
  });

  it('returns weak for score >= 25 and < 50', () => {
    const a = makeEvent({ title: 'Farmers Market', event_start_time: null, organization: null, location_address: null });
    const b = makeEvent({
      id: 'evt-2',
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
      title: 'Farmers Market 2026',
      event_start_time: null,
      organization: null,
      location_address: null,
    });

    const result = evaluatePair(a, b);
    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.score).toBeLessThan(50);
    expect(result.strength).toBe('weak');
  });

  it('returns none for score < 25', () => {
    const a = makeEvent({
      title: 'Completely Different',
      location_lat: null,
      location_lng: null,
      event_start_time: null,
      organization: null,
      location_address: null,
    });
    const b = makeEvent({
      id: 'evt-2',
      source: 'civicplus_rss',
      source_type: 'civicplus_rss',
      title: 'Unrelated Event',
      location_lat: null,
      location_lng: null,
      event_start_time: null,
      organization: null,
      location_address: null,
    });

    const result = evaluatePair(a, b);
    expect(result.score).toBeLessThan(25);
    expect(result.strength).toBe('none');
  });
});

describe('evaluatePair - neutral evidence', () => {
  it('both organizer null contributes configured neutral amount', () => {
    const base = makeEvent({ title: 'Downtown Festival', organization: 'Org A' });
    const otherBase = makeEvent({ id: 'evt-2', source: 'civicplus_rss', source_type: 'civicplus_rss', title: 'Uptown Festival', organization: 'Org B' });

    const bothNull = evaluatePair(
      { ...base, organization: null },
      { ...otherBase, organization: null },
    );

    const mismatch = evaluatePair(
      { ...base },
      { ...otherBase },
    );

    const delta = bothNull.score - mismatch.score;
    expect(delta).toBe(NULL_ORGANIZER_NEUTRAL_SCORE);
    expect(bothNull.strength).toBe('moderate');
  });

  it('both address null contributes configured neutral amount', () => {
    const base = makeEvent({ title: 'Downtown Festival', location_address: '123 Main St' });
    const otherBase = makeEvent({ id: 'evt-2', source: 'civicplus_rss', source_type: 'civicplus_rss', title: 'Uptown Festival', location_address: '456 Oak Ave' });

    const bothNull = evaluatePair(
      { ...base, location_address: null },
      { ...otherBase, location_address: null },
    );

    const mismatch = evaluatePair(
      { ...base },
      { ...otherBase },
    );

    const delta = bothNull.score - mismatch.score;
    expect(delta).toBe(NULL_ADDRESS_NEUTRAL_SCORE);
    expect(bothNull.strength).toBe('moderate');
  });
});
