const VENUE_SUFFIX = String.raw`Mall|Center|Park|Arena|Stadium|Plaza|Square|Fairground|Market|Hall|Theatre|Theater|Club|Field`;
const NAME_PATTERN = String.raw`[A-Z][A-Za-z][A-Za-z\s&']*`;
const PREFIX = String.raw`(?:join us at|at:|located at|venue:?|where:?)[^\n]*?`;

const PATTERNS = [
  new RegExp(`${PREFIX}(${NAME_PATTERN}(?:${VENUE_SUFFIX}))\\b`, 'i'),
  new RegExp(`(${NAME_PATTERN}(?:${VENUE_SUFFIX}))\\b`, 'i'),
];

export function extractVenue(text: string): string | null {
  for (const p of PATTERNS) {
    const m = text.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}
