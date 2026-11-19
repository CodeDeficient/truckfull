import { describe, it, expect } from '@jest/globals';
import {
  classifyLocationCompleteness,
  hasStreetAddress,
  isBarePlaceholder,
} from '@/lib/research/locationCompleteness';

describe('classifyLocationCompleteness', () => {
  it('returns full for street + city + state', () => {
    expect(classifyLocationCompleteness('3027 Martin Luther King Jr Blvd', 'Anderson', 'SC')).toBe('full');
  });

  it('returns full for street address even without city', () => {
    expect(classifyLocationCompleteness('1200 Rosewood Dr', '', 'SC')).toBe('full');
  });

  it('returns partial for city only', () => {
    expect(classifyLocationCompleteness('', 'Augusta', 'GA')).toBe('partial');
  });

  it('returns partial for city and state without address', () => {
    expect(classifyLocationCompleteness('', 'Seneca', 'SC')).toBe('partial');
  });

  it('returns partial for venue name only (no street number)', () => {
    expect(classifyLocationCompleteness('Burgess Community Center', '', '')).toBe('partial');
  });

  it('returns partial for bare venue name with city', () => {
    expect(classifyLocationCompleteness('Day Market', 'Anderson', 'SC')).toBe('partial');
  });

  it('returns partial for city + state without address', () => {
    expect(classifyLocationCompleteness(null, 'Orangeburg', 'SC')).toBe('partial');
  });

  it('returns partial for state only', () => {
    expect(classifyLocationCompleteness('', '', 'GA')).toBe('partial');
  });

  it('returns missing for all empty', () => {
    expect(classifyLocationCompleteness('', '', '')).toBe('missing');
  });

  it('returns missing for all null', () => {
    expect(classifyLocationCompleteness(null, null, null)).toBe('missing');
  });
});

describe('hasStreetAddress', () => {
  it('detects numbered street address', () => {
    expect(hasStreetAddress('3027 Martin Luther King Jr Blvd')).toBe(true);
  });

  it('detects PO box style address', () => {
    expect(hasStreetAddress('1200 Rosewood Drive')).toBe(true);
  });

  it('returns false for venue name only', () => {
    expect(hasStreetAddress('Burgess Community Center')).toBe(false);
    expect(hasStreetAddress('Day Market')).toBe(false);
  });

  it('detects period-abbreviated streets', () => {
    expect(hasStreetAddress('1200 Magnolia St.')).toBe(true);
    expect(hasStreetAddress('350 Magnolia Dr.')).toBe(true);
  });

  it('returns false for zip codes', () => {
    expect(hasStreetAddress('29621')).toBe(false);
    expect(hasStreetAddress('29621-1234')).toBe(false);
  });

  it('returns false for PO boxes', () => {
    expect(hasStreetAddress('PO Box 123')).toBe(false);
    expect(hasStreetAddress('P.O. Box 4567')).toBe(false);
  });

  it('returns false for unit without street', () => {
    expect(hasStreetAddress('Unit 7')).toBe(false);
  });

  it('returns false for city name only', () => {
    expect(hasStreetAddress('Anderson')).toBe(false);
  });

  it('returns false for empty', () => {
    expect(hasStreetAddress('')).toBe(false);
  });
});

describe('isBarePlaceholder', () => {
  it('detects bare venue names as placeholders', () => {
    expect(isBarePlaceholder('Day Market')).toBe(true);
  });

  it('detects generic center names', () => {
    expect(isBarePlaceholder('Community Center')).toBe(true);
  });

  it('detects generic park names', () => {
    expect(isBarePlaceholder('City Park')).toBe(true);
  });

  it('detects generic fairground names', () => {
    expect(isBarePlaceholder('County Fairgrounds')).toBe(true);
  });

  it('detects The Commons as bare placeholder', () => {
    expect(isBarePlaceholder('The Commons')).toBe(true);
    expect(isBarePlaceholder('The Promenade')).toBe(true);
  });

  it('returns false for full addresses', () => {
    expect(isBarePlaceholder('89 Saluda St, Ninety Six, SC')).toBe(false);
    expect(isBarePlaceholder('350 Magnolia Street')).toBe(false);
    expect(isBarePlaceholder('1200 Magnolia St.')).toBe(false);
  });

  it('returns false for city names', () => {
    expect(isBarePlaceholder('Augusta')).toBe(false);
  });

  it('returns false for empty', () => {
    expect(isBarePlaceholder('')).toBe(false);
  });
});
