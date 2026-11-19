const WORD_STARTS = /(^|\s)\S/g;
const PARENTHESIZED = /\(([^)]+)\)/;
const UNNAMED_ROAD = /^(NO NAME|UNNAMED|UNNAMED ROAD)$/i;
const UNNAMED_ROAD_SUFFIX = /\s*\((NO NAME|UNNAMED|UNNAMED ROAD)\)/i;
const STREET_TYPE_ABBREVIATIONS = /\b(?:RD|ST|AVE|BLVD|DR|HWY|LN|CT|PL)\b/g;

/**
 * Traffic Data Utilities
 *
 * Shared helper functions for traffic node data formatting and parsing.
 */

function toTitleCase(str: string): string {
  if (!str) return '';
  // Convert first character of each word to uppercase - simplified to prevent ReDoS
  return str.toLowerCase().replaceAll(WORD_STARTS, (match) => match.toUpperCase());
}

/**
 * Extract the most meaningful name from a DOT location segment.
 * Prioritizes parenthetical content (usually the road name).
 */
function extractName(segment: string): string {
  const parenMatch = segment.match(PARENTHESIZED);
  if (parenMatch) {
    const content = parenMatch[1].trim();
    // Ignore generic "NO NAME" labels, prefer the code (e.g. "S- 123")
    if (!UNNAMED_ROAD.test(content)) {
      return toTitleCase(content);
    }
  }
  // If no parens or ignored, use the segment (removing the ignored paren part)
  const cleaned = segment.replace(UNNAMED_ROAD_SUFFIX, '').trim();
  return toTitleCase(cleaned);
}

/**
 * Parse technical DOT location names to extract readable road names.
 *
 * Examples:
 * - "S- 144 (BETTIS ACADEMY RD) TO S..." → "Bettis Academy Rd"
 * - "SC 230 (W MARTINTOWN RD) TO US..." → "W Martintown Rd"
 * - "US 1 (COLUMBIA HWY N) TO S- 49..." → "Columbia Hwy N"
 *
 * @param description - Raw location description from DOT data
 * @param stationId - Station ID as fallback
 * @returns Human-readable location name
 */
export function parseLocationName(description: string | null, stationId: string): string {
  if (!description) return `Station ${stationId}`;

  // Clean up common abbreviations - simplified to prevent ReDoS
  const name = description.replaceAll(STREET_TYPE_ABBREVIATIONS, (match) => {
    switch (match) {
      case 'RD': {
        return 'Rd';
      }
      case 'ST': {
        return 'St';
      }
      case 'AVE': {
        return 'Ave';
      }
      case 'BLVD': {
        return 'Blvd';
      }
      case 'DR': {
        return 'Dr';
      }
      case 'HWY': {
        return 'Hwy';
      }
      case 'LN': {
        return 'Ln';
      }
      case 'CT': {
        return 'Ct';
      }
      case 'PL': {
        return 'Pl';
      }
      default: {
        return match;
      }
    }
  });

  // Check for " TO " separator which indicates a segment definition
  if (name.includes(' TO ')) {
    const parts = name.split(' TO ');
    if (parts.length >= 2) {
      // "S- 136 (BETHLEHEM RD) TO US 15 (HARTSVILLE HWY)" -> "Bethlehem Rd to Hartsville Hwy"
      // Handle multiple TOs by mapping all parts
      return parts.map((p) => extractName(p)).join(' to ');
    }
  }

  // Fallback: just extract from the whole string
  return extractName(name);
}

/**
 * Format AADT (Annual Average Daily Traffic) for display.
 *
 * @param aadt - Raw AADT count
 * @returns Formatted string like "12.5K" or "850"
 */
export function formatAADT(aadt: number): string {
  if (aadt >= 1000) {
    return `${(aadt / 1000).toFixed(1)}K`;
  }
  return String(aadt);
}

/**
 * Format distance in meters to human-readable format.
 *
 * @param meters - Distance in meters
 * @returns Formatted string like "2.5 mi" or "500 ft"
 */
export function formatDistance(meters: number): string {
  const miles = meters * 0.000_621_371;
  if (miles >= 1) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${(miles * 5280).toFixed(0)} ft`;
}

/**
 * Get traffic level label and color based on percentile.
 *
 * @param percentile - Score percentile (0-100)
 * @returns Object with label and Tailwind color classes
 */
export function getTrafficLevelInfo(percentile: number): { label: string; color: string } {
  if (percentile >= 80) return { label: 'Very High Traffic', color: 'bg-red-500 text-white' };
  if (percentile >= 60) return { label: 'High Traffic', color: 'bg-orange-500 text-white' };
  if (percentile >= 40) return { label: 'Medium Traffic', color: 'bg-yellow-500 text-black' };
  if (percentile >= 20) return { label: 'Moderate Traffic', color: 'bg-green-500 text-white' };
  return { label: 'Low Traffic', color: 'bg-gray-500 text-white' };
}
