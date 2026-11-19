const LEADING_HOUSE_NUMBER = /^\d+\s/;
const ZIP_CODE = /^\d{5}(?:-\d{4})?$/;
const WHITESPACE = /\s+/;
const DIGIT = /\d/;
const LEADING_THE = /^the\s+/i;

export type LocationCompleteness = 'full' | 'partial' | 'missing';

const STREET_TYPE_WORDS = new Set([
  'st', 'street', 'ave', 'avenue', 'rd', 'road', 'dr', 'drive',
  'ln', 'lane', 'blvd', 'boulevard', 'ct', 'court', 'pl', 'place',
  'cir', 'circle', 'pkwy', 'parkway', 'hwy', 'highway', 'trl', 'trail',
]);

export function hasStreetAddress(address: string | null): boolean {
  if (!address) return false;
  const trimmed = address.trim().replaceAll('.', '');
  const hasNumber = LEADING_HOUSE_NUMBER.test(trimmed);
  if (!hasNumber) return false;
  if (ZIP_CODE.test(trimmed)) return false;
  if (trimmed.toLowerCase().includes('po box') || trimmed.toLowerCase().includes('p.o. box')) return false;
  const lowerWords = trimmed.toLowerCase().split(WHITESPACE);
  return lowerWords.some((w) => STREET_TYPE_WORDS.has(w));
}

const BARE_PREFIXES = new Set([
  'day', 'night', 'weekend', 'summer', 'winter', 'spring', 'fall', 'holiday',
  'community', 'recreation', 'senior', 'youth', 'civic', 'town', 'city', 'county',
  'public', 'main', 'central',
]);

const BARE_SUFFIXES = new Set([
  'market', 'fair', 'fest', 'festival',
  'center', 'hall', 'park', 'plaza', 'fairgrounds', 'fairground',
  'square',
]);

const BARE_SINGLE_WORD_SET = new Set([
  'commons', 'promenade', 'boardwalk', 'esplanade',
]);

export function isBarePlaceholder(address: string | null): boolean {
  if (!address) return false;
  let trimmed = address.trim();
  if (DIGIT.test(trimmed)) return false;
  trimmed = trimmed.replace(LEADING_THE, '');
  const words = trimmed.split(WHITESPACE);
  if (words.length > 2) return false;

  if (words.length === 2) {
    return BARE_PREFIXES.has(words[0]!.toLowerCase()) && BARE_SUFFIXES.has(words[1]!.toLowerCase());
  }

  if (words.length === 1) {
    return BARE_SINGLE_WORD_SET.has(words[0]!.toLowerCase());
  }

  return false;
}

export function classifyLocationCompleteness(
  address: string | null,
  city: string | null,
  state: string | null,
): LocationCompleteness {
  const hasAddr = address && address.trim().length > 0;
  const hasCity = city && city.trim().length > 0;
  const hasState = state && state.trim().length > 0;

  if (!hasAddr && !hasCity && !hasState) return 'missing';

  if (hasAddr && hasStreetAddress(address)) return 'full';

  if (hasCity || hasState || hasAddr) return 'partial';

  return 'missing';
}
