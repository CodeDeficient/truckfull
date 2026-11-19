import { describe, it, expect } from '@jest/globals';
import {
  cleanAddress,
  extractIntersection,
  extractGoogleMapsPlace,
  stripBusinessName,
} from '@/lib/utils/addressCleaner';

describe('cleanAddress', () => {
  describe('URL removal', () => {
    it('removes URLs from addresses', () => {
      const input = 'Ellis Square https://maps.app.goo.gl/4W2VQ1bt1gw9kNxr5, Savannah, GA';
      const result = cleanAddress(input);
      expect(result).toBe('Ellis Square, Savannah, GA');
    });

    it('removes multiple URLs from addresses', () => {
      const input = 'Monterey Square https://maps.app.goo.gl/abc https://goo.gl/xyz, Savannah, GA';
      const result = cleanAddress(input);
      expect(result).toBe('Monterey Square, Savannah, GA');
    });

    it('removes Google Maps URLs with query parameters', () => {
      const input =
        'Monterey Square https://www.google.ca/maps/place/Monterey+Square/@32.0715023,-81.0975335,17z, Savannah, GA';
      const result = cleanAddress(input);
      expect(result).toBe('Monterey Square, Savannah, GA');
    });
  });

  describe('city/state deduplication', () => {
    it('removes duplicated city/state at end of address', () => {
      const input = 'Forsyth Park Band Shell, Savannah, GA, Savannah, GA';
      const result = cleanAddress(input);
      expect(result).toBe('Forsyth Park Band Shell, Savannah, GA');
    });

    it('handles triple duplicates', () => {
      const input = 'City Hall, Savannah, GA, Savannah, GA, Savannah, GA';
      const result = cleanAddress(input);
      expect(result).toBe('City Hall, Savannah, GA');
    });
  });

  describe('intersection extraction', () => {
    it('extracts intersection from verbose "corner of X and Y" format', () => {
      const input =
        'Wells Park is located on the corner of Montgomery and 38th Street. It sets between the legendary MLK. Blvd. and Montgomery, Savannah, GA';
      const result = cleanAddress(input);
      expect(result).toBe('Montgomery and 38th Street, Savannah, GA');
    });

    it('handles "corner of X & Y" format', () => {
      const input = 'Kavanaugh Park - corner of Washington Ave & Abercorn Street, Savannah, GA';
      const result = cleanAddress(input);
      expect(result).toBe('Washington Ave & Abercorn Street, Savannah, GA');
    });

    it('handles "Southwest corner of X and Y" format', () => {
      const input =
        'Daffin Park, Southwest corner of sports fields, corner of Waters Ave. & Washington Ave., Savannah, GA';
      const result = cleanAddress(input);
      expect(result).toBe('Waters Ave & Washington Ave, Savannah, GA');
    });
  });

  describe('combination cleaning', () => {
    it('cleans URLs and deduplicates city/state', () => {
      const input = 'Ellis Square https://maps.app.goo.gl/abc, Savannah, GA, Savannah, GA';
      const result = cleanAddress(input);
      expect(result).toBe('Ellis Square, Savannah, GA');
    });

    it('handles messy real-world addresses', () => {
      const input =
        'Daffin Park - Waters/Washington/Victory (opposite end from Bananas Stadium, Savannah, GA';
      const result = cleanAddress(input);
      expect(result).toBe('Waters St and Washington St, Savannah, GA');
    });
  });
});

describe('extractIntersection', () => {
  it('extracts intersection from "corner of X and Y"', () => {
    const result = extractIntersection(
      'Wells Park is located on the corner of Montgomery and 38th Street, Savannah, GA',
    );
    expect(result).toBe('Montgomery and 38th Street, Savannah, GA');
  });

  it('extracts intersection from "X & Y" format', () => {
    const result = extractIntersection('Waters Ave & Washington Ave, Savannah, GA');
    expect(result).toBe('Waters Ave & Washington Ave, Savannah, GA');
  });

  it('returns null when no intersection found', () => {
    const result = extractIntersection('100 Main Street, Savannah, GA');
    expect(result).toBeNull();
  });

  it('handles "X/Y" format (common in city data)', () => {
    const result = extractIntersection('Waters/Washington/Victory, Savannah, GA');
    expect(result).toBe('Waters St and Washington St, Savannah, GA');
  });
});

describe('stripBusinessName', () => {
  it('strips business name when address starts with venue name then comma', () => {
    expect(
      stripBusinessName('Flowing Wells Theatre, 286 Flowing Wells Rd, Martinez, GA 30907'),
    ).toBe('286 Flowing Wells Rd, Martinez, GA 30907');
  });

  it('strips business name with "Inc." suffix', () => {
    expect(
      stripBusinessName('Better World Studios, Inc., 125 Marshall Street, Graniteville, SC 29829'),
    ).toBe('125 Marshall Street, Graniteville, SC 29829');
  });

  it('strips multi-word business name', () => {
    expect(
      stripBusinessName(
        'HUB for Community Innovation Augusta, 631 Chafee Avenue, Augusta, GA 30904',
      ),
    ).toBe('631 Chafee Avenue, Augusta, GA 30904');
  });

  it('strips business name with hyphens', () => {
    expect(
      stripBusinessName(
        'The Vista- Registration Location coming soon!, 828 Gervais St, Columbia, SC 29201',
      ),
    ).toBe('828 Gervais St, Columbia, SC 29201');
  });

  it('returns original when no street number found', () => {
    expect(
      stripBusinessName('Tactical Advantage Sportsman Complex, Fort Gordon, GA 30905'),
    ).toBe('Tactical Advantage Sportsman Complex, Fort Gordon, GA 30905');
  });

  it('returns original when address already starts with number', () => {
    expect(stripBusinessName('308 Hale St, Augusta, GA 30901')).toBe('308 Hale St, Augusta, GA 30901');
  });

  it('handles address with # unit number', () => {
    expect(
      stripBusinessName(
        'Wine House, A Retail Shop and Wine Bar, 475 Haywood Rd #8, Greenville, SC 29607',
      ),
    ).toBe('475 Haywood Rd #8, Greenville, SC 29607');
  });

  it('handles church name with long address', () => {
    expect(
      stripBusinessName(
        'Virginia Wingard Memorial United Methodist Church, 1500 Broad River Road, Columbia, SC 29210',
      ),
    ).toBe('1500 Broad River Road, Columbia, SC 29210');
  });

  it('handles university name with building name', () => {
    expect(
      stripBusinessName(
        'Columbia International University - Shortess Chapel, 7435 Monticello Road, Columbia, SC 29230-3122',
      ),
    ).toBe('7435 Monticello Road, Columbia, SC 29230-3122');
  });

  it('handles "Tour begins at" prefix', () => {
    expect(
      stripBusinessName(
        'Tour begins at Palmetto Life Church, 2204 Park Street, Columbia, SC 29201',
      ),
    ).toBe('2204 Park Street, Columbia, SC 29201');
  });

  it('returns original when address has P.O. Box after business name', () => {
    expect(
      stripBusinessName('Harriet Barber House, P.O. Box 290054, COLUMBIA, SC 29229'),
    ).toBe('Harriet Barber House, P.O. Box 290054, COLUMBIA, SC 29229');
  });

  it('returns empty for empty input', () => {
    expect(stripBusinessName('')).toBe('');
  });
});

describe('extractGoogleMapsPlace', () => {
  it('extracts place name from Google Maps URL with park', () => {
    expect(
      extractGoogleMapsPlace(
        'https://www.google.com/maps/place/Hull+Park,+Savannah,+GA+31405/@32.0406856,-81.0969972,17z/data=!3m1',
      ),
    ).toBe('Hull Park, Savannah, GA 31405');
  });

  it('extracts place name with street address', () => {
    expect(
      extractGoogleMapsPlace(
        'https://www.google.com/maps/place/Calhoun+Square,+164+E+Gordon+St,+Savannah,+GA+31401/@32.0707768,-81.0947459',
      ),
    ).toBe('Calhoun Square, 164 E Gordon St, Savannah, GA 31401');
  });

  it('returns null for non-Google Maps URLs', () => {
    expect(extractGoogleMapsPlace('https://example.com/some-page')).toBeNull();
  });

  it('returns null for string without URL', () => {
    expect(extractGoogleMapsPlace('Hull Park, Savannah, GA')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractGoogleMapsPlace('')).toBeNull();
  });
});

describe('cleanAddress with business name stripping', () => {
  it('strips business name and returns street address', () => {
    expect(
      cleanAddress('Flowing Wells Theatre, 286 Flowing Wells Rd, Martinez, GA 30907'),
    ).toBe('286 Flowing Wells Rd, Martinez, GA 30907');
  });

  it('extracts place name from Google Maps URL', () => {
    expect(
      cleanAddress(
        'https://www.google.com/maps/place/Hull+Park,+Savannah,+GA+31405/@32.0406856,-81.0969972,17z/data=!3m1',
      ),
    ).toBe('Hull Park, Savannah, GA 31405');
  });

  it('extracts place from Google Maps URL with street address', () => {
    expect(
      cleanAddress(
        'https://www.google.com/maps/place/Calhoun+Square,+164+E+Gordon+St,+Savannah,+GA+31401/@32.0707768,-81.0947459',
      ),
    ).toBe('Calhoun Square, 164 E Gordon St, Savannah, GA 31401');
  });

  it('returns empty for P.O. Box only', () => {
    expect(cleanAddress('P.O. Box 290054, COLUMBIA, SC 29229')).toBe('');
  });
});
