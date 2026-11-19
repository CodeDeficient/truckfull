import { describe, it, expect } from '@jest/globals';
import { extractClaims } from '@/lib/research/claimExtractor';
import type { ParsedEventData } from '@/lib/research/parseEventText';

function makeParsed(overrides: Partial<ParsedEventData> = {}): ParsedEventData {
  return {
    name: 'Asheville Mall Vendor Event',
    description: '',
    date: '2026-05-01',
    endDate: '2026-05-03',
    location: {
      address: 'Asheville Mall',
      city: 'Asheville',
      state: 'NC',
      lat: null,
      lng: null,
    },
    time: { start: null, end: null },
    category: 'market',
    expectedAttendance: null,
    contactInfo: {
      phone: '828-555-0124',
      email: null,
      website: null,
    },
    confidence: 0.9,
    ...overrides,
  };
}

describe('extractClaims', () => {
  it('returns name claim when name exists', () => {
    const { claims } = extractClaims(makeParsed());
    const nameClaim = claims.find((c) => c.type === 'name');
    expect(nameClaim).toBeDefined();
    expect(nameClaim!.severity).toBe('critical');
    expect(nameClaim!.canonicalValue).toContain('asheville');
    expect(nameClaim!.canonicalValue).toContain('mall');
    expect(nameClaim!.canonicalValue).toContain('vendor');
    expect(nameClaim!.canonicalValue).not.toContain('event');
  });

  it('returns venue claim from address and location', () => {
    const { claims } = extractClaims(makeParsed());
    const venueClaim = claims.find((c) => c.type === 'venue');
    expect(venueClaim).toBeDefined();
    expect(venueClaim!.severity).toBe('critical');
    expect(venueClaim!.canonicalValue).toContain('asheville');
    expect(venueClaim!.canonicalValue).toContain('mall');
  });

  it('returns date claim from date and endDate', () => {
    const { claims } = extractClaims(makeParsed());
    const dateClaim = claims.find((c) => c.type === 'date');
    expect(dateClaim).toBeDefined();
    expect(dateClaim!.severity).toBe('critical');
    expect(dateClaim!.matchPatterns.length).toBeGreaterThanOrEqual(3);
  });

  it('returns phone claim from phone', () => {
    const { claims } = extractClaims(makeParsed());
    const phoneClaim = claims.find((c) => c.type === 'phone');
    expect(phoneClaim).toBeDefined();
    expect(phoneClaim!.severity).toBe('major');
    expect(phoneClaim!.canonicalValue).toBe('8285550124');
  });

  it('returns food_truck claim', () => {
    const { claims } = extractClaims(makeParsed());
    const ftClaim = claims.find((c) => c.type === 'food_truck');
    expect(ftClaim).toBeDefined();
    expect(ftClaim!.severity).toBe('major');
  });

  it('excludes phone claim when no phone', () => {
    const { claims } = extractClaims(
      makeParsed({ contactInfo: { phone: null, email: null, website: null } }),
    );
    expect(claims.find((c) => c.type === 'phone')).toBeUndefined();
  });

  it('excludes venue claim when no location', () => {
    const { claims } = extractClaims(
      makeParsed({ location: { address: null, city: null, state: null, lat: null, lng: null } }),
    );
    expect(claims.find((c) => c.type === 'venue')).toBeUndefined();
  });

  it('filters out generic words from name claim', () => {
    const { claims } = extractClaims(makeParsed({ name: 'Great Annual Food Truck Festival' }));
    const nameClaim = claims.find((c) => c.type === 'name');
    expect(nameClaim!.canonicalValue).toContain('food');
    expect(nameClaim!.canonicalValue).toContain('truck');
    expect(nameClaim!.canonicalValue).toContain('festival');
    expect(nameClaim!.canonicalValue).not.toContain('great');
    expect(nameClaim!.canonicalValue).not.toContain('annual');
  });

  it('extracts website claim when website present', () => {
    const { claims } = extractClaims(
      makeParsed({ contactInfo: { phone: null, email: null, website: 'https://example.com/event' } }),
    );
    const websiteClaim = claims.find((c) => c.type === 'website');
    expect(websiteClaim).toBeDefined();
    expect(websiteClaim!.severity).toBe('minor');
    expect(websiteClaim!.canonicalValue).toBe('example.com');
  });

  it('excludes website claim when no website', () => {
    const { claims } = extractClaims(makeParsed());
    expect(claims.find((c) => c.type === 'website')).toBeUndefined();
  });

  it('returns empty claims for null input', () => {
    const result = extractClaims(null);
    expect(result.claims).toEqual([]);
    expect(result.isNameFragment).toBe(false);
  });

  it('includes date regex patterns for May 1-3', () => {
    const { claims } = extractClaims(makeParsed({ date: '2026-05-01', endDate: '2026-05-03' }));
    const dateClaim = claims.find((c) => c.type === 'date');
    const patterns = dateClaim!.matchPatterns;
    expect(patterns.some((p) => p.includes('may'))).toBe(true);
    expect(patterns.some((p) => p.includes('1'))).toBe(true);
    expect(patterns.some((p) => p.includes('3'))).toBe(true);
  });

  it('uses event name as venue source when no address but city exists', () => {
    const { claims } = extractClaims(
      makeParsed({
        location: { address: null, city: 'Asheville', state: 'NC', lat: null, lng: null },
        name: 'Asheville Night Market',
      }),
    );
    const venueClaim = claims.find((c) => c.type === 'venue');
    expect(venueClaim).toBeDefined();
    expect(venueClaim!.canonicalValue).toContain('asheville');
    expect(venueClaim!.canonicalValue).not.toContain('night');
    expect(venueClaim!.canonicalValue).not.toContain('market');
  });

  it('extracts claims with proper sort order: critical first', () => {
    const { claims } = extractClaims(makeParsed());
    const firstCritical = claims.findIndex((c) => c.severity === 'critical');
    const firstMajor = claims.findIndex((c) => c.severity === 'major');
    expect(firstCritical).toBeLessThanOrEqual(firstMajor);
  });

  it('flags isNameFragment when name is generic', () => {
    const result = extractClaims(makeParsed({ name: 'Join Us at Mall Event' }));
    expect(result.isNameFragment).toBe(true);
    const nameClaim = result.claims.find((c) => c.type === 'name');
    expect(nameClaim!.severity).toBe('major');
  });

  it('flags isNameFragment when name is generic location text', () => {
    const result = extractClaims(makeParsed({ name: 'Join Us at Mall May 1st' }));
    expect(result.isNameFragment).toBe(true);
  });

  it('does not flag isNameFragment for distinctive name', () => {
    const result = extractClaims(makeParsed({ name: 'Asheville BBQ Throwdown 2026' }));
    expect(result.isNameFragment).toBe(false);
    const nameClaim = result.claims.find((c) => c.type === 'name');
    expect(nameClaim!.severity).toBe('critical');
  });

  it('flags isNameFragment when name is empty', () => {
    const result = extractClaims(makeParsed({ name: '' }));
    expect(result.isNameFragment).toBe(true);
  });

  it('extracts email claim with lowercase canonical value', () => {
    const result = extractClaims(makeParsed({
      contactInfo: { phone: null, email: 'SampleMarket@GMAIL.COM', website: null },
    }));
    const emailClaim = result.claims.find((c) => c.type === 'email');
    expect(emailClaim).toBeDefined();
    expect(emailClaim!.canonicalValue).toBe('samplemarket@gmail.com');
    expect(emailClaim!.severity).toBe('major');
  });

  it('does not extract email claim when email is null', () => {
    const result = extractClaims(makeParsed({
      contactInfo: { phone: null, email: null, website: null },
    }));
    const emailClaim = result.claims.find((c) => c.type === 'email');
    expect(emailClaim).toBeUndefined();
  });
});
