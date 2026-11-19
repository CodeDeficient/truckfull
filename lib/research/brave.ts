import { logError } from '@/lib/logging';
import type { SearXNGResult } from './types';

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
const SEARCH_TIMEOUT_MS = 15_000;

export function mapBraveResults(
  rawResults: Array<{ title?: string; url?: string; description?: string }>,
): SearXNGResult[] {
  return rawResults.map((item) => ({
    title: item.title ?? 'Untitled',
    url: item.url ?? '',
    snippet: item.description ?? '',
    engines: ['brave'],
  }));
}

export async function search(
  query: string,
  fetchFn: typeof fetch = fetch,
): Promise<SearXNGResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) return [];

  if (!query?.trim()) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${BRAVE_API_URL}?q=${encodedQuery}&count=5`;

    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logError(`Brave: HTTP error ${response.status}`);
      return [];
    }

    const data = (await response.json()) as {
      web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
    };

    return mapBraveResults(data.web?.results ?? []);
  } catch (error) {
    logError('Brave: search failed', error);
    return [];
  }
}
