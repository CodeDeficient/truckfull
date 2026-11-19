const EXTRA_BLANK_LINES = /\n{3,}/g;
const SPACE_RUNS = /[ \t]+/g;

const MAX_DESCRIPTION_LENGTH = 400;

const TRAILING_CTA_PATTERNS = [
  /(?:follow|like|subscribe|share)\s+us\s+on\s+.{1,40}$/im,
  /(?:visit|check\s+out)\s+(?:our\s+)?(?:website|site|page|blog|fb|facebook|instagram|twitter|social\s+media).{0,60}$/im,
  /(?:for\s+more\s+info(?:rmation)?|learn\s+more|find\s+out\s+more).*/im,
  /(?:stay\s+updated|stay\s+tuned|stay\s+up\s+to\s+date).*/im,
  /(?:don'?t\s+miss|be\s+sure\s+to\s+(?:follow|like|check|visit|RSVP|get)).{0,80}$/im,
  /(?:tickets?\s+(?:available|on\s+sale|at|from|going\s+fast)).{0,60}$/im,
  /(?:register\s+(?:now|today|at|online|via|by)|sign\s+up\s+(?:now|today|at|online)).{0,60}$/im,
  /(?:contact\s+(?:us\s+)?(?:at|via|by)|call\s+us|email\s+us).{0,60}$/im,
  /(?:sponsored|presented\s+by|in\s+partnership\s+with|brought\s+to\s+you\s+by).{0,60}$/im,
];

function removeTrailingCTAs(text: string): string {
  let cleaned = text.trimEnd();

  for (const pattern of TRAILING_CTA_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match && match.index != null && match.index > cleaned.length * 0.4) {
      const before = cleaned.slice(0, match.index);
      const sentenceEnd = Math.max(
        before.lastIndexOf('.'),
        before.lastIndexOf('!'),
        before.lastIndexOf('?'),
      );
      const newlineBefore = before.lastIndexOf('\n');

      const cutPoint = Math.max(sentenceEnd + 1, newlineBefore);
      if (cutPoint > 0) {
        cleaned = before.slice(0, cutPoint).trimEnd();
      }
    }
  }

  return cleaned;
}

function collapseWhitespace(text: string): string {
  return text.replaceAll(EXTRA_BLANK_LINES, '\n\n').replaceAll(SPACE_RUNS, ' ').trim();
}

export function cleanEventDescription(description: string | null | undefined): string | null {
  if (!description) return null;

  let cleaned = description.trim();

  cleaned = collapseWhitespace(cleaned);

  cleaned = removeTrailingCTAs(cleaned);

  if (cleaned.length > MAX_DESCRIPTION_LENGTH) {
    const truncated = cleaned.slice(0, MAX_DESCRIPTION_LENGTH);
    const lastSentenceEnd = truncated.lastIndexOf('. ');
    const lastNewline = truncated.lastIndexOf('\n');

    const cutPoint = Math.max(lastSentenceEnd + 1, lastNewline);
    cleaned =
      cutPoint > MAX_DESCRIPTION_LENGTH * 0.6
        ? truncated.slice(0, cutPoint).trimEnd()
        : truncated.trimEnd();
  }

  return cleaned || null;
}
