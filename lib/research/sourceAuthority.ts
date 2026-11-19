const WWW_PREFIX = /^www\./;
const COUNTY_TERM = /county/;

export type DomainAuthority = 'high' | 'medium' | 'low';

const HIGH_AUTHORITY_TLDS = new Set(['.gov', '.mil', '.edu']);

const MEDIUM_AUTHORITY_HOSTS = [
  'eventbrite.com',
  'ticketmaster.com',
  'meetup.com',
];

const CITY_COUNTY_PATTERNS = [
  'cityof',
  'townof',
  'countyof',
  'city-',
  'town-',
  'county-',
];

const CHAMBER_PATTERNS = [
  'chamber',
  'chamberofcommerce',
];

function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function classifyDomainAuthority(url: string): DomainAuthority {
  const hostname = extractHostname(url);
  if (!hostname) return 'low';

  for (const tld of HIGH_AUTHORITY_TLDS) {
    if (hostname.endsWith(tld)) return 'high';
  }

  for (const host of MEDIUM_AUTHORITY_HOSTS) {
    if (hostname === host || hostname.endsWith(`.${host}`)) return 'medium';
  }

  if (
    (hostname === 'facebook.com' || hostname.endsWith('.facebook.com'))
    && url.includes('/events')
  ) {
    return 'medium';
  }

  const bareHost = hostname.replace(WWW_PREFIX, '');
  const isCityOrCounty = CITY_COUNTY_PATTERNS.some((p) => bareHost.startsWith(p))
    || bareHost.split('.').includes('county');
  if (isCityOrCounty) return 'medium';

  const isChamber = CHAMBER_PATTERNS.some((p) => bareHost.includes(p));
  if (isChamber) return 'medium';

  const isEventDomain = bareHost.endsWith('.org') || bareHost.includes('festival')
    || bareHost.includes('events');
  if (isEventDomain) return 'medium';

  return 'low';
}

export function getDomainTrustBonus(url: string): number {
  const authority = classifyDomainAuthority(url);

  if (authority === 'high') {
    const hostname = extractHostname(url);
    if (hostname) {
      if (hostname.endsWith('.gov') || hostname.endsWith('.mil')) return 1;
      if (hostname.endsWith('.edu')) return 0.8;
    }
    return 1;
  }

  if (authority === 'medium') {
    const hostname = extractHostname(url);
    if (hostname) {
      const bareHost = hostname.replace(WWW_PREFIX, '');
      const isCityOrCounty = CITY_COUNTY_PATTERNS.some((p) => bareHost.startsWith(p))
        || COUNTY_TERM.test(bareHost);
      if (isCityOrCounty) return 0.6;

      const isChamber = CHAMBER_PATTERNS.some((p) => bareHost.includes(p));
      if (isChamber) return 0.6;

      const isPlatform = MEDIUM_AUTHORITY_HOSTS.some(
        (h) => hostname === h || hostname.endsWith(`.${h}`),
      );
      if (isPlatform) return 0.4;
      if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com')) return 0.4;
    }

    return 0.3;
  }

  return 0;
}

const OBITUARY_PATTERNS = [
  /\bobituary\b/i,
  /\bobituaries\b/i,
  /\bin memoriam\b/i,
  /\bpassed away\b/i,
  /\bpassed away peacefully\b/i,
  /\bfuneral home\b/i,
  /\bfuneral service\b/i,
  /\bfuneral arrangements\b/i,
  /\bcelebrate the life of\b/i,
  /\bcelebration of life\b/i,
  /\bsurvived by\b/i,
  /\bmemorial service\b/i,
  /\bgraveside service\b/i,
  /\bin loving memory\b/i,
  /\bborn.*died\b/i,
  /\bcondolences\b/i,
];

export function isObituaryOrMemorial(text: string): boolean {
  if (!text) return false;
  return OBITUARY_PATTERNS.some((pattern) => pattern.test(text));
}

const NON_US_LOCATION_PATTERNS = [
  /\bCanada\b/i,
  /\bAustralia\b/i,
  /\bNew Zealand\b/i,
  /\bIreland\b/i,
];

const UK_CITY_NAMES = [
  /\bLondon\b/i,
  /\bManchester\b/i,
  /\bBirmingham\b/i,
  /\bEdinburgh\b/i,
  /\bGlasgow\b/i,
  /\bCardiff\b/i,
  /\bBelfast\b/i,
  /\bLiverpool\b/i,
  /\bLeeds\b/i,
  /\bSheffield\b/i,
  /\bBristol\b/i,
  /\bUK\s/i,
  /\bUnited Kingdom\b/i,
  /\bEngland\b/i,
  /\bScotland\b/i,
  /\bWales\b/i,
];

const US_STATE_ABBREV_TO_NAME: Record<string, string> = {
  al: 'alabama',
  ak: 'alaska',
  az: 'arizona',
  ar: 'arkansas',
  ca: 'california',
  co: 'colorado',
  ct: 'connecticut',
  de: 'delaware',
  fl: 'florida',
  ga: 'georgia',
  hi: 'hawaii',
  id: 'idaho',
  il: 'illinois',
  in: 'indiana',
  ia: 'iowa',
  ks: 'kansas',
  ky: 'kentucky',
  la: 'louisiana',
  me: 'maine',
  md: 'maryland',
  ma: 'massachusetts',
  mi: 'michigan',
  mn: 'minnesota',
  ms: 'mississippi',
  mo: 'missouri',
  mt: 'montana',
  ne: 'nebraska',
  nv: 'nevada',
  nh: 'new hampshire',
  nj: 'new jersey',
  nm: 'new mexico',
  ny: 'new york',
  nc: 'north carolina',
  nd: 'north dakota',
  oh: 'ohio',
  ok: 'oklahoma',
  or: 'oregon',
  pa: 'pennsylvania',
  ri: 'rhode island',
  sc: 'south carolina',
  sd: 'south dakota',
  tn: 'tennessee',
  tx: 'texas',
  ut: 'utah',
  vt: 'vermont',
  va: 'virginia',
  wa: 'washington',
  wv: 'west virginia',
  wi: 'wisconsin',
  wy: 'wyoming',
};

const US_STATE_NAMES = new Set(Object.values(US_STATE_ABBREV_TO_NAME));

const AMBIGUOUS_STATE_ABBREVS = new Set(['hi', 'id', 'in', 'la', 'ma', 'me', 'oh', 'ok', 'or']);

function hasUsStateSignal(text: string): boolean {
  const lower = text.toLowerCase();

  for (const abbrev of Object.keys(US_STATE_ABBREV_TO_NAME)) {
    if (AMBIGUOUS_STATE_ABBREVS.has(abbrev)) continue;
    if (new RegExp(`\\b${abbrev}\\b`, 'i').test(text)) return true;
  }

  for (const fullName of US_STATE_NAMES) {
    if (lower.includes(fullName)) return true;
  }

  return false;
}

export function isGeographicallyRelevant(
  text: string,
  city: string,
  state: string,
): boolean {
  if (!text || (!city && !state)) return false;

  const lower = text.toLowerCase();
  const usSignal = hasUsStateSignal(text);

  for (const pattern of NON_US_LOCATION_PATTERNS) {
    if (pattern.test(lower) && !usSignal) return false;
  }

  for (const pattern of UK_CITY_NAMES) {
    if (pattern.test(lower) && !usSignal) return false;
  }

  if (city && lower.includes(city.toLowerCase())) return true;

  if (state) {
    const abbrev = state.toLowerCase();
    if (new RegExp(`\\b${abbrev}\\b`, 'i').test(text)) return true;

    const fullName = US_STATE_ABBREV_TO_NAME[abbrev];
    if (fullName && lower.includes(fullName)) return true;
  }

  return false;
}

export function isUkDomain(url: string): boolean {
  const hostname = extractHostname(url);
  if (!hostname) return false;
  return hostname.endsWith('.uk');
}

export interface SourceCheck {
  url: string;
  title: string;
  snippet: string;
}

export function isSourceRelevant(
  source: SourceCheck,
  city: string,
  state: string,
): boolean {
  if (isObituaryOrMemorial(source.title) || isObituaryOrMemorial(source.snippet)) {
    return false;
  }

  if (isUkDomain(source.url)) {
    return false;
  }

  const combinedText = `${source.title} ${source.snippet}`;
  if (!isGeographicallyRelevant(combinedText, city, state)) {
    return false;
  }

  return true;
}
