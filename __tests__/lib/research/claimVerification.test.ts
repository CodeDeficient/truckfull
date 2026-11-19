import { describe, it, expect } from '@jest/globals';
import { verifyClaims, verifyClaim, normalizeToken } from '@/lib/research/claimVerification';
import type { EventClaim } from '@/lib/research/claimExtractor';

describe('verifyClaim', () => {
  it('supports phone claim when exact digits found', () => {
    const claim: EventClaim = {
      type: 'phone',
      severity: 'major',
      canonicalValue: '8285550124',
      matchPatterns: ['8285550124'],
    };
    const result = verifyClaim(claim, 'For more info call 828-555-0124 today!');
    expect(result.score).toBe(1);
    expect(result.status).toBe('supported');
    expect(result.evidence).toContain('828-555-0124');
  });

  it('not_mentioned when phone not in text', () => {
    const claim: EventClaim = {
      type: 'phone',
      severity: 'major',
      canonicalValue: '8285550124',
      matchPatterns: ['8285550124'],
    };
    const result = verifyClaim(claim, 'Asheville Mall is a big shopping center.');
    expect(result.score).toBe(0);
    expect(result.status).toBe('not_mentioned');
  });

  it('supports name claim when full event name found', () => {
    const claim: EventClaim = {
      type: 'name',
      severity: 'critical',
      canonicalValue: 'asheville mall vendor event',
      matchPatterns: ['Asheville', 'Mall', 'Vendor', 'Event'],
    };
    const result = verifyClaim(claim, 'Join us at the Asheville Mall Vendor Event this May 1-3!');
    expect(result.score).toBe(1);
    expect(result.status).toBe('supported');
  });

  it('partial when only some name tokens match', () => {
    const claim: EventClaim = {
      type: 'name',
      severity: 'critical',
      canonicalValue: 'asheville mall vendor event',
      matchPatterns: ['Asheville', 'Mall', 'Vendor', 'Event'],
    };
    const result = verifyClaim(claim, 'Asheville Mall is hosting a market this weekend.');
    expect(result.status).toBe('partial');
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });

  it('not_mentioned when name tokens absent', () => {
    const claim: EventClaim = {
      type: 'name',
      severity: 'critical',
      canonicalValue: 'asheville mall vendor event',
      matchPatterns: ['Asheville', 'Mall', 'Vendor', 'Event'],
    };
    const result = verifyClaim(claim, 'Something totally unrelated happening somewhere else.');
    expect(result.status).toBe('not_mentioned');
    expect(result.score).toBe(0);
  });

  it('supports venue claim when venue name found', () => {
    const claim: EventClaim = {
      type: 'venue',
      severity: 'critical',
      canonicalValue: 'asheville mall',
      matchPatterns: ['Asheville', 'Mall'],
    };
    const result = verifyClaim(claim, 'The market is at Asheville Mall on May 1.');
    expect(result.status).toBe('supported');
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('supports date claim when date pattern found', () => {
    const claim: EventClaim = {
      type: 'date',
      severity: 'critical',
      canonicalValue: '2026-05-01',
      matchPatterns: ['May 1', 'may 1', '1'],
    };
    const result = verifyClaim(claim, 'Come out to Asheville Mall on May 1-3.');
    expect(result.status).toBe('supported');
    expect(result.score).toBeGreaterThan(0);
  });

  it('supports food_truck claim when keywords near venue', () => {
    const claim: EventClaim = {
      type: 'food_truck',
      severity: 'major',
      canonicalValue: 'food truck vendor mobile cuisine',
      matchPatterns: ['food truck', 'vendor', 'vendors'],
    };
    const result = verifyClaim(
      claim,
      'Food trucks will be at Asheville Mall serving up great eats.',
    );
    expect(result.status).toBe('supported');
    expect(result.score).toBeGreaterThan(0);
  });

  it('partial food_truck when keyword far from venue', () => {
    const claim: EventClaim = {
      type: 'food_truck',
      severity: 'major',
      canonicalValue: 'food truck vendor mobile cuisine',
      matchPatterns: ['food truck', 'vendor', 'vendors'],
    };
    const result = verifyClaim(
      claim,
      'Looking for local food trucks? Check out the city directory for listings. Great eats around town.',
    );
    expect(result.status).toBe('not_mentioned');
  });
});

describe('verifyClaims', () => {
  it('correctly classifies a fully corroborating source', () => {
    const claims: EventClaim[] = [
      { type: 'name', severity: 'critical', canonicalValue: 'asheville mall vendor event', matchPatterns: ['Asheville', 'Mall', 'Vendor'] },
      { type: 'venue', severity: 'critical', canonicalValue: 'asheville mall', matchPatterns: ['Asheville', 'Mall'] },
      { type: 'date', severity: 'critical', canonicalValue: '2026-05-01', matchPatterns: ['May 1', 'may 1'] },
      { type: 'phone', severity: 'major', canonicalValue: '8285550124', matchPatterns: ['8285550124'] },
    ];
    const sourceText = 'The Asheville Mall Vendor Event returns May 1-3. Call 828-555-0124 to sign up!';
    const result = verifyClaims(claims, sourceText);

    expect(result.criticalSupported).toBeGreaterThanOrEqual(2);
    expect(result.criticalPartial).toBe(0);
    expect(result.totalScore).toBeGreaterThan(0.6);
    expect(result.supportingQuotes.length).toBeGreaterThan(0);
  });

  it('correctly classifies a tangential source (venue only, no event)', () => {
    const claims: EventClaim[] = [
      { type: 'name', severity: 'critical', canonicalValue: 'asheville mall vendor event', matchPatterns: ['Asheville', 'Mall', 'Vendor'] },
      { type: 'venue', severity: 'critical', canonicalValue: 'asheville mall', matchPatterns: ['Asheville', 'Mall'] },
      { type: 'date', severity: 'critical', canonicalValue: '2026-05-01', matchPatterns: ['May 1', 'may 1'] },
    ];
    const sourceText = 'Asheville Mall has many stores including Macy\'s and JCPenney.';
    const result = verifyClaims(claims, sourceText);

    expect(result.criticalSupported).toBe(1);
    expect(result.criticalPartial).toBe(1);
    expect(result.totalScore).toBeLessThan(0.6);
    expect(result.claimsVerified['name']!.status).toBe('partial');
    expect(result.claimsVerified['venue']!.status).toBe('supported');
  });

  it('correctly classifies an irrelevant source', () => {
    const claims: EventClaim[] = [
      { type: 'name', severity: 'critical', canonicalValue: 'asheville mall vendor event', matchPatterns: ['Asheville', 'Mall', 'Vendor'] },
      { type: 'venue', severity: 'critical', canonicalValue: 'asheville mall', matchPatterns: ['Asheville', 'Mall'] },
    ];
    const sourceText = 'Plan Ahead: Don\'t miss these April events happening in Greenville. Lucky you.';
    const result = verifyClaims(claims, sourceText);

    expect(result.criticalSupported).toBe(0);
    expect(result.criticalPartial).toBe(0);
    expect(result.totalScore).toBe(0);
  });

  it('extracts supporting quote snippets', () => {
    const claims: EventClaim[] = [
      { type: 'name', severity: 'critical', canonicalValue: 'asheville mall vendor event', matchPatterns: ['Asheville', 'Mall', 'Vendor'] },
    ];
    const sourceText = 'Join us at the Asheville Mall Vendor Event this May 1-3 for three days of fun.';
    const result = verifyClaims(claims, sourceText);

    expect(result.supportingQuotes.length).toBeGreaterThan(0);
    expect(result.supportingQuotes[0]).toContain('Asheville Mall Vendor Event');
  });

  it('downgrades venue and date to partial when they are far apart in text', () => {
    const claims: EventClaim[] = [
      { type: 'venue', severity: 'critical', canonicalValue: 'asheville mall', matchPatterns: ['Asheville', 'Mall'] },
      { type: 'date', severity: 'critical', canonicalValue: '2026-05-01', matchPatterns: ['may 1', 'may', '1'] },
    ];
    const sourceText = 'Asheville Mall is a great place to shop. They have many stores including Macy\'s and JCPenney on Tunnel Road. The parking lot is huge with over 2000 spaces and very convenient for shoppers. Visitors love the food court with options like Chick-fil-A and Sbarro. There is also a movie theater on the second floor. In completely unrelated news, May 1 is national gardening day. Plant some flowers in your garden and enjoy the spring weather!';
    const result = verifyClaims(claims, sourceText);

    expect(result.claimsVerified['venue']!.status).toBe('partial');
    expect(result.claimsVerified['date']!.status).toBe('partial');
  });

  it('keeps venue and date as supported when they are close in text', () => {
    const claims: EventClaim[] = [
      { type: 'venue', severity: 'critical', canonicalValue: 'asheville mall', matchPatterns: ['Asheville', 'Mall'] },
      { type: 'date', severity: 'critical', canonicalValue: '2026-05-01', matchPatterns: ['may 1', 'may', '1'] },
    ];
    const sourceText = 'Join us at Asheville Mall on May 1-3 for the vendor event!';
    const result = verifyClaims(claims, sourceText);

    expect(result.claimsVerified['venue']!.status).toBe('supported');
    expect(result.claimsVerified['date']!.status).toBe('supported');
  });
});

describe('normalizeToken', () => {
  it('lowercases input', () => {
    expect(normalizeToken('Asheville')).toBe('asheville');
  });

  it('strips periods from abbreviated words', () => {
    expect(normalizeToken('St.')).toBe('st');
  });

  it('strips possessive apostrophe-s', () => {
    expect(normalizeToken("John's")).toBe('john');
  });

  it('strips trailing s on 4+ char words', () => {
    expect(normalizeToken('festivals')).toBe('festival');
  });

  it('preserves short words ending in s (bus, gas)', () => {
    expect(normalizeToken('bus')).toBe('bus');
    expect(normalizeToken('gas')).toBe('gas');
  });

  it('preserves ss-ending words (business, address)', () => {
    expect(normalizeToken('business')).toBe('business');
    expect(normalizeToken('address')).toBe('address');
  });

  it('preserves us-ending words (campus, status)', () => {
    expect(normalizeToken('campus')).toBe('campus');
    expect(normalizeToken('status')).toBe('status');
  });

  it('strips possessive s after punctuation removal', () => {
    expect(normalizeToken("Asheville's")).toBe('asheville');
  });

  it('returns empty string for punctuation-only input', () => {
    expect(normalizeToken('!!!')).toBe('');
  });
});

describe('token normalization integration', () => {
  it('preserves short tokens ending in s (bus, gas)', () => {
    const claim: EventClaim = {
      type: 'venue',
      severity: 'critical',
      canonicalValue: 'Bus Stop Market',
    };
    const result = verifyClaims([claim], 'Come to the Bus Stop Market this weekend');
    expect(result.claimsVerified['venue']!.status).toBe('supported');
  });

  it('preserves ss-ending words (business, address)', () => {
    const claim: EventClaim = {
      type: 'venue',
      severity: 'critical',
      canonicalValue: 'Business Center',
    };
    const result = verifyClaims([claim], 'The Business Center hosts events');
    expect(result.claimsVerified['venue']!.status).toBe('supported');
  });

  it('preserves us-ending words (campus, status)', () => {
    const claim: EventClaim = {
      type: 'venue',
      severity: 'critical',
      canonicalValue: 'Campus Drive',
    };
    const result = verifyClaims([claim], 'Located on Campus Drive');
    expect(result.claimsVerified['venue']!.status).toBe('supported');
  });

  it('strips plural s from long words (festivals -> festival)', () => {
    const claim: EventClaim = {
      type: 'name',
      severity: 'critical',
      canonicalValue: 'Spring Festivals',
    };
    const result = verifyClaims([claim], 'Spring Festival is coming to town');
    expect(result.claimsVerified['name']!.status).toBe('supported');
  });

  it('handles possessive in source text (Asheville\'s)', () => {
    const claim: EventClaim = {
      type: 'venue',
      severity: 'critical',
      canonicalValue: 'Asheville Mall',
    };
    const result = verifyClaims([claim], "Asheville's Mall is hosting a food truck rally");
    expect(result.claimsVerified['venue']!.status).toBe('supported');
  });

  it('supports email claim with case-insensitive matching', () => {
    const claim: EventClaim = {
      type: 'email',
      severity: 'major',
      canonicalValue: 'samplemarket@gmail.com',
      matchPatterns: ['samplemarket@gmail.com'],
    };
    const result = verifyClaim(claim, 'Contact SAMPLEMARKET@GMAIL.COM for questions');
    expect(result.status).toBe('supported');
    expect(result.score).toBe(1);
  });

  it('supports email claim when exact match found', () => {
    const claim: EventClaim = {
      type: 'email',
      severity: 'major',
      canonicalValue: 'samplecraftfair@hotmail.com',
      matchPatterns: ['samplecraftfair@hotmail.com'],
    };
    const result = verifyClaim(claim, 'Email samplecraftfair@hotmail.com for vendor spots');
    expect(result.status).toBe('supported');
  });

  it('not_mentioned when email not in text', () => {
    const claim: EventClaim = {
      type: 'email',
      severity: 'major',
      canonicalValue: 'vendor@event.com',
      matchPatterns: ['vendor@event.com'],
    };
    const result = verifyClaim(claim, 'Contact us via our website for more info');
    expect(result.status).toBe('not_mentioned');
    expect(result.score).toBe(0);
  });
});
