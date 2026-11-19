import { describe, it, expect } from '@jest/globals';
import {
  expandStreetAbbreviations,
  stripHouseNumber,
  extractVenueOrParkName,
  buildPhotonQueries,
} from '@/lib/utils/addressCleaner';

describe('expandStreetAbbreviations', () => {
  it('expands St to Street', () => {
    expect(expandStreetAbbreviations('1320 Main St Columbia SC')).toBe(
      '1320 Main Street Columbia SC',
    );
  });

  it('expands Rd to Road', () => {
    expect(expandStreetAbbreviations('589 Dunklin Bridge Rd Pelzer SC')).toBe(
      '589 Dunklin Bridge Road Pelzer SC',
    );
  });

  it('expands Pkwy to Parkway', () => {
    expect(expandStreetAbbreviations('3657 Eisenhower Pkwy Macon GA')).toBe(
      '3657 Eisenhower Parkway Macon GA',
    );
  });

  it('expands Ave to Avenue', () => {
    expect(expandStreetAbbreviations('1901 Mr Joe White Ave Myrtle Beach SC')).toBe(
      '1901 Mr Joe White Avenue Myrtle Beach SC',
    );
  });

  it('expands Blvd to Boulevard', () => {
    expect(expandStreetAbbreviations('525 Verdae Blvd Greenville SC')).toBe(
      '525 Verdae Boulevard Greenville SC',
    );
  });

  it('expands Dr to Drive', () => {
    expect(expandStreetAbbreviations('161 Seven Farms Dr Charleston SC')).toBe(
      '161 Seven Farms Drive Charleston SC',
    );
  });

  it('expands Hwy to Highway', () => {
    expect(expandStreetAbbreviations('4830 Hwy 17 S North Myrtle Beach SC')).toBe(
      '4830 Highway 17 S North Myrtle Beach SC',
    );
  });

  it('does not expand abbreviations inside words', () => {
    expect(expandStreetAbbreviations('Street Rd Avenue')).toBe('Street Road Avenue');
  });

  it('handles multiple abbreviations in one address', () => {
    expect(expandStreetAbbreviations('Main St and Park Ave, Columbia, SC')).toBe(
      'Main Street and Park Avenue, Columbia, SC',
    );
  });

  it('returns unchanged when no abbreviations present', () => {
    expect(expandStreetAbbreviations('123 Main Street Columbia SC')).toBe(
      '123 Main Street Columbia SC',
    );
  });
});

describe('stripHouseNumber', () => {
  it('strips leading house number from address', () => {
    expect(stripHouseNumber('161 Seven Farms Drive Charleston SC')).toBe(
      'Seven Farms Drive Charleston SC',
    );
  });

  it('strips leading house number with trailing comma', () => {
    expect(stripHouseNumber('3657 Eisenhower Parkway, Macon, GA')).toBe(
      'Eisenhower Parkway, Macon, GA',
    );
  });

  it('strips large house numbers', () => {
    expect(stripHouseNumber('1151 Old Garners Ferry Road Columbia SC')).toBe(
      'Old Garners Ferry Road Columbia SC',
    );
  });

  it('handles hyphenated house numbers', () => {
    expect(stripHouseNumber('1401-A E Victory Drive Savannah GA')).toBe(
      'E Victory Drive Savannah GA',
    );
  });

  it('returns null when no house number present', () => {
    expect(stripHouseNumber('Forsyth Park Savannah GA')).toBeNull();
  });

  it('returns null for venue-only address', () => {
    expect(stripHouseNumber('Ellis Square, Savannah, GA')).toBeNull();
  });

  it('strips house number with directional prefix', () => {
    expect(stripHouseNumber('1301 E Victory Drive Savannah GA')).toBe(
      'E Victory Drive Savannah GA',
    );
  });
});

describe('extractVenueOrParkName', () => {
  it('extracts venue name before comma', () => {
    expect(extractVenueOrParkName('Daffin Park, 1301 E Victory Drive, Savannah, GA')).toBe(
      'Daffin Park',
    );
  });

  it('extracts park name from park-only address', () => {
    expect(extractVenueOrParkName('Forsyth Park Band Shell, Savannah, GA')).toBe(
      'Forsyth Park Band Shell',
    );
  });

  it('extracts stadium name', () => {
    expect(
      extractVenueOrParkName('Credit One Stadium, 161 Seven Farms Drive, Charleston, SC 29492'),
    ).toBe('Credit One Stadium');
  });

  it('extracts plaza name', () => {
    expect(extractVenueOrParkName('Rousakis Plaza, 23 E River St, Savannah, GA')).toBe(
      'Rousakis Plaza',
    );
  });

  it('returns null for plain street address', () => {
    expect(extractVenueOrParkName('161 Seven Farms Drive Charleston SC')).toBeNull();
  });

  it('returns null for house number address', () => {
    expect(extractVenueOrParkName('20 East Gordon, Savannah, GA')).toBeNull();
  });
});

describe('stripVenuePrefix', () => {
  it('strips venue name before house number (no comma)', () => {
    const { stripVenuePrefix } = require('@/lib/utils/addressCleaner');
    expect(stripVenuePrefix('Daffin Park 1301 E Victory Dr Savannah, GA 31404')).toBe(
      '1301 E Victory Dr Savannah, GA 31404',
    );
  });

  it('strips venue name with dash separator', () => {
    const { stripVenuePrefix } = require('@/lib/utils/addressCleaner');
    expect(
      stripVenuePrefix('Grayson Stadium - 1401 E. Victory Drive, Savannah, GA 31404'),
    ).toBe('1401 E. Victory Drive, Savannah, GA 31404');
  });

  it('strips venue name before hyphenated house number', () => {
    const { stripVenuePrefix } = require('@/lib/utils/addressCleaner');
    expect(stripVenuePrefix('Rousakis Plaza 23 E River St. Savannah, GA 31401')).toBe(
      '23 E River St. Savannah, GA 31401',
    );
  });

  it('strips venue name before single-digit house number', () => {
    const { stripVenuePrefix } = require('@/lib/utils/addressCleaner');
    expect(stripVenuePrefix('Forsyth Park Fountain 1 W Gaston St, Savannah, GA')).toBe(
      '1 W Gaston St, Savannah, GA',
    );
  });

  it('does not strip leading numbers from already-clean address', () => {
    const { stripVenuePrefix } = require('@/lib/utils/addressCleaner');
    expect(stripVenuePrefix('1112 Harden Street, Columbia, SC')).toBe(
      '1112 Harden Street, Columbia, SC',
    );
  });

  it('does not strip from venue-only address with no number', () => {
    const { stripVenuePrefix } = require('@/lib/utils/addressCleaner');
    expect(stripVenuePrefix('Forsyth Park, Savannah, GA')).toBe('Forsyth Park, Savannah, GA');
  });

  it('strips business name with # separator', () => {
    const { stripVenuePrefix } = require('@/lib/utils/addressCleaner');
    expect(stripVenuePrefix('The Spot # 123 Main Street, Columbia, SC')).toBe(
      '123 Main Street, Columbia, SC',
    );
  });

  it('handles empty string', () => {
    const { stripVenuePrefix } = require('@/lib/utils/addressCleaner');
    expect(stripVenuePrefix('')).toBe('');
  });
});

describe('stripBusinessName', () => {
  it('skips business name that starts with digits', () => {
    const { stripBusinessName } = require('@/lib/utils/addressCleaner');
    expect(
      stripBusinessName(
        '3001 Entertainment Nightlife, 920 Lake Arrowhead Road, Myrtle Beach, SC 29572',
      ),
    ).toBe('920 Lake Arrowhead Road, Myrtle Beach, SC 29572');
  });

  it('handles normal business name before address', () => {
    const { stripBusinessName } = require('@/lib/utils/addressCleaner');
    expect(
      stripBusinessName('LO-Fi Brewing, 2038 Meeting Street Road, Charleston, SC 29405'),
    ).toBe('2038 Meeting Street Road, Charleston, SC 29405');
  });
});

describe('cleanAddress', () => {
  it('deduplicates identical address parts', () => {
    const { cleanAddress } = require('@/lib/utils/addressCleaner');
    expect(
      cleanAddress('4830 Hwy 17 S, 4830 Highway 17 South, North Myrtle Beach, SC 29582'),
    ).not.toContain(', 4830');
  });

  it('deduplicates identical city-only addresses', () => {
    const { cleanAddress } = require('@/lib/utils/addressCleaner');
    expect(
      cleanAddress('Brockman McClimon Road, Brockman McClimon Road, Greer, SC 29651'),
    ).not.toContain('Road, Brockman McClimon');
  });

  it('deduplicates same house number with expanded street', () => {
    const { cleanAddress } = require('@/lib/utils/addressCleaner');
    const result = cleanAddress('125 Kittal Rd, 125 Kittal Road, Lexington, SC 29073');
    const commaCount = (result.match(/,/g) || []).length;
    expect(commaCount).toBeLessThanOrEqual(2);
    expect(result).toContain('Kittal Road');
  });
});

describe('buildPhotonQueries', () => {
  it('returns cleaned address as first query', () => {
    const queries = buildPhotonQueries('589 Dunklin Bridge Rd, Pelzer, SC');
    expect(queries[0]).toContain('Dunklin Bridge Road');
  });

  it('includes house-number-stripped version for addresses with numbers', () => {
    const queries = buildPhotonQueries('161 Seven Farms Dr, Charleston, SC');
    const stripped = queries.find((q) => !q.match(/^\d/));
    expect(stripped).toBeDefined();
    expect(stripped).toContain('Seven Farms Drive');
    expect(stripped).not.toMatch(/^161/);
  });

  it('includes venue name for park addresses', () => {
    const queries = buildPhotonQueries('Forsyth Park Band Shell, Savannah, GA');
    const venueQuery = queries.find((q) => q === 'Forsyth Park Band Shell, Savannah, GA');
    expect(venueQuery).toBeDefined();
  });

  it('does not include stripped version for venue-only addresses', () => {
    const queries = buildPhotonQueries('Ellis Square, Savannah, GA');
    const stripped = queries.find((q) => !q.includes('Ellis'));
    expect(stripped).toBeUndefined();
  });

  it('deduplicates queries', () => {
    const queries = buildPhotonQueries('123 Main St, Savannah, GA');
    const unique = new Set(queries);
    expect(queries.length).toBe(unique.size);
  });

  it('handles address that needs abbreviation expansion + stripping', () => {
    const queries = buildPhotonQueries(
      'Credit One Stadium, 161 Seven Farms Dr, Charleston, SC 29492',
    );
    const stripped = queries.find((q) => q.includes('Seven Farms Drive') && !q.includes('161'));
    expect(stripped).toBeDefined();
  });
});
