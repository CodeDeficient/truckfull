const EVENTBRITE_SUFFIX = /_eventbrite$/;

export type SourceCategory = 'official' | 'platform' | 'community';

export interface SourceDisplay {
  label: string;
  icon: string;
  category: SourceCategory;
  city: string;
}

const OFFICIAL_ICON = '🏛️';
const PLATFORM_ICON = '🎫';
const COMMUNITY_ICON = '🔍';

const OFFICIAL_SOURCE_TYPES: Set<string> = new Set([
  'eproval',
  'simpleview_rss',
  'tourism_html',
  'ical',
  'civicplus_rss',
  'arcgis_permits',
]);

function extractCity(source: string): string {
  const parts = source.split('_');
  const typeSuffixes = new Set([
    'eventbrite',
    'eproval',
    'cvb',
    'ical',
    'tourism',
    'civicplus',
    'algolia',
    'playwright',
    'permits',
  ]);
  const filtered = parts.filter((p) => !typeSuffixes.has(p));
  if (filtered.length === 0) return source;
  return filtered.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getEventbriteCity(source: string): string {
  const cityPart = source.replace(EVENTBRITE_SUFFIX, '');
  return cityPart
    .split('_')
    .map((w) => {
      if (w === 'sc' || w === 'ga' || w === 'nc') return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function getCommunityLabel(source: string, sourceType: string): string {
  if (sourceType === 'algolia_api' || sourceType === 'aiken_playwright') {
    return 'Web Listing';
  }
  return extractCity(source);
}

export function getSourceDisplay(
  source: string | null | undefined,
  sourceType: string | null | undefined,
): SourceDisplay {
  if (!source) {
    return { label: 'Platform', icon: '📍', category: 'official', city: '' };
  }

  if (sourceType && OFFICIAL_SOURCE_TYPES.has(sourceType)) {
    return {
      label: extractCity(source),
      icon: OFFICIAL_ICON,
      category: 'official',
      city: extractCity(source),
    };
  }

  if (sourceType === 'eventbrite') {
    return {
      label: getEventbriteCity(source),
      icon: PLATFORM_ICON,
      category: 'platform',
      city: getEventbriteCity(source),
    };
  }

  return {
    label: getCommunityLabel(source, sourceType ?? ''),
    icon: COMMUNITY_ICON,
    category: 'community',
    city: extractCity(source),
  };
}

export function getSourceCategory(sourceType: string | null | undefined): SourceCategory {
  if (!sourceType) return 'official';
  if (OFFICIAL_SOURCE_TYPES.has(sourceType)) return 'official';
  if (sourceType === 'eventbrite') return 'platform';
  return 'community';
}

export const SOURCE_FILTER_OPTIONS = [
  { value: 'all' as const, label: 'All', icon: '' },
  { value: 'official' as const, label: 'Official', icon: OFFICIAL_ICON },
  { value: 'platform' as const, label: 'Eventbrite', icon: PLATFORM_ICON },
  { value: 'community' as const, label: 'Other', icon: COMMUNITY_ICON },
] as const;

export type SourceFilterValue = (typeof SOURCE_FILTER_OPTIONS)[number]['value'];
