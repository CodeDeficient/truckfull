import { describe, it, expect } from '@jest/globals';
import {
  generateEventJsonLd,
  generateEventBreadcrumbJsonLd,
  detectEventType,
  truncateAtSentence,
  easternOffset,
} from '@/lib/seo/eventJsonLd';
import type { EventPageData } from '@/lib/events/eventPageData';

function makeEvent(overrides: Partial<EventPageData> = {}): EventPageData {
  const eventStartDate = overrides.eventStartDate ?? '2099-07-04';
  const eventEndDate = overrides.eventEndDate ?? eventStartDate;
  const base: EventPageData = {
    id: 'evt-1',
    title: 'Food Truck Friday',
    description: 'A community food truck event.',
    organization: null,
    website: null,
    sourceUrl: null,
    source: 'savannah_eproval',
    sourceType: 'eproval',
    city: 'Savannah',
    state: 'GA',
    locationAddress: '123 Main St',
    locationLat: 32.08,
    locationLng: -81.09,
    eventStartDate,
    eventStartTime: '17:00:00',
    eventEndDate,
    eventEndTime: '18:00:00',
    permitStatus: 'unknown',
    verificationTier: 1,
    vettingScore: 89,
    vettedAt: '2026-06-01T00:00:00Z',
    recommendation: 'highly_recommended',
    reasoning: 'Strong signals',
    factors: {
      trafficScore: 0.85,
      researchConfidence: 0.8,
      historyScore: 0.7,
      areaEventCount: 12,
      recurringCount: 3,
      venuePopularity: 0.6,
      previouslyOccurredScore: 0.5,
      titleScore: 0.8,
    },
    isFoodTruckRelevant: true,
  };
  return { ...base, ...overrides };
}

describe('generateEventJsonLd', () => {
  it('emits a valid startDate for events with a date', () => {
    const schema = generateEventJsonLd(makeEvent(), 'https://example.com/events/x');
    expect(schema['startDate']).toBeTruthy();
    expect(schema['startDate']).not.toBe('');
  });

  it('throws when startDate is null instead of emitting empty string', () => {
    expect(() =>
      generateEventJsonLd(makeEvent({ eventStartDate: null }), 'https://example.com/events/x'),
    ).toThrow(/no startDate/);
  });

  it('throws when startDate is empty string', () => {
    expect(() =>
      generateEventJsonLd(makeEvent({ eventStartDate: '' }), 'https://example.com/events/x'),
    ).toThrow(/no startDate/);
  });

  it('emits @context, @type, and required Event properties', () => {
    const schema = generateEventJsonLd(makeEvent(), 'https://example.com/events/x');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBeTruthy();
    expect(schema['name']).toBe('Food Truck Friday');
    expect(schema['url']).toBe('https://example.com/events/x');
  });

  it('omits endDate when event has no endDate', () => {
    const schema = generateEventJsonLd(makeEvent({ eventEndDate: null }), 'https://example.com/events/x');
    expect(schema['endDate']).toBeUndefined();
  });
});

describe('detectEventType', () => {
  it('detects FoodEvent for food truck + fest', () => {
    expect(detectEventType('Food Truck Festival')).toBe('FoodEvent');
  });
  it('detects Festival for festival + food word', () => {
    expect(detectEventType('BBQ Festival')).toBe('Festival');
  });
  it('falls back to Event for generic titles', () => {
    expect(detectEventType('Line Dancing at the Park')).toBe('Event');
  });
});

describe('generateEventBreadcrumbJsonLd', () => {
  it('returns 4 breadcrumb items in correct order', () => {
    const schema = generateEventBreadcrumbJsonLd(
      'savannah-ga',
      'Savannah',
      'Food Truck Friday',
      'https://example.com/events/savannah-ga/food-truck-friday',
    );
    expect(schema['@type']).toBe('BreadcrumbList');
    const items = schema['itemListElement'] as Array<{ position: number; name: string }>;
    expect(items).toHaveLength(4);
    expect(items[0]?.name).toBe('Home');
    expect(items[3]?.name).toBe('Food Truck Friday');
  });
});

describe('truncateAtSentence', () => {
  it('returns short text unchanged', () => {
    expect(truncateAtSentence('Short.', 100)).toBe('Short.');
  });

  it('truncates at the last sentence boundary within maxChars', () => {
    const text = 'First sentence. Second sentence. Third sentence that runs long here.';
    expect(truncateAtSentence(text, 35)).toBe('First sentence. Second sentence.');
  });

  it('falls back to hard-trim when no sentence end is found', () => {
    const text = 'a'.repeat(50);
    expect(truncateAtSentence(text, 20)).toHaveLength(20);
  });
});

describe('easternOffset', () => {
  it('returns -05:00 in early March before DST', () => {
    expect(easternOffset('2026-03-01')).toBe('-05:00');
  });
  it('returns -04:00 in mid-March after DST starts', () => {
    expect(easternOffset('2026-03-15')).toBe('-04:00');
  });
  it('returns -04:00 in late October before DST ends', () => {
    expect(easternOffset('2026-10-25')).toBe('-04:00');
  });
  it('returns -05:00 in mid-November after DST ends', () => {
    expect(easternOffset('2026-11-15')).toBe('-05:00');
  });
});