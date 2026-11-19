import { logError } from '@/lib/logging';
import type { SearXNGResult } from './types';

const DEFAULT_SEARXNG_URL = 'http://localhost:8888';
const SEARCH_TIMEOUT_MS = 15_000;

export function mapRawResults(
  rawResults: Array<Record<string, unknown>>,
): SearXNGResult[] {
  return rawResults.map((item) => ({
    title: (item.title as string) ?? 'Untitled',
    url: (item.url as string) ?? '',
    snippet: (item.content as string) ?? '',
    engines: (item.engines as string[]) ?? [],
  }));
}

function getSearXNGUrl(): string {
  return process.env.SEARXNG_URL ?? DEFAULT_SEARXNG_URL;
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.SEARXNG_PROXY_TOKEN;
  if (!token) {
    return {};
  }
  return { 'x-truckfull-searxng-key': token };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function search(
  query: string,
  fetchFn: typeof fetch = fetch,
): Promise<SearXNGResult[]> {
  if (!query?.trim()) {
    return [];
  }

  try {
    const baseUrl = getSearXNGUrl();
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${baseUrl}/search?q=${encodedQuery}&format=json`;

    const response = await fetchWithTimeout(
      url,
      { headers: getAuthHeaders() },
      SEARCH_TIMEOUT_MS,
      fetchFn,
    );

    if (!response.ok) {
      logError(`SearXNG: HTTP error ${response.status}`);
      return [];
    }

    const data = (await response.json()) as { results?: Array<Record<string, unknown>> };
    const rawResults = data.results ?? [];

    return mapRawResults(rawResults);
  } catch (error) {
    logError('SearXNG: search failed', error);
    return [];
  }
}
