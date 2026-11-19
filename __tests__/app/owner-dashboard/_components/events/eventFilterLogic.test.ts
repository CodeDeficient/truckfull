import { describe, it, expect } from '@jest/globals';
import { filterEvents } from '@/app/owner-dashboard/_components/events/eventFilterLogic';
import type { FilterableEvent } from '@/app/owner-dashboard/_components/events/eventFilterLogic';

const researchedEvent: FilterableEvent = {
  id: '1',
  name: 'Food Festival',
  description: 'A great festival',
  start_date: '2026-05-15',
  event_source: 'external',
  vetting_score: 15,
  relevance_score: 7,
};

const unresearchedEvent: FilterableEvent = {
  id: '2',
  name: 'Unknown Event',
  description: 'No research done',
  start_date: '2026-05-16',
  event_source: 'external',
  vetting_score: null,
  relevance_score: null,
};

const zeroScoreEvent: FilterableEvent = {
  id: '3',
  name: 'Zero Score Event',
  description: 'Scored but zero',
  start_date: '2026-05-17',
  event_source: 'external',
  vetting_score: 0,
};

const allFilters = {
  startDate: '',
  endDate: '',
  minVettingScore: 0,
  minRelevanceScore: 0,
  sourceFilter: 'all' as const,
  showUnvetted: true,
  researchedOnly: false,
  relevantOnly: false,
};

describe('filterEvents', () => {
  it('returns all events when researchedOnly is false', () => {
    const result = filterEvents(
      [researchedEvent, unresearchedEvent, zeroScoreEvent],
      allFilters,
      '',
    );
    expect(result).toHaveLength(3);
  });

  it('returns only researched events when researchedOnly is true', () => {
    const filters = { ...allFilters, researchedOnly: true };
    const result = filterEvents([researchedEvent, unresearchedEvent, zeroScoreEvent], filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('excludes events with vetting_score = 0 from research filter', () => {
    const filters = { ...allFilters, researchedOnly: true };
    const result = filterEvents([researchedEvent, zeroScoreEvent], filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('excludes events with vetting_score = undefined from research filter', () => {
    const noScoreEvent: FilterableEvent = {
      id: '4',
      name: 'No Score Field',
      start_date: '2026-05-18',
      event_source: 'external',
    };
    const filters = { ...allFilters, researchedOnly: true };
    const result = filterEvents([researchedEvent, noScoreEvent], filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns only relevant events when relevantOnly is true', () => {
    const filters = { ...allFilters, relevantOnly: true };
    const result = filterEvents([researchedEvent, unresearchedEvent, zeroScoreEvent], filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('excludes events with relevance_score = null from relevant filter', () => {
    const filters = { ...allFilters, relevantOnly: true };
    const result = filterEvents([researchedEvent, unresearchedEvent], filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by minRelevanceScore', () => {
    const filters = { ...allFilters, minRelevanceScore: 8 };
    const result = filterEvents([researchedEvent, unresearchedEvent], filters, '');
    expect(result).toHaveLength(0);
  });

  it('includes events meeting minRelevanceScore threshold', () => {
    const highRelevanceEvent: FilterableEvent = {
      id: '5',
      name: 'Very Relevant',
      start_date: '2026-05-19',
      event_source: 'external',
      relevance_score: 9,
    };
    const filters = { ...allFilters, minRelevanceScore: 8 };
    const result = filterEvents([researchedEvent, highRelevanceEvent], filters, '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('5');
  });
});
