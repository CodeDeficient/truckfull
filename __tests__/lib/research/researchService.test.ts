import { describe, it, expect, jest } from '@jest/globals';
import {
  calculateConsensusScore,
  toResearchSources,
  mapTavilyRawResults,
  searchEvent,
  searchEventsBatch,
  resetCircuitBreakers,
} from '@/lib/research/researchService';
import type { SearXNGResult } from '@/lib/research/types';

const searxResults: SearXNGResult[] = [
  {
    title: 'Atlanta Food Festival',
    url: 'https://example.com/festival',
    snippet: 'Annual event with 200+ trucks',
    engines: ['google', 'bing', 'duckduckgo'],
  },
  {
    title: 'Food Truck Rally 2025',
    url: 'https://example.com/rally',
    snippet: 'Popular gathering in downtown',
    engines: ['google', 'bing'],
  },
  {
    title: 'Community Food Event',
    url: 'https://example.com/community',
    snippet: 'Local food truck event',
    engines: ['google'],
  },
];

describe('calculateConsensusScore', () => {
  it('returns 0 for empty results', () => {
    expect(calculateConsensusScore([])).toBe(0);
  });

  it('calculates score based on engine count / total engines', () => {
    const consensus = (3 / 3 + 2 / 3 + 1 / 3) / 3;
    expect(calculateConsensusScore(searxResults)).toBeCloseTo(consensus, 10);
  });

  it('handles single result with one engine', () => {
    const singleResult: SearXNGResult[] = [
      { title: 'Solo', url: 'https://example.com', snippet: 'Only', engines: ['google'] },
    ];
    expect(calculateConsensusScore(singleResult)).toBeCloseTo(1 / 3, 10);
  });

  it('handles result with many engines (can exceed 1)', () => {
    const manyEngines: SearXNGResult[] = [
      {
        title: 'Popular',
        url: 'https://example.com',
        snippet: 'Found everywhere',
        engines: ['google', 'bing', 'duckduckgo', 'brave', 'qwant'],
      },
    ];
    expect(calculateConsensusScore(manyEngines)).toBeCloseTo(5 / 3, 10);
  });

  it('only considers top 5 results', () => {
    const manyResults: SearXNGResult[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Result ${i}`,
      url: `https://example.com/${i}`,
      snippet: `Snippet ${i}`,
      engines: ['google'] as string[],
    }));

    const scoreWith10 = calculateConsensusScore(manyResults);
    const scoreWith5 = calculateConsensusScore(manyResults.slice(0, 5));
    expect(scoreWith10).toBeCloseTo(scoreWith5, 10);
  });
});

describe('toResearchSources', () => {
  it('converts results to research sources', () => {
    const sources = toResearchSources(searxResults);

    expect(sources).toHaveLength(3);
    expect(sources[0].title).toBe('Atlanta Food Festival');
    expect(sources[0].url).toBe('https://example.com/festival');
    expect(sources[0].snippet).toBe('Annual event with 200+ trucks');
    expect(sources[0].engines).toEqual(['google', 'bing', 'duckduckgo']);
  });

  it('limits to 5 sources', () => {
    const manyResults: SearXNGResult[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Result ${i}`,
      url: `https://example.com/${i}`,
      snippet: `Snippet ${i}`,
      engines: ['google'] as string[],
    }));

    expect(toResearchSources(manyResults)).toHaveLength(5);
  });

  it('returns empty array for empty input', () => {
    expect(toResearchSources([])).toEqual([]);
  });
});

describe('mapTavilyRawResults', () => {
  it('maps Tavily response format to SearXNGResult', () => {
    const raw = [
      { title: 'Tavily Result', url: 'https://tavily.example.com', content: 'From Tavily' },
    ];
    const results = mapTavilyRawResults(raw);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Tavily Result');
    expect(results[0].url).toBe('https://tavily.example.com');
    expect(results[0].snippet).toBe('From Tavily');
    expect(results[0].engines).toEqual(['tavily']);
  });

  it('applies defaults for missing fields', () => {
    const raw = [{}, { title: 'Only Title' }, { url: 'https://example.com' }];
    const results = mapTavilyRawResults(raw);

    expect(results[0].title).toBe('Untitled');
    expect(results[0].url).toBe('');
    expect(results[0].snippet).toBe('');
    expect(results[1].url).toBe('');
    expect(results[1].snippet).toBe('');
    expect(results[2].title).toBe('Untitled');
    expect(results[2].snippet).toBe('');
  });

  it('returns empty array for empty input', () => {
    expect(mapTavilyRawResults([])).toEqual([]);
  });
});

describe('searchEvent', () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  it('returns combined confidence when both search and analysis succeed', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const analyzeFn = jest.fn().mockResolvedValue({
      confidence: 0.8,
      reasoning: 'Well-documented event',
    });

    const result = await searchEvent('Atlanta Food Festival', {
      search: searchFn,
      analyzeResults: analyzeFn,
    });

    expect(result).not.toBeNull();
    expect(result!.sources).toHaveLength(3);

    const consensus = (3 / 3 + 2 / 3 + 1 / 3) / 3;
    const expected = consensus * 0.4 + 0.8 * 0.6;
    expect(result!.confidence).toBeCloseTo(expected, 3);
  });

  it('uses consensus only when LLM returns zero confidence', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const analyzeFn = jest.fn().mockResolvedValue({ confidence: 0, reasoning: '' });

    const result = await searchEvent('Atlanta Food Festival', {
      search: searchFn,
      analyzeResults: analyzeFn,
    });

    expect(result).not.toBeNull();
    const consensus = (3 / 3 + 2 / 3 + 1 / 3) / 3;
    expect(result!.confidence).toBeCloseTo(consensus * 0.4, 3);
  });

  it('falls back to tavilySearch when search returns empty', async () => {
    const searchFn = jest.fn().mockResolvedValue([]);
    const tavilySearchFn = jest.fn().mockResolvedValue([
      {
        title: 'Tavily Result',
        url: 'https://tavily.example.com',
        snippet: 'From Tavily',
        engines: ['tavily'],
      },
    ]);
    const analyzeFn = jest.fn().mockResolvedValue({
      confidence: 0.5,
      reasoning: 'from tavily',
    });

    const result = await searchEvent('Test Event', {
      search: searchFn,
      analyzeResults: analyzeFn,
      tavilySearch: tavilySearchFn,
    });

    expect(result).not.toBeNull();
    expect(result!.sources).toHaveLength(1);
    expect(tavilySearchFn).toHaveBeenCalledWith('Test Event');
  });

  it('returns null when everything fails', async () => {
    const searchFn = jest.fn().mockResolvedValue([]);
    const tavilySearchFn = jest.fn().mockResolvedValue([]);

    const result = await searchEvent('Test Event', {
      search: searchFn,
      analyzeResults: jest.fn(),
      tavilySearch: tavilySearchFn,
    });

    expect(result).toBeNull();
  });

  it('returns null on exception', async () => {
    const searchFn = jest.fn().mockRejectedValue(new Error('SearXNG down'));

    const result = await searchEvent('Test Event', {
      search: searchFn,
      analyzeResults: jest.fn(),
    });

    expect(result).toBeNull();
  });

  it('returns top 5 results as sources', async () => {
    const manyResults: SearXNGResult[] = Array.from({ length: 10 }, (_, i) => ({
      title: `Result ${i}`,
      url: `https://example.com/${i}`,
      snippet: `Snippet ${i}`,
      engines: ['google'] as string[],
    }));

    const searchFn = jest.fn().mockResolvedValue(manyResults);
    const analyzeFn = jest.fn().mockResolvedValue({ confidence: 0.7, reasoning: 'test' });

    const result = await searchEvent('Big Event', {
      search: searchFn,
      analyzeResults: analyzeFn,
    });

    expect(result!.sources).toHaveLength(5);
  });

  it('includes answer from LLM reasoning', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const analyzeFn = jest.fn().mockResolvedValue({
      confidence: 0.9,
      reasoning: 'Major annual event with 50,000 attendees',
    });

    const result = await searchEvent('Atlanta Food Festival', {
      search: searchFn,
      analyzeResults: analyzeFn,
    });

    expect(result!.answer).toBe('Major annual event with 50,000 attendees');
  });

  it('handles empty query gracefully', async () => {
    const result = await searchEvent('', {
      search: jest.fn(),
      analyzeResults: jest.fn(),
    });

    expect(result).toBeNull();
  });

  it('handles whitespace-only query gracefully', async () => {
    const result = await searchEvent('   ', {
      search: jest.fn(),
      analyzeResults: jest.fn(),
    });

    expect(result).toBeNull();
  });

  it('calculates confidence correctly with single result', async () => {
    const searchFn = jest.fn().mockResolvedValue([
      {
        title: 'Solo Event',
        url: 'https://example.com/solo',
        snippet: 'Only result',
        engines: ['google'],
      },
    ]);
    const analyzeFn = jest.fn().mockResolvedValue({ confidence: 0.5, reasoning: 'test' });

    const result = await searchEvent('Solo Event', {
      search: searchFn,
      analyzeResults: analyzeFn,
    });

    const consensus = 1 / 3;
    const expected = consensus * 0.4 + 0.5 * 0.6;
    expect(result!.confidence).toBeCloseTo(expected, 3);
  });

  it('caps combined confidence at 1', async () => {
    const searchFn = jest.fn().mockResolvedValue([
      {
        title: 'Popular Event',
        url: 'https://example.com',
        snippet: 'Found everywhere',
        engines: ['google', 'bing', 'duckduckgo', 'brave', 'qwant'],
      },
    ]);
    const analyzeFn = jest.fn().mockResolvedValue({ confidence: 0.6, reasoning: 'test' });

    const result = await searchEvent('Popular Event', {
      search: searchFn,
      analyzeResults: analyzeFn,
    });

    const consensus = 5 / 3;
    const expected = Math.min(consensus * 0.4 + 0.6 * 0.6, 1);
    expect(result!.confidence).toBeCloseTo(expected, 3);
  });
});

describe('searchEventsBatch', () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  it('returns map of id to ResearchResponse for multiple events', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.8, reasoning: 'Well-documented' },
      evt2: { confidence: 0.6, reasoning: 'Some evidence' },
    });

    const results = await searchEventsBatch(
      [
        { id: 'evt1', query: 'Atlanta Food Festival' },
        { id: 'evt2', query: 'Food Truck Rally' },
      ],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn },
    );

    expect(results).toHaveProperty('evt1');
    expect(results).toHaveProperty('evt2');
    expect(results.evt1).not.toBeNull();
    expect(results.evt2).not.toBeNull();
    expect(results.evt1!.confidence).toBeGreaterThan(0);
    expect(results.evt2!.confidence).toBeGreaterThan(0);
  });

  it('calls batch analyze once with all events that have search results', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.8, reasoning: 'Good' },
      evt2: { confidence: 0.7, reasoning: 'Decent' },
    });

    await searchEventsBatch(
      [
        { id: 'evt1', query: 'Atlanta Food Festival' },
        { id: 'evt2', query: 'Food Truck Rally' },
      ],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn },
    );

    expect(batchAnalyzeFn).toHaveBeenCalledTimes(1);
    const batchEntries = batchAnalyzeFn.mock.calls[0][0];
    expect(batchEntries).toHaveLength(2);
    expect(batchEntries[0].id).toBe('evt1');
    expect(batchEntries[1].id).toBe('evt2');
  });

  it('returns null for events with no search results', async () => {
    const searchFn = jest
      .fn()
      .mockResolvedValueOnce(searxResults)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.8, reasoning: 'Good' },
    });

    const results = await searchEventsBatch(
      [
        { id: 'evt1', query: 'Atlanta Food Festival' },
        { id: 'evt2', query: 'Nonexistent Event' },
      ],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn, tavilySearch: jest.fn().mockResolvedValue([]) },
    );

    expect(results.evt1).not.toBeNull();
    expect(results.evt2).toBeNull();
    expect(batchAnalyzeFn).toHaveBeenCalledTimes(1);
    expect(batchAnalyzeFn.mock.calls[0][0]).toHaveLength(1);
  });

  it('falls back to tavily per query when searxng returns empty', async () => {
    const searxFn = jest.fn().mockResolvedValue([]);
    const tavilyFn = jest.fn().mockResolvedValue([
      {
        title: 'Tavily Event',
        url: 'https://tavily.example.com',
        snippet: 'From Tavily',
        engines: ['tavily'],
      },
    ]);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.5, reasoning: 'Tavily result' },
    });

    const results = await searchEventsBatch(
      [{ id: 'evt1', query: 'Test Event' }],
      { search: searxFn, analyzeBatchResults: batchAnalyzeFn, tavilySearch: tavilyFn },
    );

    expect(results.evt1).not.toBeNull();
    expect(tavilyFn).toHaveBeenCalledWith('Test Event');
  });

  it('returns empty object for empty input array', async () => {
    const results = await searchEventsBatch([], {
      search: jest.fn(),
      analyzeBatchResults: jest.fn(),
    });

    expect(results).toEqual({});
  });

  it('skips entries with empty/whitespace queries', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.8, reasoning: 'Good' },
    });

    const results = await searchEventsBatch(
      [
        { id: 'evt1', query: 'Atlanta Food Festival' },
        { id: 'evt2', query: '' },
        { id: 'evt3', query: '   ' },
      ],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn },
    );

    expect(results).not.toHaveProperty('evt2');
    expect(results).not.toHaveProperty('evt3');
    expect(results.evt1).not.toBeNull();
  });

  it('calculates combined confidence from consensus + batch LLM per event', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.8, reasoning: 'Strong' },
      evt2: { confidence: 0.4, reasoning: 'Weak' },
    });

    const results = await searchEventsBatch(
      [
        { id: 'evt1', query: 'Festival' },
        { id: 'evt2', query: 'Rally' },
      ],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn },
    );

    const consensus = (3 / 3 + 2 / 3 + 1 / 3) / 3;
    const expected1 = Math.min(consensus * 0.4 + 0.8 * 0.6, 1);
    const expected2 = Math.min(consensus * 0.4 + 0.4 * 0.6, 1);

    expect(results.evt1!.confidence).toBeCloseTo(expected1, 3);
    expect(results.evt2!.confidence).toBeCloseTo(expected2, 3);
  });

  it('includes answer from batch LLM reasoning per event', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.9, reasoning: 'Annual event with 50K attendees' },
    });

    const results = await searchEventsBatch(
      [{ id: 'evt1', query: 'Atlanta Food Festival' }],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn },
    );

    expect(results.evt1!.answer).toBe('Annual event with 50K attendees');
  });

  it('returns null for all events on exception', async () => {
    const searchFn = jest.fn().mockRejectedValue(new Error('Search down'));

    const results = await searchEventsBatch(
      [
        { id: 'evt1', query: 'Festival' },
        { id: 'evt2', query: 'Rally' },
      ],
      { search: searchFn, analyzeBatchResults: jest.fn() },
    );

    expect(results.evt1).toBeNull();
    expect(results.evt2).toBeNull();
  });

  it('handles partial batch LLM results (some IDs missing)', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.8, reasoning: 'Found' },
    });

    const results = await searchEventsBatch(
      [
        { id: 'evt1', query: 'Festival' },
        { id: 'evt2', query: 'Rally' },
      ],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn },
    );

    expect(results.evt1).not.toBeNull();
    expect(results.evt1!.confidence).toBeGreaterThan(0);
    expect(results.evt2).not.toBeNull();
    expect(results.evt2!.answer).toBe('');
    expect(results.evt2!.confidence).toBeLessThanOrEqual(
      (3 / 3 + 2 / 3 + 1 / 3) / 3 * 0.4 + 0.001,
    );
  });

  it('handles mixed searxng/tavily results across events', async () => {
    const searchFn = jest
      .fn()
      .mockResolvedValueOnce(searxResults)
      .mockResolvedValueOnce([]);
    const tavilyFn = jest.fn().mockResolvedValue([
      {
        title: 'Tavily Rally',
        url: 'https://tavily.example.com',
        snippet: 'From Tavily',
        engines: ['tavily'],
      },
    ]);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.8, reasoning: 'Good searxng' },
      evt2: { confidence: 0.5, reasoning: 'Tavily result' },
    });

    const results = await searchEventsBatch(
      [
        { id: 'evt1', query: 'Festival' },
        { id: 'evt2', query: 'Rally' },
      ],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn, tavilySearch: tavilyFn },
    );

    expect(results.evt1).not.toBeNull();
    expect(results.evt2).not.toBeNull();
    expect(tavilyFn).toHaveBeenCalledWith('Rally');
    expect(batchAnalyzeFn).toHaveBeenCalledTimes(1);
    expect(batchAnalyzeFn.mock.calls[0][0]).toHaveLength(2);
  });

  it('chunks LLM calls when batch exceeds chunk size', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({});

    const queries = Array.from({ length: 25 }, (_, i) => ({
      id: `evt${i}`,
      query: `Event ${i}`,
    }));

    await searchEventsBatch(queries, {
      search: searchFn,
      analyzeBatchResults: batchAnalyzeFn,
      llmChunkSize: 10,
    });

    expect(batchAnalyzeFn).toHaveBeenCalledTimes(3);
    expect(batchAnalyzeFn.mock.calls[0][0]).toHaveLength(10);
    expect(batchAnalyzeFn.mock.calls[1][0]).toHaveLength(10);
    expect(batchAnalyzeFn.mock.calls[2][0]).toHaveLength(5);
  });

  it('limits concurrent searches to searchConcurrency', async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;
    const searchFn = jest.fn().mockImplementation(async () => {
      currentConcurrent++;
      if (currentConcurrent > maxConcurrent) maxConcurrent = currentConcurrent;
      await new Promise((r) => setTimeout(r, 10));
      currentConcurrent--;
      return searxResults;
    });
    const batchAnalyzeFn = jest.fn().mockResolvedValue({});

    const queries = Array.from({ length: 10 }, (_, i) => ({
      id: `evt${i}`,
      query: `Event ${i}`,
    }));

    await searchEventsBatch(queries, {
      search: searchFn,
      analyzeBatchResults: batchAnalyzeFn,
      searchConcurrency: 3,
    });

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  it('handles individual search failures without crashing the batch', async () => {
    const searchFn = jest
      .fn()
      .mockResolvedValueOnce(searxResults)
      .mockRejectedValueOnce(new Error('Search failed for evt2'))
      .mockResolvedValueOnce(searxResults);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.8, reasoning: 'Good' },
      evt3: { confidence: 0.7, reasoning: 'Decent' },
    });

    const results = await searchEventsBatch(
      [
        { id: 'evt1', query: 'Festival' },
        { id: 'evt2', query: 'Broken' },
        { id: 'evt3', query: 'Rally' },
      ],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn },
    );

    expect(results.evt1).not.toBeNull();
    expect(results.evt2).toBeNull();
    expect(results.evt3).not.toBeNull();
    expect(batchAnalyzeFn).toHaveBeenCalled();
  });

  it('clamps concurrency to 1 when searchConcurrency is 0', async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;
    const searchFn = jest.fn().mockImplementation(async () => {
      currentConcurrent++;
      if (currentConcurrent > maxConcurrent) maxConcurrent = currentConcurrent;
      await new Promise((r) => setTimeout(r, 5));
      currentConcurrent--;
      return searxResults;
    });
    const batchAnalyzeFn = jest.fn().mockResolvedValue({});

    const queries = Array.from({ length: 3 }, (_, i) => ({
      id: `evt${i}`,
      query: `Event ${i}`,
    }));

    await searchEventsBatch(queries, {
      search: searchFn,
      analyzeBatchResults: batchAnalyzeFn,
      searchConcurrency: 0,
    });

    expect(maxConcurrent).toBeLessThanOrEqual(1);
  });

  it('handles llmChunkSize larger than batch (single chunk)', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.8, reasoning: 'Good' },
    });

    const results = await searchEventsBatch(
      [{ id: 'evt1', query: 'Festival' }],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn, llmChunkSize: 100 },
    );

    expect(results.evt1).not.toBeNull();
    expect(batchAnalyzeFn).toHaveBeenCalledTimes(1);
    expect(batchAnalyzeFn.mock.calls[0][0]).toHaveLength(1);
  });

  it('clamps llmChunkSize to 1 when passed 0', async () => {
    const searchFn = jest.fn().mockResolvedValue(searxResults);
    const batchAnalyzeFn = jest.fn().mockResolvedValue({
      evt1: { confidence: 0.8, reasoning: 'Good' },
      evt2: { confidence: 0.6, reasoning: 'OK' },
    });

    const results = await searchEventsBatch(
      [
        { id: 'evt1', query: 'Festival' },
        { id: 'evt2', query: 'Rally' },
      ],
      { search: searchFn, analyzeBatchResults: batchAnalyzeFn, llmChunkSize: 0 },
    );

    expect(results.evt1).not.toBeNull();
    expect(results.evt2).not.toBeNull();
    expect(batchAnalyzeFn).toHaveBeenCalledTimes(2);
  });
});
