import { AddressParser } from '@sroussey/parse-address';

const WHITESPACE_RUNS = /\s+/g;
const PADDED_COMMAS = /\s*,\s*/g;
const TRAILING_PERIOD = /\.$/;
const LEADING_DIGIT = /^\d/;
const LEADING_DIGITS = /^\d+/;
const LEADING_THE = /^The\s/i;
const LEADING_NUMBER = /^(\d+)/;
const GOOGLE_MAPS_PLACE_URL = /^https?:\/\/(?:www\.)?google\.\S+\/place\/\S+$/i;
const PERIOD_BREAKS = /\.(\s+|$)/g;

const parser = new AddressParser('us');

const URL_PATTERN = /https?:\/\/[^\s]+/g;
const CORNER_OF_AND_PATTERN = /corner\s+of\s+([^.]+?)\s+and\s+([^.]+?)(?=\.|,|$)/i;
const CORNER_OF_AMPERSAND_PATTERN = /corner\s+of\s+([^,&]+?)\s*&\s*([^,&]+)/i;
const AMPERSAND_PATTERN =
  /([A-Za-z][A-Za-z\s.]*?)\s*&\s*([A-Za-z][A-Za-z\s.]+?)(?:,\s*([^,]+,\s*[A-Z]{2}))?$/i;
const SLASH_PATTERN = /(\w+)\s*\/\s*(\w+)(?:\s*\/\s*\w+)?/i;
const CITY_STATE_SUFFIX_WITH_COMMA =
  /,\s*([A-Za-z]+(?:\s+[A-Za-z]+)?),\s*([A-Z]{2})(?:,\s*\1,\s*\2)+/g;
const CITY_STATE_SUFFIX_NO_COMMA =
  /([A-Za-z](?:[^,]*[A-Za-z])?)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?),\s*([A-Z]{2})(?:,\s*\2,\s*\3)+/g;
const CITY_STATE_END_PATTERN = /^(.+)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?),\s*([A-Z]{2})\s*$/;
const CITY_STATE_SUFFIX_PATTERN = /([^,]+,\s*[A-Z]{2})\s*$/;
const GOOGLE_MAPS_PLACE_PATTERN = /https?:\/\/(?:www\.)?google\.\S+?\/place\/([^/]+)/;
const PO_BOX_PATTERN = /^P\.?O\.?\s+Box\s+\d+/i;

const STREET_ABBREVIATIONS: ReadonlyMap<string, string> = new Map([
  ['Aly', 'Alley'],
  ['Ave', 'Avenue'],
  ['Blvd', 'Boulevard'],
  ['Byp', 'Bypass'],
  ['Cir', 'Circle'],
  ['Ct', 'Court'],
  ['Dr', 'Drive'],
  ['Expy', 'Expressway'],
  ['Ext', 'Extension'],
  ['Fwy', 'Freeway'],
  ['Hwy', 'Highway'],
  ['Ln', 'Lane'],
  ['Mnr', 'Manor'],
  ['Mt', 'Mount'],
  ['Pky', 'Parkway'],
  ['Pkwy', 'Parkway'],
  ['Pl', 'Place'],
  ['Rd', 'Road'],
  ['Rte', 'Route'],
  ['Sq', 'Square'],
  ['St', 'Street'],
  ['Ter', 'Terrace'],
  ['Trl', 'Trail'],
  ['Tpk', 'Turnpike'],
  ['Vlg', 'Village'],
  ['Way', 'Way'],
]);

const STREET_ABBREVIATION_PATTERN = new RegExp(
  `\\b(${[...STREET_ABBREVIATIONS.keys()].join('|')})\\b`,
  'gi',
);

const STREET_TYPE_PATTERN = new RegExp(
  `\\b(${[...STREET_ABBREVIATIONS.values()].join('|')})\\b`,
  'i',
);

export function expandStreetAbbreviations(text: string): string {
  return text.replaceAll(STREET_ABBREVIATION_PATTERN, (match) => {
    const expansion = STREET_ABBREVIATIONS.get(match);
    return expansion ?? match;
  });
}

function cleanExtraSpaces(text: string): string {
  return text
    .replaceAll(WHITESPACE_RUNS, ' ')
    .replaceAll(PADDED_COMMAS, ', ')
    .trim();
}

function stripTrailingPeriod(text: string): string {
  return text.replace(TRAILING_PERIOD, '');
}

export function extractIntersection(address: string): string | null {
  const cornerAndMatch = address.match(CORNER_OF_AND_PATTERN);
  if (cornerAndMatch) {
    const street1 = stripTrailingPeriod(cornerAndMatch[1]?.trim() ?? '');
    const street2 = stripTrailingPeriod(cornerAndMatch[2]?.trim() ?? '');
    const suffixMatch = address.match(CITY_STATE_SUFFIX_PATTERN);
    const suffix = suffixMatch ? `, ${cleanExtraSpaces(suffixMatch[1])}` : '';
    if (street1 && street2) {
      return cleanExtraSpaces(`${street1} and ${street2}${suffix}`);
    }
  }

  const cornerAmpMatch = address.match(CORNER_OF_AMPERSAND_PATTERN);
  if (cornerAmpMatch) {
    const street1 = stripTrailingPeriod(cornerAmpMatch[1]?.trim() ?? '');
    const street2 = stripTrailingPeriod(cornerAmpMatch[2]?.trim() ?? '');
    const suffixMatch = address.match(CITY_STATE_SUFFIX_PATTERN);
    const suffix = suffixMatch ? `, ${cleanExtraSpaces(suffixMatch[1])}` : '';
    if (street1 && street2) {
      return cleanExtraSpaces(`${street1} & ${street2}${suffix}`);
    }
  }

  const ampersandMatch = address.match(AMPERSAND_PATTERN);
  if (ampersandMatch && !address.includes('http')) {
    const street1 = stripTrailingPeriod(ampersandMatch[1].trim());
    const street2 = stripTrailingPeriod(ampersandMatch[2].trim());
    const suffix = ampersandMatch[3] ? `, ${cleanExtraSpaces(ampersandMatch[3])}` : '';
    return cleanExtraSpaces(`${street1} & ${street2}${suffix}`);
  }

  const slashMatch = address.match(SLASH_PATTERN);
  if (slashMatch) {
    const street1 = slashMatch[1]?.trim() ?? '';
    const street2 = slashMatch[2]?.trim() ?? '';
    const suffixMatch = address.match(CITY_STATE_SUFFIX_PATTERN);
    const suffix = suffixMatch ? `, ${cleanExtraSpaces(suffixMatch[1])}` : '';
    return cleanExtraSpaces(`${street1} St and ${street2} St${suffix}`);
  }

  return null;
}

export function extractGoogleMapsPlace(address: string): string | null {
  if (!address) return null;
  const match = address.match(GOOGLE_MAPS_PLACE_PATTERN);
  if (!match) return null;
  return cleanExtraSpaces(decodeURIComponent(match[1].replaceAll('+', ' ')));
}

const VENUE_PREFIX_PATTERN = /^[A-Za-z][A-Za-z\s.'&#,-]*?\s+(?:[-#]\s+)?(\d{1,6}(?:-\w+)?\s+)/;

export function stripVenuePrefix(address: string): string {
  if (!address || typeof address !== 'string') return '';

  if (PO_BOX_PATTERN.test(address.trim())) return '';

  if (LEADING_DIGIT.test(address.trim())) return address.trim();

  const match = address.trim().match(VENUE_PREFIX_PATTERN);
  if (match && match[1]) {
    const result = address.trim().slice(match[0].length - match[1].length);
    return cleanExtraSpaces(result);
  }

  return address.trim();
}

export function stripBusinessName(address: string): string {
  if (!address || typeof address !== 'string') return '';

  if (PO_BOX_PATTERN.test(address.trim())) return '';

  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    if (LEADING_DIGITS.test(parts[i]) && STREET_TYPE_PATTERN.test(parts[i])) {
      return cleanExtraSpaces(parts.slice(i).join(', '));
    }
  }

  return address;
}

const HOUSE_NUMBER_PATTERN = /^\d+(-\w+)?\s+/;

export function stripHouseNumber(address: string): string | null {
  if (!address || typeof address !== 'string') return null;
  const match = address.match(HOUSE_NUMBER_PATTERN);
  if (!match) return null;
  const stripped = address.slice(match[0].length);
  return stripped.length < address.length ? cleanExtraSpaces(stripped) : null;
}

const VENUE_KEYWORDS =
  /\b(?:Park|Plaza|Square|Stadium|Arena|Center|Garden|Gardens|Amphitheater|Pavilion|Commons|Green|Landing|Market|Pier|Club|Resort|Ranch|Farm|Orchard|Vineyard|Winery|Brewery|Distillery)\b/i;

export function extractVenueOrParkName(address: string): string | null {
  if (!address || typeof address !== 'string') return null;
  const firstComma = address.indexOf(',');
  if (firstComma === -1) return null;
  const firstPart = address.slice(0, firstComma).trim();
  if (LEADING_DIGIT.test(firstPart)) return null;
  if (VENUE_KEYWORDS.test(firstPart)) return firstPart;
  if (LEADING_THE.test(firstPart) && firstPart.length > 4) return firstPart;
  return null;
}

function collapseDuplicateParts(cleaned: string): string {
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return cleaned;

  let changed = false;
  const result: string[] = [parts[0]];

  for (let i = 1; i < parts.length; i++) {
    const prev = parts[i - 1];
    const curr = parts[i];
    const prevNum = prev.match(LEADING_NUMBER);
    const currNum = curr.match(LEADING_NUMBER);

    const isDup =
      prev.toLowerCase() === curr.toLowerCase() ||
      (prevNum && currNum && prevNum[1] === currNum[1]);

    if (isDup) {
      changed = true;
    } else {
      result.push(curr);
    }
  }

  return changed ? result.join(', ') : cleaned;
}

export function buildPhotonQueries(address: string): string[] {
  const queries: string[] = [];
  const expanded = expandStreetAbbreviations(address);
  const cleaned = cleanAddress(expanded);
  if (cleaned) queries.push(cleaned);

  const stripped = stripHouseNumber(cleaned || expanded);
  if (stripped && stripped !== cleaned && !queries.includes(stripped)) {
    queries.push(stripped);
  }

  const venue = extractVenueOrParkName(expanded);
  if (venue) {
    const suffixMatch = expanded.match(CITY_STATE_SUFFIX_PATTERN);
    const suffix = suffixMatch ? ` ${cleanExtraSpaces(suffixMatch[1])}` : '';
    const venueQuery = cleanExtraSpaces(`${venue}${suffix}`);
    if (venueQuery && !queries.includes(venueQuery)) {
      queries.push(venueQuery);
    }
  }

  return queries;
}

export function cleanAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    return '';
  }

  let cleaned = address.trim();

  const isPureGoogleMapsUrl = GOOGLE_MAPS_PLACE_URL.test(cleaned);
  const mapsPlace = isPureGoogleMapsUrl ? extractGoogleMapsPlace(cleaned) : null;
  const wasExtractedFromMaps = mapsPlace !== null;
  if (mapsPlace) {
    cleaned = mapsPlace;
  }

  cleaned = cleaned.replaceAll(URL_PATTERN, '');

  cleaned = cleaned.replaceAll(CITY_STATE_SUFFIX_WITH_COMMA, ', $1, $2');

  cleaned = cleaned.replaceAll(CITY_STATE_SUFFIX_NO_COMMA, '$1, $2, $3');

  cleaned = cleanExtraSpaces(cleaned);

  if (PO_BOX_PATTERN.test(cleaned)) return '';

  if (!wasExtractedFromMaps) {
    cleaned = stripBusinessName(cleaned);
    cleaned = stripVenuePrefix(cleaned);
  }

  const match = cleaned.match(CITY_STATE_END_PATTERN);
  if (match) {
    const [, beforeCity, city, state] = match;
    if (!beforeCity.includes(',')) {
      cleaned = `${beforeCity}, ${city}, ${state}`;
    }
  }

  cleaned = expandStreetAbbreviations(cleaned);

  cleaned = collapseDuplicateParts(cleaned);

  const intersection = extractIntersection(cleaned);
  if (intersection) {
    return intersection;
  }

  return cleanExtraSpaces(cleaned.replaceAll(PERIOD_BREAKS, '$1'));
}

export function parseCleanedAddress(address: string): ReturnType<typeof parser.parseLocation> {
  const cleaned = cleanAddress(address);
  return parser.parseLocation(cleaned);
}

export interface ParsedAddress {
  number: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export type NominatimQuery =
  | { type: 'structured'; street: string; city: string; state: string }
  | { type: 'freeform'; q: string };

function expandStreetType(type: string | null): string {
  if (!type) return '';
  const normalized = type.replace(TRAILING_PERIOD, '');
  const expanded = STREET_ABBREVIATIONS.get(normalized);
  return expanded ?? type;
}

function rebuildStreet(parsed: ReturnType<typeof parser.parseLocation>): string {
  const parts: string[] = [];
  if (parsed.street) parts.push(parsed.street);
  const expanded = expandStreetType(parsed.type);
  if (expanded && !parts.some((p) => p.toLowerCase() === expanded.toLowerCase())) {
    parts.push(expanded);
  }
  return parts.join(' ').trim();
}

export function parseAddressComponents(cleanedAddress: string): ParsedAddress {
  const emptyResult: ParsedAddress = { number: '', street: '', city: '', state: '', zip: '' };
  if (!cleanedAddress) return emptyResult;
  const parsed = parser.parseLocation(cleanedAddress);
  if (!parsed) return emptyResult;
  const street = rebuildStreet(parsed);
  return {
    number: parsed.number ?? '',
    street: street || parsed.street || '',
    city: parsed.city ?? '',
    state: parsed.state ?? '',
    zip: parsed.postal_code ?? '',
  };
}

function containsCityState(text: string, city?: string | null, state?: string | null): boolean {
  if (!city && !state) return false;
  const lower = text.toLowerCase();
  const c = city?.toLowerCase();
  const s = state?.toLowerCase();
  return (!!c && lower.includes(c)) || (!!s && (lower.endsWith(s) || lower.endsWith(`, ${s}`)));
}

export function buildNominatimQueries(
  rawAddress: string,
  city?: string | null,
  state?: string | null,
): NominatimQuery[] {
  const queries: NominatimQuery[] = [];
  const seen = new Set<string>();

  const addQuery = (q: string) => {
    const key = q.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      queries.push({ type: 'freeform', q });
    }
  };

  const cleaned = cleanAddress(rawAddress);
  if (!cleaned) return queries;

  const effectiveCity = city || '';
  const effectiveState = state || '';
  const hasLocation = !!(effectiveCity || effectiveState);
  const alreadyHasLocation = containsCityState(cleaned, effectiveCity, effectiveState);

  if (hasLocation && !alreadyHasLocation) {
    addQuery([cleaned, effectiveCity, effectiveState].filter(Boolean).join(', '));
  }

  addQuery(cleaned);

  const parsed = parseAddressComponents(cleaned);
  if (parsed.number && parsed.street) {
    const streetAndLocation = [parsed.street, effectiveCity, effectiveState].filter(Boolean).join(', ');
    if (!alreadyHasLocation || !containsCityState(parsed.street, effectiveCity, effectiveState)) {
      addQuery(streetAndLocation);
    }
  }

  const venue = extractVenueOrParkName(rawAddress);
  if (venue) {
    const venueQuery = hasLocation && !containsCityState(venue, effectiveCity, effectiveState)
      ? [venue, effectiveCity, effectiveState].filter(Boolean).join(', ')
      : venue;
    addQuery(venueQuery);
  }

  return queries;
}
