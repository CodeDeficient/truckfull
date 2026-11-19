import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readConfig(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('staging container public exposure', () => {
  it('does not publish the staging container on workers.dev', () => {
    const config = readConfig('wrangler.container-staging.jsonc');

    expect(config).toContain('"workers_dev": false');
    expect(config).not.toContain('"workers_dev": true');
  });

  it('attaches the staging custom domain so the app has a private entrypoint', () => {
    const config = readConfig('wrangler.container-staging.jsonc');

    expect(config).toContain('{ "pattern": "staging.example.com", "custom_domain": true }');
  });
});
