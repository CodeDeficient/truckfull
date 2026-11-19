import type { EventClaim } from './claimExtractor';

const WHITESPACE_RUNS = /\s+/g;
const NON_WORD_CHARS = /[^\w]/g;
const WHITESPACE = /\s+/;
const NEWLINE_RUNS = /\n+/g;
const SENTENCE_END = /[.!?]+/;
const EVENT_CONTEXT_TERMS =
  /\b(event|festival|market|fair|vendor|concert|food truck|dates?|scheduled|sign up|spaces)\b/;
const NON_DIGITS = /\D/g;

export interface ClaimVerification {
  status: 'supported' | 'refuted' | 'partial' | 'not_mentioned';
  score: number;
  evidence: string | null;
}

export interface SourceVerificationResult {
  claimsVerified: Record<string, ClaimVerification>;
  criticalSupported: number;
  criticalPartial: number;
  totalScore: number;
  supportingQuotes: string[];
}

function extractQuote(text: string, query: string, windowSize = 40): string | null {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return null;
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(text.length, idx + query.length + windowSize);
  return text.slice(start, end).replaceAll(WHITESPACE_RUNS, ' ').trim();
}

const SS_OR_US = /(?:ss|us)$/i;

export function normalizeToken(raw: string): string {
  let t = raw.toLowerCase().replaceAll(NON_WORD_CHARS, '');
  if (t.length >= 4 && !SS_OR_US.test(t) && t.endsWith('s')) {
    t = t.slice(0, -1);
  }
  return t;
}

function verifyName(claim: EventClaim, text: string): ClaimVerification {
  const canonical = claim.canonicalValue;
  const lowerText = text.toLowerCase();
  const tokens = canonical
    .split(' ')
    .map((w) => normalizeToken(w))
    .filter((t) => t.length > 2);

  if (lowerText.includes(canonical)) {
    const idx = lowerText.indexOf(canonical);
    return {
      status: 'supported',
      score: 1,
      evidence: extractQuote(text, text.slice(idx, idx + canonical.length), 20),
    };
  }

  let matchCount = 0;
  for (const token of tokens) {
    if (lowerText.includes(token)) matchCount++;
  }
  const matchRatio = tokens.length > 0 ? matchCount / tokens.length : 0;

  if (matchRatio >= 0.75 && matchCount >= 2) {
    const quote = tokens.map((p) => extractQuote(text, p, 15)).find(Boolean) ?? null;
    return { status: 'supported', score: matchRatio, evidence: quote };
  }

  if (matchRatio >= 0.75 && matchCount === 1 && tokens.length === 1) {
    const quote = extractQuote(text, tokens[0]!, 15);
    return { status: 'partial', score: matchRatio, evidence: quote };
  }

  if (matchRatio >= 0.3 && matchCount >= 2) {
    const quote = tokens.map((p) => extractQuote(text, p, 15)).find(Boolean) ?? null;
    return { status: 'partial', score: matchRatio, evidence: quote };
  }

  return { status: 'not_mentioned', score: 0, evidence: null };
}

function verifyVenue(claim: EventClaim, text: string): ClaimVerification {
  const canonical = claim.canonicalValue;
  const lowerText = text.toLowerCase();

  if (lowerText.includes(canonical)) {
    return {
      status: 'supported',
      score: 1,
      evidence: extractQuote(text, canonical),
    };
  }

  const tokens = canonical
    .split(' ')
    .map((w) => normalizeToken(w))
    .filter((t) => t.length > 2);
  const textTokens = lowerText.split(WHITESPACE);
  for (let i = 0; i < textTokens.length; i++) {
    let found = 0;
    for (let j = i; j < Math.min(i + 15, textTokens.length); j++) {
      for (const token of tokens) {
        const word = normalizeToken(textTokens[j]!);
        if (word === token) {
          found++;
          break;
        }
      }
      if (found === tokens.length) {
        const quote = text.split(WHITESPACE).slice(Math.max(0, i - 3), j + 4).join(' ');
        return { status: 'supported', score: 1, evidence: quote };
      }
    }
  }

  const matchCount = tokens.filter((t) => lowerText.includes(t)).length;
  const matchRatio = tokens.length > 0 ? matchCount / tokens.length : 0;

  // Accept partial ONLY if venue words are in the same sentence as event context words
  if (matchRatio >= 0.5 && matchCount >= 2) {
    const sentences = lowerText.replaceAll(NEWLINE_RUNS, ' ').split(SENTENCE_END);
    for (const sentence of sentences) {
      const hasVenueToken = tokens.some((t) => sentence.includes(t));
      const hasEventContext = EVENT_CONTEXT_TERMS.test(sentence);
      if (hasVenueToken && hasEventContext) {
        return { status: 'partial', score: matchRatio, evidence: extractQuote(text, tokens[0]!, 15) };
      }
    }
  }

  return { status: 'not_mentioned', score: 0, evidence: null };
}

function verifyDate(claim: EventClaim, text: string): ClaimVerification {
  const lowerText = text.toLowerCase();
  for (const pattern of claim.matchPatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      return { status: 'supported', score: 1, evidence: extractQuote(text, pattern) };
    }
  }
  return { status: 'not_mentioned', score: 0, evidence: null };
}

function verifyPhone(claim: EventClaim, text: string): ClaimVerification {
  const rawMatch = claim.matchPatterns[0];
  if (!rawMatch) return { status: 'not_mentioned', score: 0, evidence: null };

  const normalizedText = text.replaceAll(NON_DIGITS, '');
  if (normalizedText.includes(rawMatch)) {
    const pattern = [...rawMatch].join(String.raw`[^\d]{0,2}`);
    const re = new RegExp(`(${pattern})`);
    const originalMatch = text.match(re);
    return {
      status: 'supported',
      score: 1,
      evidence: originalMatch ? originalMatch[0] : rawMatch,
    };
  }
  return { status: 'not_mentioned', score: 0, evidence: null };
}

function verifyEmail(claim: EventClaim, text: string): ClaimVerification {
  const lowerText = text.toLowerCase();
  if (lowerText.includes(claim.canonicalValue)) {
    return { status: 'supported', score: 1, evidence: claim.canonicalValue };
  }
  return { status: 'not_mentioned', score: 0, evidence: null };
}

function verifyFoodTruck(claim: EventClaim, text: string): ClaimVerification {
  const lowerText = text.toLowerCase();
  const tokens = claim.matchPatterns;
  const words = lowerText.split(WHITESPACE);

  const VENUE_WORDS = ['mall', 'park', 'center', 'market', 'plaza', 'fair', 'event', 'festival', 'arena', 'stadium'];

  const matches: Array<{ start: number; end: number; token: string }> = [];
  for (let i = 0; i < words.length; i++) {
    for (const token of tokens) {
      const tw = token.split(' ');
      if (tw.length === 1) {
        if (words[i]!.includes(tw[0]!)) {
          matches.push({ start: i, end: i, token });
        }
      } else if (tw.length === 2 && i + 1 < words.length && words[i]!.includes(tw[0]!) && words[i + 1]!.includes(tw[1]!)) {
        matches.push({ start: i, end: i + 1, token });
      }
    }
  }

  if (matches.length === 0) return { status: 'not_mentioned', score: 0, evidence: null };

  for (const m of matches) {
    const windowStart = Math.max(0, m.start - 10);
    const windowEnd = Math.min(words.length, m.end + 11);
    for (let j = windowStart; j < windowEnd; j++) {
      if (j >= m.start && j <= m.end) continue;
      if (VENUE_WORDS.some((vw) => words[j]!.includes(vw))) {
        return {
          status: 'supported',
          score: 1,
          evidence: extractQuote(text, words[m.start]!, 20),
        };
      }
    }
  }

  return { status: 'not_mentioned', score: 0, evidence: null };
}

function verifyWebsite(claim: EventClaim, text: string): ClaimVerification {
  const lowerText = text.toLowerCase();
  if (lowerText.includes(claim.canonicalValue.toLowerCase())) {
    return { status: 'supported', score: 1, evidence: claim.canonicalValue };
  }
  return { status: 'not_mentioned', score: 0, evidence: null };
}

export function verifyClaim(claim: EventClaim, text: string): ClaimVerification {
  switch (claim.type) {
    case 'name': {
      return verifyName(claim, text);
    }
    case 'venue': {
      return verifyVenue(claim, text);
    }
    case 'date': {
      return verifyDate(claim, text);
    }
    case 'phone': {
      return verifyPhone(claim, text);
    }
    case 'email': {
      return verifyEmail(claim, text);
    }
    case 'food_truck': {
      return verifyFoodTruck(claim, text);
    }
    case 'website': {
      return verifyWebsite(claim, text);
    }
    default: {
      return { status: 'not_mentioned', score: 0, evidence: null };
    }
  }
}

const COOCCURRENCE_WINDOW = 300;

function checkCoOccurrence(
  verified: Record<string, ClaimVerification>,
  claims: EventClaim[],
  text: string,
): void {
  const venueResult = verified['venue'];
  const dateResult = verified['date'];

  if (!venueResult || !dateResult) return;
  if (venueResult.status === 'not_mentioned' && dateResult.status === 'not_mentioned') return;

  const venueClaim = claims.find((c) => c.type === 'venue');
  const dateClaim = claims.find((c) => c.type === 'date');
  if (!venueClaim || !dateClaim) return;

  const venueTokens = venueClaim.canonicalValue
    .split(' ')
    .map((w) => normalizeToken(w))
    .filter((t) => t.length > 2);
  const datePatterns = dateClaim.matchPatterns.map((p) => p.toLowerCase());

  if (venueTokens.length === 0 || datePatterns.length === 0) return;

  const lowerText = text.toLowerCase();

  const venuePositions: number[] = [];
  for (const token of venueTokens) {
    const idx = lowerText.indexOf(token);
    if (idx !== -1) venuePositions.push(idx);
  }

  const datePositions: number[] = [];
  for (const pattern of datePatterns) {
    const idx = lowerText.indexOf(pattern);
    if (idx !== -1) datePositions.push(idx);
  }

  if (venuePositions.length === 0 || datePositions.length === 0) return;

  let closestDistance = Infinity;
  for (const vp of venuePositions) {
    for (const dp of datePositions) {
      closestDistance = Math.min(closestDistance, Math.abs(vp - dp));
    }
  }

  if (closestDistance > COOCCURRENCE_WINDOW) {
    if (venueResult.status === 'supported') {
      verified['venue'] = { ...venueResult, status: 'partial', score: venueResult.score * 0.6 };
    }
    if (dateResult.status === 'supported') {
      verified['date'] = { ...dateResult, status: 'partial', score: dateResult.score * 0.6 };
    }
  }
}

export function verifyClaims(claims: EventClaim[], text: string): SourceVerificationResult {
  const result: SourceVerificationResult = {
    claimsVerified: {},
    criticalSupported: 0,
    criticalPartial: 0,
    totalScore: 0,
    supportingQuotes: [],
  };

  let totalScore = 0;
  for (const claim of claims) {
    const v = verifyClaim(claim, text);
    result.claimsVerified[claim.type] = v;
    totalScore += v.score;

    if (claim.severity === 'critical') {
      if (v.status === 'supported') result.criticalSupported++;
      if (v.status === 'partial') result.criticalPartial++;
    }

    if (v.evidence && (v.status === 'supported' || v.status === 'partial')) {
      result.supportingQuotes.push(v.evidence);
    }
  }

  checkCoOccurrence(result.claimsVerified, claims, text);

  totalScore = 0;
  result.criticalSupported = 0;
  result.criticalPartial = 0;
  for (const [type, v] of Object.entries(result.claimsVerified)) {
    totalScore += v.score;
    const claim = claims.find((c) => c.type === type);
    if (claim?.severity === 'critical') {
      if (v.status === 'supported') result.criticalSupported++;
      if (v.status === 'partial') result.criticalPartial++;
    }
  }

  result.totalScore = claims.length > 0 ? totalScore / claims.length : 0;
  result.supportingQuotes = [...new Set(result.supportingQuotes)].slice(0, 5);

  return result;
}