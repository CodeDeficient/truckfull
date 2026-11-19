import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RATE_LIMIT_TIMEOUT_MS } from '../../../lib/middleware/rateLimitDecision';

const LIMITER_MODULES = ['lib/middleware/rateLimit.ts', 'lib/middleware/signupRateLimit.ts'];

describe('Upstash rate limiter time limit', () => {
  it('waits far less than the library default of five seconds', () => {
    expect(RATE_LIMIT_TIMEOUT_MS).toBeLessThanOrEqual(1000);
  });

  it.each(LIMITER_MODULES)('%s gives every limiter the short time limit', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    const limiters = source.split('new Ratelimit({').slice(1);
    expect(limiters.length).toBeGreaterThan(0);
    for (const limiter of limiters) {
      expect(limiter.slice(0, limiter.indexOf('})'))).toContain('timeout: RATE_LIMIT_TIMEOUT_MS');
    }
  });
});
