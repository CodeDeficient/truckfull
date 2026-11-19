import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'worker', 'container.mjs'), 'utf8');

describe('container env allowlist', () => {
  it('forwards SEARXNG_PROXY_TOKEN into the Next.js container', () => {
    // lib/research/searxng.ts authenticates against the SearXNG Worker with this
    // token. If the allowlist omits it, production searches silently return 401.
    expect(source).toContain("'SEARXNG_PROXY_TOKEN'");
  });

  it('still forwards SEARXNG_URL so the client knows which endpoint to call', () => {
    expect(source).toContain("'SEARXNG_URL'");
  });

  it('does not forward the SearXNG server secret', () => {
    // The container-side SearXNG secret is only used by the SearXNG container
    // itself; the Next.js container has no reason to hold it.
    expect(source).not.toContain('SEARXNG_SECRET');
  });
});
