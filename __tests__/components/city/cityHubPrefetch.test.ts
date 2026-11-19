import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('city directory links', () => {
  it('do not prefetch the hundreds of city pages listed on /trucks', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/city/CityHub.tsx'), 'utf8');
    const links = source.match(/<Link\b[^>]*>/g) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toContain('prefetch={false}');
  });
});
