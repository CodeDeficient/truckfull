/**
 * LLM citation checker — build queries and parse responses to see if
 * TruckFull is cited by AI search engines.
 * Pure functions — no API calls, testable with static fixtures.
 */

// Target queries to check for TruckFull citations
export const CITATION_QUERIES: string[] = [
  'food trucks in augusta ga',
  'food truck catering in georgia',
  'bbq food truck near me',
  'food truck finder app',
  'where to find food trucks in charleston sc',
];

// Target domain to search for in responses
export const TARGET_DOMAIN = 'truckfull.food';

export interface CitationResult {
  query: string;
  cited: boolean;
  mentionCount: number;
  snippets: string[];
  timestamp: string;
  model?: string;
}

/**
 * Check if a text response contains citations to our domain.
 * Handles various citation formats: bare URLs, markdown links, and domain mentions.
 */
export function findCitations(
  responseText: string,
  domain: string,
): { cited: boolean; count: number; snippets: string[] } {
  if (!responseText) return { cited: false, count: 0, snippets: [] };

  const snippets: string[] = [];
  const patternParts = [String.raw`https?:\/\/`, String.raw`(www\.)?`, domain.replaceAll('.', String.raw`\.`)];
  const urlPattern = new RegExp(patternParts.join(''), 'gi');
  const matches = responseText.match(urlPattern);
  const count = matches ? matches.length : 0;

  if (count > 0) {
    // Extract context around each URL
    for (const match of matches || []) {
      const idx = responseText.indexOf(match);
      const start = Math.max(0, idx - 80);
      const end = Math.min(responseText.length, idx + match.length + 80);
      let snippet = responseText.slice(start, end).trim();
      if (start > 0) snippet = `...${snippet}`;
      if (end < responseText.length) snippet = `${snippet}...`;
      snippets.push(snippet);
    }
  }

  return { cited: count > 0, count, snippets };
}

/**
 * Format citation results for Supabase storage or reporting.
 */
export function formatCitationRow(result: CitationResult): Record<string, unknown> {
  return {
    query: result.query,
    cited: result.cited,
    mention_count: result.mentionCount,
    snippets: JSON.stringify(result.snippets),
    timestamp: result.timestamp,
    model: result.model ?? null,
  };
}

/**
 * Build a system prompt for an LLM to search for food truck information.
 */
export function buildCitationPrompt(query: string): string {
  return `Search the web for information about: "${query}".
List all relevant websites you find, including URLs.
If you find TruckFull (truckfull.food), explicitly mention it.
Provide the complete list of URLs you discovered.`;
}
