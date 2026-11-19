import { logMessage, logError } from '@/lib/logging';
import type { BatchEntry } from './llmSynthesis';
import type { SearXNGResult, ResearchResponse, ResearchSource } from './types';
import { isSourceRelevant } from './sourceAuthority';

const CONSENSUS_WEIGHT = 0.4;
const LLM_WEIGHT = 0.6;
const MAX_SOURCES = 5;
const TOTAL_ENGINES = 3;

const HIDDEN_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'tiktok.com',
  'pinterest.com',
  'spotify.com',
  'apple.com/music',
  'youtube.com',
  'reddit.com',
  'yelp.com',
];

function shouldShowSource(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return !HIDDEN_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export function filterSources(
  sources: ResearchSource[],
  city?: string,
  state?: string,
): ResearchSource[] {
  let filtered = sources.filter((s) => shouldShowSource(s.url));

  if (city || state) {
    filtered = filtered.filter((s) => isSourceRelevant(
      { url: s.url, title: s.title, snippet: s.snippet },
      city ?? '',
      state ?? '',
    ));
  }

  return filtered;
}

export function calculateConsensusScore(results: SearXNGResult[]): number {
  const topResults = results.slice(0, MAX_SOURCES);
  if (topResults.length === 0) return 0;

  const total = topResults.reduce((sum, r) => sum + r.engines.length / TOTAL_ENGINES, 0);
  return total / topResults.length;
}

export function toResearchSources(results: SearXNGResult[]): ResearchSource[] {
  return results.slice(0, MAX_SOURCES).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    engines: r.engines,
  }));
}

export async function searchWithTavily(
  query: string,
  fetchFn: typeof fetch = fetch,
): Promise<SearXNGResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return [];

  try {
    logMessage('ResearchService: Searching Tavily');
    const response = await fetchFn('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: 'basic',
        max_results: 5,
      }),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    return (data.results ?? []).map((item) => ({
      title: item.title ?? 'Untitled',
      url: item.url ?? '',
      snippet: item.content ?? '',
      engines: ['tavily'],
    }));
  } catch (error) {
    logError('ResearchService: Tavily fallback failed', error);
    return [];
  }
}

export function mapTavilyRawResults(
  rawResults: Array<{ title?: string; url?: string; content?: string }>,
): SearXNGResult[] {
  return rawResults.map((item) => ({
    title: item.title ?? 'Untitled',
    url: item.url ?? '',
    snippet: item.content ?? '',
    engines: ['tavily'],
  }));
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

export function resetCircuitBreakers(): void {
  circuitBreakers.clear();
}

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 5 * 60 * 1000;

function isCircuitOpen(provider: string): boolean {
  const cb = circuitBreakers.get(provider);
  if (!cb || cb.state === 'closed') return false;
  if (cb.state === 'open') {
    if (Date.now() - cb.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
      cb.state = 'half-open';
      return false;
    }
    return true;
  }
  return false;
}

function recordFailure(provider: string): void {
  const cb = circuitBreakers.get(provider) ?? { failures: 0, lastFailure: 0, state: 'closed' };
  cb.failures++;
  cb.lastFailure = Date.now();
  if (cb.state === 'half-open' || cb.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    cb.state = 'open';
    logMessage(`ResearchService: Circuit breaker opened for ${provider}`);
  }
  circuitBreakers.set(provider, cb);
}

function recordSuccess(provider: string): void {
  const cb = circuitBreakers.get(provider);
  if (cb) {
    cb.failures = 0;
    cb.state = 'closed';
  }
}

async function tryProvider(
  name: string,
  fn: () => Promise<SearXNGResult[]>,
): Promise<SearXNGResult[] | null> {
  if (isCircuitOpen(name)) {
    logMessage(`ResearchService: Skipping ${name} (circuit open)`);
    return null;
  }

  try {
    const results = await fn();
    recordSuccess(name);
    if (results.length > 0) {
      return results;
    }
    return null;
  } catch (error) {
    logError(`ResearchService: ${name} failed`, error);
    recordFailure(name);
    return null;
  }
}

export interface ResearchDependencies {
  search: (query: string) => Promise<SearXNGResult[]>;
  analyzeResults: (
    query: string,
    results: SearXNGResult[],
  ) => Promise<{ confidence: number; reasoning: string }>;
  tavilySearch?: (query: string) => Promise<SearXNGResult[]>;
  exaSearch?: (query: string) => Promise<SearXNGResult[]>;
  braveSearch?: (query: string) => Promise<SearXNGResult[]>;
  fetchFn?: typeof fetch;
}

const DEFAULT_SEARCH_CONCURRENCY = 3;
const DEFAULT_LLM_CHUNK_SIZE = 20;

export interface BatchResearchDependencies {
  search: (query: string) => Promise<SearXNGResult[]>;
  analyzeBatchResults: (
    entries: BatchEntry[],
  ) => Promise<Record<string, { confidence: number; reasoning: string }>>;
  tavilySearch?: (query: string) => Promise<SearXNGResult[]>;
  exaSearch?: (query: string) => Promise<SearXNGResult[]>;
  braveSearch?: (query: string) => Promise<SearXNGResult[]>;
  fetchFn?: typeof fetch;
  searchConcurrency?: number;
  llmChunkSize?: number;
}

async function promiseWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;

  let index = 0;
  let running = 0;
  let failed = false;
  await new Promise<void>((resolve, reject) => {
    function next(): void {
      if (failed) return;
      if (index >= items.length && running === 0) {
        resolve();
        return;
      }
      while (!failed && running < concurrency && index < items.length) {
        const i = index++;
        running++;
        fn(items[i])
          .catch((error) => {
            failed = true;
            reject(error);
          })
          .finally(() => {
            running--;
            next();
          });
      }
    }
    next();
  });
}

async function searchWithProviderChain(
  query: string,
  deps?: {
    search?: (query: string) => Promise<SearXNGResult[]>;
    tavilySearch?: (query: string) => Promise<SearXNGResult[]>;
    exaSearch?: (query: string) => Promise<SearXNGResult[]>;
    braveSearch?: (query: string) => Promise<SearXNGResult[]>;
    fetchFn?: typeof fetch;
  },
): Promise<SearXNGResult[]> {
  const providers: Array<{ name: string; fn: (q: string) => Promise<SearXNGResult[]> }> = [];

  if (deps?.search) {
    providers.push({ name: 'searxng', fn: deps.search });
  } else if (process.env.SEARXNG_URL) {
    const { search: searxngSearch } = await import('./searxng');
    const fetchFn = deps?.fetchFn;
    providers.push({ name: 'searxng', fn: (q) => searxngSearch(q, fetchFn) });
  }

  if (deps?.exaSearch) {
    providers.push({ name: 'exa', fn: deps.exaSearch });
  } else if (process.env.EXA_API_KEY && !process.env.RESEARCH_DISABLE_EXA) {
    const { search: exaSearch } = await import('./exa');
    const fetchFn = deps?.fetchFn;
    providers.push({ name: 'exa', fn: (q) => exaSearch(q, fetchFn) });
  }

  if (deps?.braveSearch) {
    providers.push({ name: 'brave', fn: deps.braveSearch });
  } else if (process.env.BRAVE_API_KEY) {
    const { search: braveSearch } = await import('./brave');
    const fetchFn = deps?.fetchFn;
    providers.push({ name: 'brave', fn: (q) => braveSearch(q, fetchFn) });
  }

  if (deps?.tavilySearch) {
    providers.push({ name: 'tavily', fn: deps.tavilySearch });
  } else if (process.env.TAVILY_API_KEY) {
    providers.push({ name: 'tavily', fn: (q: string) => searchWithTavily(q, deps?.fetchFn) });
  }

  for (const provider of providers) {
    const results = await tryProvider(provider.name, () => provider.fn(query));
    if (results && results.length > 0) {
      return results;
    }
  }

  return [];
}

export async function searchEvent(
  query: string,
  deps?: ResearchDependencies,
): Promise<ResearchResponse | null> {
  if (!query?.trim()) {
    return null;
  }

  try {
    const llmSynthesis = deps?.analyzeResults ? null : await import('./llmSynthesis');
    const analyzeFn = deps?.analyzeResults ?? llmSynthesis!.analyzeResults;

    const results = await searchWithProviderChain(query, deps);

    if (results.length === 0) {
      return null;
    }

    const consensusScore = calculateConsensusScore(results);
    const llmResult = await analyzeFn(query, results);

    const confidence = Math.min(
      consensusScore * CONSENSUS_WEIGHT + llmResult.confidence * LLM_WEIGHT,
      1,
    );

    return {
      answer: llmResult.reasoning,
      sources: filterSources(toResearchSources(results)),
      confidence,
    };
  } catch (error) {
    logError('ResearchService: search failed', error);
    return null;
  }
}

export async function searchEventsBatch(
  queries: readonly { id: string; query: string }[],
  deps?: BatchResearchDependencies,
): Promise<Record<string, ResearchResponse | null>> {
  const valid = queries.filter((q) => q.query?.trim());
  if (valid.length === 0) {
    return {};
  }

  const results: Record<string, ResearchResponse | null> = {};
  for (const q of valid) {
    results[q.id] = null;
  }

  try {
    const llmSynthesis = deps?.analyzeBatchResults ? null : await import('./llmSynthesis');
    const batchAnalyzeFn =
      deps?.analyzeBatchResults ?? llmSynthesis!.analyzeBatchResults;

    const searchConcurrency = Math.max(1, Math.floor(deps?.searchConcurrency ?? DEFAULT_SEARCH_CONCURRENCY));
    const llmChunkSize = Math.max(1, Math.floor(deps?.llmChunkSize ?? DEFAULT_LLM_CHUNK_SIZE));

    const searchResponses: Array<{ id: string; query: string; searchResults: SearXNGResult[] }> =
      [];

    await promiseWithConcurrency(valid, searchConcurrency, async (q) => {
      const searchResults = await searchWithProviderChain(q.query, deps);
      searchResponses.push({ id: q.id, query: q.query, searchResults });
    });

    const entriesWithResults: BatchEntry[] = [];
    const resultsMap = new Map<string, SearXNGResult[]>();

    for (const resp of searchResponses) {
      if (resp.searchResults.length === 0) {
        results[resp.id] = null;
      } else {
        entriesWithResults.push({
          id: resp.id,
          query: resp.query,
          results: resp.searchResults,
        });
        resultsMap.set(resp.id, resp.searchResults);
      }
    }

    if (entriesWithResults.length === 0) {
      return results;
    }

    const allBatchLlmResults: Record<string, { confidence: number; reasoning: string }> = {};
    for (let c = 0; c < entriesWithResults.length; c += llmChunkSize) {
      const chunk = entriesWithResults.slice(c, c + llmChunkSize);
      const chunkResults = await batchAnalyzeFn(chunk);
      Object.assign(allBatchLlmResults, chunkResults);
    }

    for (const entry of entriesWithResults) {
      const searchResults = resultsMap.get(entry.id)!;
      const consensusScore = calculateConsensusScore(searchResults);
      const llmResult = allBatchLlmResults[entry.id] ?? {
        confidence: 0,
        reasoning: '',
      };

      const confidence = Math.min(
        consensusScore * CONSENSUS_WEIGHT + llmResult.confidence * LLM_WEIGHT,
        1,
      );

      results[entry.id] = {
        answer: llmResult.reasoning,
        sources: filterSources(toResearchSources(searchResults)),
        confidence,
      };
    }

    return results;
  } catch (error) {
    logError('ResearchService: batch search failed', error);
    for (const q of valid) {
      results[q.id] = null;
    }
    return results;
  }
}
