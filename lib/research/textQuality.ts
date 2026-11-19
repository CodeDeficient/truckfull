const ANNUAL_PREFIX_LEAD_IN = /\b(?:in|for|over|than|about|place|prize|winner)\s*$/;
const ANNUAL_PREFIX_FOLLOW_UP = /^\s*(?:place|prize|winner)\b/i;
const WHITESPACE = /\s+/;
const URLS = /https?:\/\/[^\s]+/g;
const HTTP_PROTOCOL = /^https?:\/\//;
const DOTS = /\./g;

export interface OcrIssue {
  type: 'garbled_name' | 'truncated_url' | 'low_confidence';
  detail: string;
}

const ANNUAL_PREFIX_REGEX = /\b(\d+)(?:st|nd|rd|th)\s+annual\b/i;
const ANNUAL_REVERSE_REGEX = /\bannual\s+(\d+)(?:st|nd|rd|th)\b/i;

const JULY_4TH_REGEX = /\b(?:4th|fourth)\s+of\s+(?:july|jul)\b/i;

export function detectAnnualPrefix(name: string): number | null {
  if (!name) return null;

  if (JULY_4TH_REGEX.test(name)) return null;

  let match = name.match(ANNUAL_PREFIX_REGEX);
  if (!match) {
    match = name.match(ANNUAL_REVERSE_REGEX);
  }
  if (!match) return null;

  const yearCount = Number(match[1]);
  if (!Number.isFinite(yearCount) || yearCount < 1 || yearCount > 200) return null;

  const beforeMatch = name.slice(0, match.index!);
  const afterMatch = name.slice((match.index ?? 0) + match[0].length);
  const leadingQualifier = beforeMatch.toLowerCase().trim();
  if (ANNUAL_PREFIX_LEAD_IN.test(leadingQualifier)) return null;
  if (ANNUAL_PREFIX_FOLLOW_UP.test(afterMatch)) return null;

  return yearCount;
}

const UNCOMMON_OCR_WORDS = new Set([
  'fealty',
  'expire',
  'expi',
  'ket',
  'surf',
]);

export function isLowConfidenceName(name: string, confidence: number): boolean {
  const trimmed = name.trim();
  if (trimmed.length === 0) return true;
  if (confidence < 0.35) return true;

  const tokens = trimmed.toLowerCase().split(WHITESPACE);
  if (tokens.length <= 2) {
    const hasUncommonWord = tokens.some((t) => UNCOMMON_OCR_WORDS.has(t));
    if (hasUncommonWord) return true;
  }

  return false;
}

interface ParsedSummary {
  name: string;
  date: string | null;
  confidence: number;
}

export function getOcrIssueSummary(
  rawText: string,
  parsed: ParsedSummary,
): OcrIssue[] {
  const issues: OcrIssue[] = [];

  if (!rawText) return issues;

  if (parsed.confidence < 0.35) {
    issues.push({
      type: 'low_confidence',
      detail: 'OCR extraction had low confidence — text may be garbled or incomplete',
    });
  }

  if (parsed.name && isLowConfidenceName(parsed.name, parsed.confidence)) {
    issues.push({
      type: 'garbled_name',
      detail: `Event name "${parsed.name}" may be misread — verify against the flyer image`,
    });
  }

  const urlMatch = rawText.match(URLS);
  if (urlMatch) {
    for (const url of urlMatch) {
      const withoutProtocol = url.replace(HTTP_PROTOCOL, '');
      const hostPart = withoutProtocol.split('/')[0];

      const dotCount = (hostPart.match(DOTS) || []).length;
      if (dotCount === 0) {
        issues.push({
          type: 'truncated_url',
          detail: `URL "${url}" appears truncated — missing domain dots`,
        });
        continue;
      }

      const tld = hostPart.split('.').pop() ?? '';
      if (dotCount === 1 && tld.length <= 2) {
        issues.push({
          type: 'truncated_url',
          detail: `URL "${url}" appears truncated — incomplete hostname`,
        });
      }
    }
  }

  return issues;
}
