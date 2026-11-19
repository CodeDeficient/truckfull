import { logError, logMessage } from '@/lib/logging';
import { callLLM, DEFAULT_LLM_CONFIG } from '@/lib/utils/callLLM';
import type { SearXNGResult } from './types';

const LEADING_JSON_FENCE = /^```json?\n?/g;
const TRAILING_CODE_FENCE = /```$/g;

export interface BatchEntry {
  id: string;
  query: string;
  results: SearXNGResult[];
}

export function buildPrompt(query: string, results: SearXNGResult[]): string {
  const resultSummaries = results
    .map((r, i) => `[${i + 1}] ${r.title} (${r.engines.join(', ')}): ${r.snippet}`)
    .join('\n');

  return (
    `Given these search results about "${query}", rate your confidence that this is a real, ` +
    `significant event relevant to food truck operators. Return a JSON object with ` +
    `'confidence' (0-1) and 'reasoning' (1-2 sentences).\n\n` +
    `Search Results:\n${resultSummaries}`
  );
}

export function buildBatchPrompt(entries: BatchEntry[]): string {
  const eventSections = entries.map((entry) => {
    const resultSummaries = entry.results
      .map((r, i) => `  [${i + 1}] ${r.title} (${r.engines.join(', ')}): ${r.snippet}`)
      .join('\n');
    return `Event "${entry.id}": ${entry.query}\nSearch Results:\n${resultSummaries}`;
  }).join('\n\n');

  const idList = entries.map((e) => `"${e.id}"`).join(', ');

  return (
    `For each event below, rate your confidence that it is a real, significant event ` +
    `relevant to food truck operators. Return a JSON object keyed by event id, ` +
    `each value having 'confidence' (0-1) and 'reasoning' (1-2 sentences). ` +
    `Ids: ${idList}\n\n${eventSections}`
  );
}

export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function parseLlmResponse(content: string): { confidence: number; reasoning: string } {
  try {
    const cleaned = content
      .trim()
      .replaceAll(LEADING_JSON_FENCE, '')
      .replaceAll(TRAILING_CODE_FENCE, '')
      .trim();

    const parsed = JSON.parse(cleaned) as { confidence?: number; reasoning?: string };
    return {
      confidence: clampConfidence(parsed.confidence ?? 0),
      reasoning: parsed.reasoning ?? '',
    };
  } catch {
    return { confidence: 0, reasoning: '' };
  }
}

export function parseBatchResponse(
  content: string,
  ids: string[],
): Record<string, { confidence: number; reasoning: string }> {
  const fallback: Record<string, { confidence: number; reasoning: string }> = {};
  for (const id of ids) {
    fallback[id] = { confidence: 0, reasoning: '' };
  }

  try {
    const cleaned = content
      .trim()
      .replaceAll(LEADING_JSON_FENCE, '')
      .replaceAll(TRAILING_CODE_FENCE, '')
      .trim();

    const parsed = JSON.parse(cleaned) as Record<string, { confidence?: number; reasoning?: string }>;

    for (const id of ids) {
      const entry = parsed[id];
      fallback[id] = {
        confidence: clampConfidence(entry?.confidence ?? 0),
        reasoning: entry?.reasoning ?? '',
      };
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export async function analyzeResults(
  query: string,
  results: SearXNGResult[],
): Promise<{ confidence: number; reasoning: string }> {
  if (results.length === 0) {
    return { confidence: 0, reasoning: '' };
  }

  const prompt = buildPrompt(query, results);
  const response = await callLLM(
    [{ role: 'user', content: prompt }],
    DEFAULT_LLM_CONFIG,
  );

  if (response.success && response.data) {
    const parsed = parseLlmResponse(response.data);
    if (parsed.confidence > 0 || parsed.reasoning) {
      logMessage(`Research synthesis succeeded: confidence=${parsed.confidence}`);
      return parsed;
    }
  }

  logError('Research synthesis: all models returned no usable result');
  return { confidence: 0, reasoning: '' };
}

export async function analyzeBatchResults(
  entries: BatchEntry[],
): Promise<Record<string, { confidence: number; reasoning: string }>> {
  if (entries.length === 0) {
    return {};
  }

  const prompt = buildBatchPrompt(entries);
  const response = await callLLM(
    [{ role: 'user', content: prompt }],
    DEFAULT_LLM_CONFIG,
  );

  if (response.success && response.data) {
    const ids = entries.map((e) => e.id);
    const parsed = parseBatchResponse(response.data, ids);
    const hasAnyResult = ids.some((id) => parsed[id].confidence > 0 || parsed[id].reasoning);
    if (hasAnyResult) {
      logMessage(`Batch synthesis succeeded: ${entries.length} events analyzed`);
      return parsed;
    }
  }

  logError('Batch research synthesis: all models returned no usable result');
  const fallback: Record<string, { confidence: number; reasoning: string }> = {};
  for (const entry of entries) {
    fallback[entry.id] = { confidence: 0, reasoning: '' };
  }
  return fallback;
}
