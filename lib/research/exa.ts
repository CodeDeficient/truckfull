import { logError } from '@/lib/logging';
import type { SearXNGResult } from './types';

const EXA_API_URL = 'https://api.exa.ai/search';
const SEARCH_TIMEOUT_MS = 15_000;

export function mapExaResults(
  rawResults: Array<{ title?: string; url?: string; text?: string }>,
): SearXNGResult[] {
  return rawResults.map((item) => ({
    title: item.title ?? 'Untitled',
    url: item.url ?? '',
    snippet: item.text ?? '',
    engines: ['exa'],
  }));
}

export async function search(
  query: string,
  fetchFn: typeof fetch = fetch,
): Promise<SearXNGResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  if (!query?.trim()) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    const response = await fetchFn(EXA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: query.trim(),
        type: 'keyword',
        num_results: 5,
        contents: {
          text: true,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logError(`Exa: HTTP error ${response.status}`);
      return [];
    }

    const data = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; text?: string }>;
    };

    return mapExaResults(data.results ?? []);
  } catch (error) {
    logError('Exa: search failed', error);
    return [];
  }
}
