import {
  getLimiterForPath,
  getRetryAfterSeconds,
  standardLimiter,
  bulkListLimiter,
  locationLimiter,
  geocodeLimiter,
  detailLimiter,
  fallbackLimiter,
  waitlistSubmissionLimiter,
} from '@/lib/middleware/rateLimit';

describe('getRetryAfterSeconds', () => {
  const now = 1_700_000_000_000;

  it('returns whole seconds remaining until reset', () => {
    expect(getRetryAfterSeconds(now + 3_000, now)).toBe(3);
  });

  it('rounds fractional remaining time up', () => {
    expect(getRetryAfterSeconds(now + 1_500, now)).toBe(2);
  });

  it('clamps to a minimum of 1 when the reset has already elapsed', () => {
    expect(getRetryAfterSeconds(now, now)).toBe(1);
    expect(getRetryAfterSeconds(now - 5_000, now)).toBe(1);
  });

  it('returns a positive value for a reset exactly one second away', () => {
    expect(getRetryAfterSeconds(now + 1_000, now)).toBe(1);
  });
});

describe('rateLimit pure functions', () => {
  describe('getLimiterForPath', () => {
    it('returns geocodeLimiter for /api/geocode paths', () => {
      const result = getLimiterForPath('/api/geocode/test');
      expect(result).toBe(geocodeLimiter);
    });

    it('returns bulkListLimiter for the public truck list', () => {
      expect(getLimiterForPath('/api/trucks/public')).toBe(bulkListLimiter);
    });

    it('returns locationLimiter for /api/trucks/nearby', () => {
      const result = getLimiterForPath('/api/trucks/nearby');
      expect(result).toBe(locationLimiter);
    });

    it('returns detailLimiter for single truck detail paths', () => {
      const result = getLimiterForPath('/api/trucks/123');
      expect(result).toBe(detailLimiter);
    });

    it('returns detailLimiter for /api/trucks/[id] pattern', () => {
      const result = getLimiterForPath('/api/trucks/abc-123-def');
      expect(result).toBe(detailLimiter);
    });

    it('does not match nearby paths with detailLimiter', () => {
      const result = getLimiterForPath('/api/trucks/nearby');
      expect(result).toBe(locationLimiter);
    });

    it('returns standardLimiter for /api/trucks paths', () => {
      const result = getLimiterForPath('/api/trucks');
      expect(result).toBe(standardLimiter);
    });

    it('returns the strict waitlistSubmissionLimiter for /api/events/waitlist', () => {
      const result = getLimiterForPath('/api/events/waitlist');
      expect(result).toBe(waitlistSubmissionLimiter);
    });

    it('returns standardLimiter for /api/search paths', () => {
      const result = getLimiterForPath('/api/search');
      expect(result).toBe(standardLimiter);
    });

    it('returns fallbackLimiter for unknown paths', () => {
      const result = getLimiterForPath('/api/unknown');
      expect(result).toBe(fallbackLimiter);
    });

    it('returns fallbackLimiter for non-api paths', () => {
      const result = getLimiterForPath('/some/route');
      expect(result).toBe(fallbackLimiter);
    });
  });
});
