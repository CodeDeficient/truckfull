const JSON_OBJECT = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/;
const JSON_FENCE = /```json\s*\n?/g;
const JAVASCRIPT_FENCE = /```javascript\s*\n?/g;
const BARE_FENCE = /```\s*\n?/g;
const TRAILING_FENCE = /```\s*\n?$/g;

/**
 * Safe JSON Extraction from AI Responses
 *
 * Prevents catastrophic backtracking DoS attacks when extracting JSON from
 * unstructured text (AI responses, markdown blocks, etc.)
 *
 * Multi-strategy approach:
 * 1. Direct JSON.parse() - Fastest, handles plain JSON
 * 2. Brace finding (indexOf/lastIndexOf) - O(n), no backtracking
 * 3. Safe regex with length limit - Last resort, limited scope
 */

const MAX_EXTRACT_LENGTH = 10_000;

/**
 * Extract JSON from response text (handles markdown blocks, plain JSON, etc.)
 * Uses multiple strategies to avoid DoS vulnerability
 *
 * @param text - Input text containing JSON (possibly with markdown or other text)
 * @returns Extracted JSON string, or null if not found/invalid
 */
export function extractJsonSafely(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const trimmedText = text.trim();

  if (trimmedText.length === 0) {
    return null;
  }

  // Strategy 1: Try direct JSON.parse (fastest, no regex)
  try {
    JSON.parse(trimmedText);
    return trimmedText;
  } catch {}

  // Strategy 2: Find first { and last } - O(n), no backtracking
  // This handles cases like "Some text {json} more text"
  const firstBrace = trimmedText.indexOf('{');
  const lastBrace = trimmedText.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmedText.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {}
  }

  // Strategy 3: Safe regex with length limit (last resort)
  // Pattern explanation:
  // - \{                        - Match opening brace
  // - [^{}]*                    - Match anything except braces (non-greedy)
  // - (?:\{[^{}]*\}[^{}]*)*  - Non-capturing group for nested braces
  // - \}                        - Match closing brace
  // - Limit to MAX_EXTRACT_LENGTH chars to prevent DoS
  const limitedText = trimmedText.slice(0, MAX_EXTRACT_LENGTH);
  const match = limitedText.match(JSON_OBJECT);

  if (match) {
    try {
      JSON.parse(match[0]);
      return match[0];
    } catch {}
  }

  return null;
}

/**
 * Strip markdown code blocks from text
 * Handles ```json, ```javascript, and plain ``` blocks
 *
 * @param text - Input text possibly containing markdown blocks
 * @returns Text with markdown code block markers removed
 */
export function stripMarkdownBlocks(text: string): string {
  return text
    .replaceAll(JSON_FENCE, '')
    .replaceAll(JAVASCRIPT_FENCE, '')
    .replaceAll(BARE_FENCE, '')
    .replaceAll(TRAILING_FENCE, '')
    .trim();
}
