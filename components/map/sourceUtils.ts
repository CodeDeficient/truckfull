const SOURCE_TYPE_LABELS: Record<string, string> = {
  eproval: 'City Permit',
  civicplus_rss: 'City Calendar',
  simpleview_rss: 'Visitor Bureau',
  eventbrite: 'Eventbrite',
  algolia_api: 'Local Events',
  timely_api: 'Community Calendar',
  tourism_html: 'Tourism Board',
  ical: 'City Calendar',
  aiken_playwright: 'City Calendar',
  arcgis_permits: 'City Permit',
};

const SOURCE_TYPE_URLS: Record<string, string | null> = {
  eproval: 'https://eproval.savannahga.gov',
  civicplus_rss: 'https://www.civicplus.com',
  simpleview_rss: 'https://www.simpleview.com',
  eventbrite: 'https://www.eventbrite.com',
  algolia_api: 'https://www.algolia.com',
  timely_api: 'https://www.timely.com',
  tourism_html: 'https://www.tourism.com',
  ical: null,
  aiken_playwright: 'https://www.aikensc.com',
  arcgis_permits: null,
};

const SOURCE_PATTERNS: [string, RegExp][] = [
  ['eproval', /eproval/],
  ['civicplus_rss', /civicplus/],
  ['simpleview_rss', /simpleview|cvb|visitor/],
  ['eventbrite', /eventbrite/],
  ['algolia_api', /algolia/],
  ['timely_api', /timely/],
  ['tourism_html', /tourism/],
  ['ical', /(^|_)ical|_ical/],
  ['aiken_playwright', /aiken/],
  ['arcgis_permits', /_permits$/],
];

export function getSourceLabel(sourceOrSourceType: string): string {
  if (!sourceOrSourceType) return 'Unknown';
  if (sourceOrSourceType === 'platform') return 'Platform';
  if (SOURCE_TYPE_LABELS[sourceOrSourceType]) {
    return SOURCE_TYPE_LABELS[sourceOrSourceType];
  }
  const sourceType = deriveSourceType(sourceOrSourceType);
  if (sourceType && SOURCE_TYPE_LABELS[sourceType]) {
    return SOURCE_TYPE_LABELS[sourceType];
  }
  return 'Unknown';
}

export function deriveSourceType(source: string): string {
  if (source === 'platform') return 'platform';
  if (SOURCE_TYPE_LABELS[source]) {
    return source;
  }
  for (const [type, pattern] of SOURCE_PATTERNS) {
    if (pattern.test(source)) {
      return type;
    }
  }
  return '';
}

export function getSourceUrl(source: string, sourceUrl?: string): string | null {
  if (sourceUrl) return sourceUrl;
  if (source === 'platform') return null;
  if (SOURCE_TYPE_URLS[source]) {
    return SOURCE_TYPE_URLS[source];
  }
  const derivedType = deriveSourceType(source);
  if (derivedType && SOURCE_TYPE_URLS[derivedType]) {
    return SOURCE_TYPE_URLS[derivedType];
  }
  return null;
}

export function getSourceTypeLabel(sourceType: string | undefined): string {
  if (!sourceType) return 'Unknown';
  const labels: Record<string, string> = {
    savannah_eproval: 'City Permit',
    durham_permits: 'City Permit',
    raleigh_permits: 'City Permit',
    augusta_civicplus: 'City Calendar',
    columbia_county_civicplus: 'City Calendar',
    spartanburg_civicplus: 'City Calendar',
    charleston_civicplus: 'City Calendar',
    athens_civicplus: 'City Calendar',
    augusta_cvb: 'CVB Calendar',
    columbia_sc_cvb: 'CVB Calendar',
    greenville_sc_cvb: 'CVB Calendar',
    aiken_playwright: 'City Calendar',
    waynesboro_ical: 'City Calendar',
    eventbrite: 'Eventbrite',
    simpleview_rss: 'CVB Calendar',
    algolia_api: 'Tourism Board',
    timely_api: 'Tourism Board',
    tourism_html: 'Tourism Board',
    ical: 'City Calendar',
    civicplus_rss: 'City Calendar',
    eproval: 'City Permit',
    arcgis_permits: 'City Permit',
  };
  return labels[sourceType] ?? sourceType;
}
