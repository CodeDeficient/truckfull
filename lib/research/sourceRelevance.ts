import type { ParsedEventData } from './parseEventText';
import type { ResearchSource } from './types';
import { getDomainTrustBonus, isObituaryOrMemorial } from './sourceAuthority';

const PUNCTUATION = /[^\w\s]/g;
const WHITESPACE = /\s+/;

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'we', 'our', 'you', 'your', 'they',
  'their', 'them', 'he', 'she', 'him', 'her', 'his', 'about', 'also',
  'just', 'more', 'most', 'some', 'all', 'any', 'each', 'every', 'no',
  'not', 'only', 'other', 'such', 'very', 'what', 'when', 'where',
  'how', 'which', 'who', 'whom', 'there', 'here', 'into', 'over',
  'after', 'before', 'up', 'down', 'out', 'if', 'than', 'then',
  'us', 'call', 'get', 'join', 'new', 'year', 'years', 'day', 'days',
  'time', 'event', 'events', 'coming', 'find', 'check', 'look',
]);

const GENERIC_LOCATION_WORDS = new Set([
  'nc', 'sc', 'ga', 'tn', 'va', 'al', 'fl', 'carolina', 'georgia',
  'tennessee', 'virginia', 'alabama', 'florida', 'south', 'north',
]);

const EVENT_DOMAINS = [
  'eventbrite.com',
  'ticketmaster.com',
  'meetup.com',
  'facebook.com/events',
];

const GENERAL_DOMAINS = [
  '6amcity.com',
  'patch.com',
  'tripadvisor.com',
  'yelp.com',
  'wikipedia.org',
  'google.com',
  'bing.com',
  'yellowpages.com',
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replaceAll(PUNCTUATION, ' ')
    .split(WHITESPACE)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function nameTokens(parsed: ParsedEventData | null): string[] {
  if (!parsed || !parsed.name) return [];
  const noise = new Set(GENERIC_LOCATION_WORDS);
  if (parsed.location.city) {
    for (const t of tokenize(parsed.location.city)) noise.add(t);
  }
  if (parsed.location.state) {
    for (const t of tokenize(parsed.location.state)) noise.add(t);
    noise.add(parsed.location.state.toLowerCase());
  }
  return tokenize(parsed.name).filter((t) => !noise.has(t));
}

function venueTokens(parsed: ParsedEventData | null): string[] {
  if (!parsed) return [];
  const parts = [parsed.location.address, parsed.name].filter(Boolean);
  return tokenize(parts.join(' ')).filter((t) => !GENERIC_LOCATION_WORDS.has(t));
}

function keywordOverlap(queryTokens: string[], textTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const textSet = new Set(textTokens);
  const matches = queryTokens.filter((t) => textSet.has(t));
  return matches.length / queryTokens.length;
}

function scoreDomain(url: string): number {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    for (const ed of EVENT_DOMAINS) {
      if (hostname === ed || hostname.endsWith(`.${ed}`)) return 1;
    }

    if (hostname.includes('facebook.com') && path.includes('/events')) return 0.9;

    const trustBonus = getDomainTrustBonus(url);
    if (trustBonus >= 0.8) return trustBonus;

    for (const gd of GENERAL_DOMAINS) {
      if (hostname === gd || hostname.endsWith(`.${gd}`)) return 0.2;
    }

    if (trustBonus > 0) return trustBonus;

    return 0.4;
  } catch {
    return 0;
  }
}

export function scoreSource(
  source: ResearchSource,
  parsed: ParsedEventData | null,
): number {
  if (isObituaryOrMemorial(source.title) || isObituaryOrMemorial(source.snippet)) return 0;

  const name = nameTokens(parsed);
  const venue = venueTokens(parsed);

  if (name.length === 0 && venue.length === 0) return 0;

  const snippetTokens = tokenize(source.snippet);
  const titleTokens = tokenize(source.title);

  const nameInSnippet = keywordOverlap(name, snippetTokens);
  const nameInTitle = keywordOverlap(name, titleTokens);
  const venueInSnippet = keywordOverlap(venue, snippetTokens);
  const venueInTitle = keywordOverlap(venue, titleTokens);

  const nameScore = nameInSnippet * 0.45 + nameInTitle * 0.25;
  const venueScore = venueInSnippet * 0.15 + venueInTitle * 0.1;
  const domainScore = scoreDomain(source.url) * 0.05;

  const hasDirectMatch = nameInSnippet > 0 || nameInTitle > 0;
  if (!hasDirectMatch) return 0;

  const rawScore = nameScore + venueScore + domainScore;

  return Math.min(1, rawScore);
}

export function rankSources(
  sources: ResearchSource[],
  parsed: ParsedEventData | null,
): ResearchSource[] {
  return sources
    .map((s) => ({ source: s, score: scoreSource(s, parsed) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.source);
}

export function calculateSearchConfidence(
  sources: ResearchSource[],
  parsed: ParsedEventData | null,
): number {
  if (sources.length === 0) return 0;

  const scores = sources.map((s) => scoreSource(s, parsed));
  const relevantCount = scores.filter((s) => s >= 0.2).length;

  if (relevantCount === 0) return 0;
  if (relevantCount === 1) return 0.2;
  if (relevantCount === 2) return 0.4;

  return Math.min(0.7, relevantCount * 0.15);
}