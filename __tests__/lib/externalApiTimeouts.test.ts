import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXTERNAL_API_TIMEOUT_MS } from '../../lib/supabase/fetchWithTimeout';

const EXTERNAL_CALLERS = [
  'lib/facebook/graphApi.ts',
  'lib/facebook/pageSubscriptions.ts',
  'lib/monitoring/slackClient.ts',
  'lib/services/facebookMenuService.ts',
  'app/api/owner/facebook/connect-page/route.ts',
  'app/api/owner/facebook/oauth/callback/route.ts',
  'app/api/owner/facebook/pages/route.ts',
];

describe('external API calls on request paths', () => {
  it('use a limit short enough to free the request', () => {
    expect(EXTERNAL_API_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });

  it.each(EXTERNAL_CALLERS)('%s gives every call a time limit', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    const calls = source.split('await fetch(').slice(1);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.slice(0, call.indexOf(');'))).toContain(
        'signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS)',
      );
    }
  });
});
