import { jsonrepair } from 'jsonrepair';

const LEADING_JSON_FENCE = /^```json?\n?/;
const TRAILING_CODE_FENCE = /```$/;

export function repairJson(jsonText: string): string | null {
  const trimmed = jsonText.trim();
  if (!trimmed || trimmed.length < 2) return null;
  if (trimmed === '{' || trimmed === '[') return null;

  let text = trimmed;

  if (text.startsWith('```')) {
    text = text.replace(LEADING_JSON_FENCE, '').replace(TRAILING_CODE_FENCE, '').trim();
  }

  try {
    JSON.parse(text);
    return text;
  } catch {
    // Continue with repair
  }

  try {
    return jsonrepair(text);
  } catch {
    return null;
  }
}
