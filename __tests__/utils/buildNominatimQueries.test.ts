import { describe, it, expect } from '@jest/globals';
import { buildNominatimQueries, parseAddressComponents } from '@/lib/utils/addressCleaner';

describe('parseAddressComponents', () => {
  it('parses clean address with house number', () => {
    const r = parseAddressComponents('1112 Harden Street, Columbia, SC 29205');
    expect(r.number).toBe('1112');
    expect(r.street).toContain('Harden');
    expect(r.city).toBe('Columbia');
    expect(r.state).toBe('SC');
    expect(r.zip).toBe('29205');
  });

  it('parses address without zip', () => {
    const r = parseAddressComponents('918 Gervais Street, Columbia, SC');
    expect(r.number).toBe('918');
    expect(r.street).toContain('Gervais');
    expect(r.city).toBe('Columbia');
    expect(r.state).toBe('SC');
  });

  it('expands street type abbreviations', () => {
    const r = parseAddressComponents('1022 Carolina Boulevard, Isle of Palms, SC');
    expect(r.number).toBe('1022');
    expect(r.street).toContain('Carolina');
    expect(r.city).toBe('Isle of Palms');
  });

  it('parses address with directional prefix', () => {
    const r = parseAddressComponents('1301 East Victory Drive, Savannah, GA');
    expect(r.number).toBe('1301');
    expect(r.street).toContain('Victory');
    expect(r.city).toBe('Savannah');
    expect(r.state).toBe('GA');
  });

  it('handles venue-only with city', () => {
    const r = parseAddressComponents('Forsyth Park Bandshell, Savannah, GA');
    expect(r.street).toBeTruthy();
  });
});

describe('buildNominatimQueries', () => {
  it('returns freeform query for address with house number', () => {
    const queries = buildNominatimQueries('1112 Harden Street, Columbia, SC 29205', 'Columbia', 'SC');
    expect(queries.length).toBeGreaterThanOrEqual(1);
    expect(queries[0].type).toBe('freeform');
    expect(queries[0].q).toContain('1112');
  });

  it('includes street-only query for broader match', () => {
    const queries = buildNominatimQueries('1112 Harden Street, Columbia, SC 29205', 'Columbia', 'SC');
    expect(queries.some((q) => q.q.includes('Harden') && !q.q.includes('1112'))).toBe(true);
  });

  it('does not duplicate city/state when address already has it', () => {
    const queries = buildNominatimQueries('2934 West Montague Avenue, North Charleston, SC', 'North Charleston', 'SC');
    const hasDupe = queries.some((q) => {
      const count = (q.q.match(/N(?:orth\s+)?Charleston/g) || []).length;
      return count > 1;
    });
    expect(hasDupe).toBe(false);
  });

  it('deduplicates identical queries', () => {
    const queries = buildNominatimQueries('123 Main Street, Columbia, SC', 'Columbia', 'SC');
    const keys = queries.map((q) => q.q.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('strips business name from compound address with house number', () => {
    const queries = buildNominatimQueries(
      'Drury Plaza Hotel North Charleston, 2934 West Montague Avenue, North Charleston, SC 29418',
      'North Charleston',
      'SC',
    );
    const q = queries.find((q) => q.q.includes('Montague'));
    expect(q).toBeDefined();
    expect(q!.q).not.toContain('Drury');
  });

  it('includes venue name query for park addresses', () => {
    const queries = buildNominatimQueries('Forsyth Park Bandshell', 'Savannah', 'GA');
    expect(queries.some((q) => q.q.includes('Forsyth'))).toBe(true);
  });

  it('handles PO Box by returning empty', () => {
    const queries = buildNominatimQueries('P.O. Box 12345', 'Columbia', 'SC');
    expect(queries).toHaveLength(0);
  });

  it('handles malformed address without crashing', () => {
    const queries = buildNominatimQueries('');
    expect(queries).toHaveLength(0);
  });

  it('appends city/state when address does not contain them', () => {
    const queries = buildNominatimQueries('2 W Gaston St', 'Savannah', 'GA');
    const hasCity = queries.some((q) => q.q.includes('Savannah'));
    expect(hasCity).toBe(true);
  });

  it('handles address with dash-separated venue name', () => {
    const queries = buildNominatimQueries(
      'Grayson Stadium - 1401 E Victory Drive, Savannah, GA',
      'Savannah',
      'GA',
    );
    expect(queries.length).toBeGreaterThan(0);
  });
});