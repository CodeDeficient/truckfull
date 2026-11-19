import { describe, it, expect } from '@jest/globals';
import {
  floorToNearestTen,
  buildTruckCountTitle,
  buildTruckCountDescription,
  buildTruckCountOgDescription,
  buildTruckCountTwitterDescription,
} from '@/lib/seo/truckCount.logic';

describe('floorToNearestTen', () => {
  it('returns 0 for 0', () => {
    expect(floorToNearestTen(0)).toBe(0);
  });

  it('returns 0 for 1', () => {
    expect(floorToNearestTen(1)).toBe(0);
  });

  it('returns 0 for 9', () => {
    expect(floorToNearestTen(9)).toBe(0);
  });

  it('returns 10 for 10', () => {
    expect(floorToNearestTen(10)).toBe(10);
  });

  it('returns 90 for 99', () => {
    expect(floorToNearestTen(99)).toBe(90);
  });

  it('returns 100 for 100', () => {
    expect(floorToNearestTen(100)).toBe(100);
  });

  it('returns 100 for 109', () => {
    expect(floorToNearestTen(109)).toBe(100);
  });

  it('returns 110 for 110', () => {
    expect(floorToNearestTen(110)).toBe(110);
  });

  it('returns 260 for 265 (regression: original bug value)', () => {
    expect(floorToNearestTen(265)).toBe(260);
  });

  it('returns 370 for 375 (current production state)', () => {
    expect(floorToNearestTen(375)).toBe(370);
  });

  it('returns 9990 for 9999', () => {
    expect(floorToNearestTen(9999)).toBe(9990);
  });

  it('returns 0 for negative numbers', () => {
    expect(floorToNearestTen(-5)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(floorToNearestTen(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(floorToNearestTen(Infinity)).toBe(0);
  });

  it('returns 0 for -Infinity', () => {
    expect(floorToNearestTen(-Infinity)).toBe(0);
  });
});

describe('buildTruckCountTitle', () => {
  it('builds title for 370', () => {
    expect(buildTruckCountTitle(370)).toBe(
      'TruckFull | 370+ Food Trucks & Caterers in Georgia & South Carolina',
    );
  });

  it('builds title for 0', () => {
    expect(buildTruckCountTitle(0)).toBe(
      'TruckFull | 0+ Food Trucks & Caterers in Georgia & South Carolina',
    );
  });

  it('builds title for 260', () => {
    expect(buildTruckCountTitle(260)).toBe(
      'TruckFull | 260+ Food Trucks & Caterers in Georgia & South Carolina',
    );
  });

  it('omits the count when it is unknown', () => {
    expect(buildTruckCountTitle(null)).toBe(
      'TruckFull | Food Trucks & Caterers in Georgia & South Carolina',
    );
  });
});

describe('buildTruckCountDescription', () => {
  it('contains the count', () => {
    expect(buildTruckCountDescription(370)).toContain('370+');
  });

  it('contains key SEO terms', () => {
    const desc = buildTruckCountDescription(370);
    expect(desc).toContain('food trucks');
    expect(desc).toContain('Live map');
    expect(desc).toContain('Augusta');
    expect(desc).toContain('Charleston');
  });
});

describe('buildTruckCountOgDescription', () => {
  it('contains the count', () => {
    expect(buildTruckCountOgDescription(370)).toContain('370+');
  });

  it('is shorter than the full description', () => {
    const full = buildTruckCountDescription(370);
    const og = buildTruckCountOgDescription(370);
    expect(og.length).toBeLessThan(full.length);
  });
});

describe('buildTruckCountTwitterDescription', () => {
  it('contains the count', () => {
    expect(buildTruckCountTwitterDescription(370)).toContain('370+');
  });

  it('is shorter than the OG description', () => {
    const og = buildTruckCountOgDescription(370);
    const twitter = buildTruckCountTwitterDescription(370);
    expect(twitter.length).toBeLessThan(og.length);
  });
});
