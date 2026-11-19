import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Wiring guard for issue #1392.
 *
 * `resolveSiteUrl` exists so deletion links are derived from the canonical
 * `NEXT_PUBLIC_APP_URL` origin. The helper's own precedence is covered by
 * `siteUrl.test.ts`; this suite proves the two routes actually call the helper
 * and have not regressed to reading `NEXT_PUBLIC_SITE_URL` (or a hardcoded apex
 * origin) directly. It is a static source assertion — no route behavior, no
 * mocks.
 */

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

const routePaths = [
  'app/api/account/delete/route.ts',
  'app/api/facebook/deletion/route.ts',
] as const;

describe.each(routePaths)('%s site-url wiring', (routePath) => {
  const source = readSource(routePath);

  it('imports resolveSiteUrl from the helper module', () => {
    expect(source).toMatch(
      /import\s+\{[^}]*\bresolveSiteUrl\b[^}]*\}\s+from\s+['"]@\/lib\/utils\/siteUrl['"]/,
    );
  });

  it('derives the origin through resolveSiteUrl(process.env)', () => {
    expect(source).toMatch(/resolveSiteUrl\(\s*process\.env\s*\)/);
  });

  it('no longer reads NEXT_PUBLIC_SITE_URL directly', () => {
    expect(source).not.toMatch(/process\.env\.NEXT_PUBLIC_SITE_URL/);
  });

  it('no longer hardcodes the apex origin fallback', () => {
    expect(source).not.toMatch(/https:\/\/truckfull\.food/);
  });
});
