import { describe, it, expect } from '@jest/globals';
import {
  scoreSource,
  rankSources,
  calculateSearchConfidence,
} from '@/lib/research/sourceRelevance';
import type { ResearchSource } from '@/lib/research/types';
import type { ParsedEventData } from '@/lib/research/parseEventText';

const baseParsed: ParsedEventData = {
  name: 'Asheville Mall Vendor Event',
  description: 'Vendor event at Asheville Mall',
  date: '2026-05-01',
  endDate: '2026-05-03',
  location: { address: 'Asheville Mall', city: 'Asheville', state: 'NC', lat: null, lng: null },
  time: { start: '10:00', end: '18:00' },
  category: 'market',
  expectedAttendance: 200,
  contactInfo: { phone: '828-555-0124', email: null, website: null },
  confidence: 0.8,
};

function makeSource(overrides: Partial<ResearchSource> = {}): ResearchSource {
  return {
    title: 'Asheville Mall Vendor Event',
    url: 'https://example.com/event',
    snippet: 'Vendors wanted at Asheville Mall May 1-3',
    engines: ['google'],
    ...overrides,
  };
}

describe('scoreSource', () => {
  it('scores highly when name and venue match', () => {
    const source = makeSource({
      title: 'Asheville Mall Vendor Event - May 1-3',
      snippet: 'Vendors wanted at Asheville Mall for the big market event May 1-3',
    });
    const score = scoreSource(source, baseParsed);
    expect(score).toBeGreaterThan(0.3);
  });

  it('scores zero for sources with no event name match', () => {
    const source = makeSource({
      title: 'Plan Ahead: April Events in Asheville',
      url: 'https://avltoday.6amcity.com/events/plan-ahead-asheville-nc-events',
      snippet: 'Lucky you. You just found AVLtoday\'s Plan Ahead, a list of some of the biggest events throughout Asheville each month.',
    });
    const score = scoreSource(source, baseParsed);
    expect(score).toBe(0);
  });

  it('scores zero for content about a different event in the same city', () => {
    const source = makeSource({
      title: 'Asheville Food & Wine Festival',
      url: 'https://avltoday.6amcity.com/food-wine',
      snippet: 'The annual Asheville Food & Wine Festival returns this June with dozens of restaurants and wineries.',
    });
    const score = scoreSource(source, baseParsed);
    expect(score).toBe(0);
  });

  it('scores event platforms higher than general sites', () => {
    const eventbrite = makeSource({
      url: 'https://www.eventbrite.com/e/vendor-event-123',
      title: 'Vendor Event at Asheville Mall',
      snippet: 'Asheville Mall vendor event May 1',
    });
    const generic = makeSource({
      url: 'https://avltoday.6amcity.com/events',
      title: 'Asheville Mall Vendor Event',
      snippet: 'Asheville Mall vendor event May 1',
    });
    expect(scoreSource(eventbrite, baseParsed)).toBeGreaterThan(scoreSource(generic, baseParsed));
  });

  it('scores .gov domains with high trust bonus', () => {
    const govSource = makeSource({
      url: 'https://www.ninetyisixsc.gov/events/festival-of-stars',
      title: 'Asheville Mall Vendor Event Announcement',
      snippet: 'Asheville Mall is hosting a vendor event on May 1 with food trucks and live music.',
    });
    const genericSource = makeSource({
      url: 'https://someblog.com/festival',
      title: 'Asheville Mall Vendor Event',
      snippet: 'Vendor event at Asheville Mall May 1 food trucks',
    });
    expect(scoreSource(govSource, baseParsed)).toBeGreaterThan(scoreSource(genericSource, baseParsed));
  });

  it('scores .edu domains with high trust bonus', () => {
    const eduSource = makeSource({
      url: 'https://www.sc.edu/calendar/events',
      title: 'Asheville Mall Vendor Event',
      snippet: 'Asheville Mall vendor event with food trucks May 1-3',
    });
    const result = scoreSource(eduSource, baseParsed);
    expect(result).toBeGreaterThan(0);
  });

  it('scores obituary sources as zero', () => {
    const obitSource = makeSource({
      title: 'In Memoriam - Nichols School',
      url: 'https://example.com/in-memoriam',
      snippet: 'Asheville Mall remembers beloved teacher who passed away peacefully with a vendor event celebration of life',
    });
    expect(scoreSource(obitSource, baseParsed)).toBe(0);
  });

  it('requires name match to score above zero', () => {
    const source = makeSource({
      title: 'Random Asheville Thing',
      snippet: 'Some stuff happening in Asheville NC',
    });
    expect(scoreSource(source, baseParsed)).toBe(0);
  });

  it('handles null parsed data', () => {
    const source = makeSource({ snippet: 'Event at Asheville Mall' });
    expect(scoreSource(source, null)).toBe(0);
  });
});

describe('rankSources', () => {
  it('returns sources sorted by relevance', () => {
    const sources = [
      makeSource({
        title: 'Plan Ahead April Events',
        url: 'https://avltoday.6amcity.com/events',
        snippet: 'A list of events happening in Asheville this month',
      }),
      makeSource({
        title: 'Asheville Mall Vendor Event - May 1-3',
        url: 'https://www.eventbrite.com/e/123',
        snippet: 'Vendors wanted at Asheville Mall May 1-3 for the vendor market event',
      }),
    ];
    const ranked = rankSources(sources, baseParsed);
    expect(ranked[0].title).toBe('Asheville Mall Vendor Event - May 1-3');
  });

  it('filters out zero-score sources', () => {
    const sources = [
      makeSource({
        title: 'Unrelated Topic',
        url: 'https://example.com',
        snippet: 'Something about cooking at home with nothing about vendors or malls',
      }),
    ];
    const ranked = rankSources(sources, baseParsed);
    expect(ranked).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(rankSources([], baseParsed)).toEqual([]);
  });
});

describe('calculateSearchConfidence', () => {
  it('returns 0 for no sources', () => {
    expect(calculateSearchConfidence([], baseParsed)).toBe(0);
  });

  it('returns 0.2 for one relevant source', () => {
    const sources = [
      makeSource({
        title: 'Asheville Mall Vendor Event',
        snippet: 'Vendors at Asheville Mall May 1-3 for the vendor market',
      }),
    ];
    const conf = calculateSearchConfidence(sources, baseParsed);
    expect(conf).toBe(0.2);
  });

  it('returns 0 when all sources are irrelevant', () => {
    const sources = [
      makeSource({
        title: 'Asheville Arts Festival',
        snippet: 'Annual arts event in downtown Asheville NC',
      }),
      makeSource({
        title: 'Asheville Brew Fest',
        snippet: 'Beer festival in Asheville North Carolina',
      }),
    ];
    const conf = calculateSearchConfidence(sources, baseParsed);
    expect(conf).toBe(0);
  });

  it('caps confidence at 0.7', () => {
    const sources = Array.from({ length: 10 }, (_, i) =>
      makeSource({
        title: `Asheville Mall Vendor Event ${i}`,
        snippet: 'Vendors at Asheville Mall May 1-3 for the vendor event',
        url: `https://event${i}.example.com`,
      }),
    );
    const conf = calculateSearchConfidence(sources, baseParsed);
    expect(conf).toBeLessThanOrEqual(0.7);
  });
});