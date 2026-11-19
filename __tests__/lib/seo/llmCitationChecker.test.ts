import { describe, it, expect } from '@jest/globals';
import {
  findCitations,
  formatCitationRow,
  buildCitationPrompt,
  CITATION_QUERIES,
  TARGET_DOMAIN,
} from '@/lib/seo/llmCitationChecker';
import type { CitationResult } from '@/lib/seo/llmCitationChecker';

describe('findCitations', () => {
  it('should detect bare URL citations', () => {
    const text = 'Check out https://www.truckfull.food/augusta-ga for food trucks in Augusta.';
    const result = findCitations(text, 'truckfull.food');
    expect(result.cited).toBe(true);
    expect(result.count).toBe(1);
  });

  it('should detect markdown link citations', () => {
    const text = 'I recommend [TruckFull](https://truckfull.food) for finding food trucks.';
    const result = findCitations(text, 'truckfull.food');
    expect(result.cited).toBe(true);
    expect(result.count).toBe(1);
  });

  it('should detect multiple citations', () => {
    const text = 'See https://truckfull.food for Augusta trucks and https://truckfull.food for BBQ trucks.';
    const result = findCitations(text, 'truckfull.food');
    expect(result.cited).toBe(true);
    expect(result.count).toBe(2);
  });

  it('should return not cited when domain is absent', () => {
    const text = 'Check out yelp.com for food truck reviews.';
    const result = findCitations(text, 'truckfull.food');
    expect(result.cited).toBe(false);
    expect(result.count).toBe(0);
  });

  it('should handle empty text', () => {
    const result = findCitations('', 'truckfull.food');
    expect(result.cited).toBe(false);
    expect(result.count).toBe(0);
  });

  it('should handle null/undefined text', () => {
    const result = findCitations(null as unknown as string, 'truckfull.food');
    expect(result.cited).toBe(false);
    expect(result.count).toBe(0);
  });

  it('should extract snippets around citations', () => {
    const text = 'Here is a long sentence about food trucks. Visit https://www.truckfull.food for more details. Another sentence after.';
    const result = findCitations(text, 'truckfull.food');
    expect(result.snippets.length).toBeGreaterThanOrEqual(1);
    expect(result.snippets[0]).toContain('truckfull.food');
  });

  it('should not count substrings of other domains', () => {
    const text = 'Visit https://ourtruckfull.food.scam.com for deals.';
    const result = findCitations(text, 'truckfull.food');
    expect(result.cited).toBe(false);
    expect(result.count).toBe(0);
  });
});

describe('formatCitationRow', () => {
  it('should format a citation result for DB storage', () => {
    const result: CitationResult = {
      query: 'best food trucks',
      cited: true,
      mentionCount: 2,
      snippets: ['snippet1', 'snippet2'],
      timestamp: '2026-05-16T20:00:00.000Z',
      model: 'gpt-4',
    };
    const row = formatCitationRow(result);
    expect(row.query).toBe('best food trucks');
    expect(row.cited).toBe(true);
    expect(row.mention_count).toBe(2);
    expect(row.model).toBe('gpt-4');
  });

  it('should handle model being absent', () => {
    const result: CitationResult = {
      query: 'test',
      cited: false,
      mentionCount: 0,
      snippets: [],
      timestamp: '2026-05-16T20:00:00.000Z',
    };
    const row = formatCitationRow(result);
    expect(row.model).toBeNull();
  });
});

describe('buildCitationPrompt', () => {
  it('should embed the query in the prompt', () => {
    const prompt = buildCitationPrompt('food trucks');
    expect(prompt).toContain('food trucks');
    expect(prompt).toContain('truckfull.food');
  });
});

describe('CITATION_QUERIES', () => {
  it('should have at least 5 queries', () => {
    expect(CITATION_QUERIES.length).toBeGreaterThanOrEqual(5);
  });

  it('should include food truck finder query', () => {
    expect(CITATION_QUERIES.some(q => q.includes('food truck'))).toBe(true);
  });
});
