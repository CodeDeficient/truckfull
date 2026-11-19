import { describe, it, expect } from '@jest/globals';
import { buildEventMetadata, buildCityHubMetadata, buildEventTitle } from '@/lib/seo/eventMetadata';
import type { EventPageData } from '@/lib/events/eventPageData';
import type { NearbyCity } from '@/lib/events/nearbyCities';

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
    reasoning: 'Strong signals across the board',
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

describe('buildEventMetadata robots directives', () => {
  it('indexes verified future events', () => {
    const meta = buildEventMetadata(makeEvent(), 'savannah-ga', 'food-truck-friday-2099-07-04');
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it('indexes strong_signals future events (score 55, research 0.2)', () => {
    const meta = buildEventMetadata(
      makeEvent({
        vettingScore: 55,
        factors: { ...makeEvent().factors!, researchConfidence: 0.2 },
      }),
      'savannah-ga',
      'evt-2099-07-04',
    );
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it('indexes under_review future events (score 45)', () => {
    const meta = buildEventMetadata(
      makeEvent({ vettingScore: 45 }),
      'savannah-ga',
      'evt-2099-07-04',
    );
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it('indexes verified events older than 60 days', () => {
    const past = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const meta = buildEventMetadata(makeEvent({ eventStartDate: past }), 'savannah-ga', 'evt-past');
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it('noindexes events with null vetting score', () => {
    const meta = buildEventMetadata(
      makeEvent({ vettingScore: null }),
      'savannah-ga',
      'evt-2099-07-04',
    );
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('past event title includes "Past Event:" prefix', () => {
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const meta = buildEventMetadata(makeEvent({ eventStartDate: past }), 'savannah-ga', 'evt-past');
    expect(meta.title).toMatch(/^Past Event: /);
  });

  it('past event description includes "has passed"', () => {
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const meta = buildEventMetadata(makeEvent({ eventStartDate: past }), 'savannah-ga', 'evt-past');
    expect(meta.description).toContain('has passed');
  });

  it('does not mark ongoing multi-day event as past', () => {
    const start = new Date(Date.now() - 5 * 86400_000).toISOString().split('T')[0];
    const end = new Date(Date.now() + 1 * 86400_000).toISOString().split('T')[0];
    const meta = buildEventMetadata(
      makeEvent({ eventStartDate: start, eventEndDate: end }),
      'savannah-ga',
      'evt-ongoing',
    );
    expect(meta.title).not.toMatch(/^Past Event: /);
    expect(meta.description).not.toContain('has passed');
  });

  it('indexes score>=60 but research<0.5 as strong_signals (not verified) — boundary', () => {
    const meta = buildEventMetadata(
      makeEvent({
        vettingScore: 75,
        factors: { ...makeEvent().factors!, researchConfidence: 0.3 },
      }),
      'savannah-ga',
      'evt-2099-07-04',
    );
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it('sets a canonical URL under /events/{city}/{event}', () => {
    const meta = buildEventMetadata(makeEvent(), 'savannah-ga', 'food-truck-friday-2099-07-04');
    expect(meta.alternates?.canonical).toBe(
      'https://www.truckfull.food/events/savannah-ga/food-truck-friday-2099-07-04',
    );
  });

  it('title includes the formatted date and city/state', () => {
    const meta = buildEventMetadata(makeEvent(), 'savannah-ga', 'evt-2099-07-04');
    expect(meta.title).toContain('Food Truck Friday');
    expect(meta.title).toContain('Savannah');
    expect(meta.title).toContain('GA');
  });

  it('uses a fallback description when event description is empty', () => {
    const meta = buildEventMetadata(
      makeEvent({ description: '   ' }),
      'savannah-ga',
      'evt-2099-07-04',
    );
    expect(typeof meta.description).toBe('string');
    expect((meta.description ?? '').length).toBeGreaterThan(0);
    expect(meta.description).toContain('Savannah');
  });

  it('includes nearby city names in event keywords', () => {
    const nearbyCities: NearbyCity[] = [
      {
        city: 'Charleston',
        state: 'SC',
        slug: 'charleston-sc',
        minimumDistance: 20,
      },
    ];

    const meta = buildEventMetadata(
      makeEvent(),
      'savannah-ga',
      'food-truck-friday-2099-07-04',
      null,
      nearbyCities,
    );

    expect(meta.keywords).toContain('Charleston, SC food truck events');
  });
});

describe('buildCityHubMetadata', () => {
  it('is always index, follow', () => {
    const meta = buildCityHubMetadata('Savannah', 'GA', 12, 'savannah-ga');
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it('canonical URL is /events/{city-slug}', () => {
    const meta = buildCityHubMetadata('Charleston', 'SC', 5, 'charleston-sc');
    expect(meta.alternates?.canonical).toBe('https://www.truckfull.food/events/charleston-sc');
  });

  it('title and description mention the city and event count', () => {
    const meta = buildCityHubMetadata('Columbia', 'SC', 7, 'columbia-sc');
    expect(meta.title).toContain('Columbia');
    expect(meta.title).toContain('SC');
    expect(meta.description).toContain('7');
  });
});

describe('buildEventTitle', () => {
  it('keeps short titles whole with the brand suffix', () => {
    expect(buildEventTitle('Dragon Con', '2026-09-03', 'Marietta', 'GA', false)).toBe(
      'Dragon Con, Sep 3, 2026, Marietta, GA | TruckFull',
    );
  });

  it('drops the brand before trimming the event name', () => {
    expect(
      buildEventTitle('Charlotte Food Truck Festival', '2026-10-02', 'Charlotte', 'NC', true),
    ).toBe('Past Event: Charlotte Food Truck Festival, Oct 2, 2026, Charlotte, NC');
  });

  it('trims long event names but keeps the date and place', () => {
    const title = buildEventTitle(
      '7th Annual All White Wine & Jazz Scholarship Gala Featuring Te',
      '2026-09-06',
      'Elgin',
      'SC',
      true,
    );
    expect(title.length).toBeLessThanOrEqual(70);
    expect(title).toMatch(/^Past Event: 7th Annual All White Wine.*…, Sep 6, 2026, Elgin, SC$/);
  });

  it('omits the date when the event has none', () => {
    expect(buildEventTitle('Food Truck Friday', null, 'Savannah', 'GA', false)).toBe(
      'Food Truck Friday, Savannah, GA | TruckFull',
    );
  });

  it('never uses em dashes', () => {
    expect(
      buildEventTitle(
        'A Very Long Event Name That Goes On And On Forever',
        '2026-01-01',
        'North Myrtle Beach',
        'SC',
        true,
      ),
    ).not.toContain('—');
  });
});
