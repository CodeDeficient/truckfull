import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readConfig(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('production container public exposure', () => {
  const config = readConfig('wrangler.container-production.jsonc');

  it('does not publish the production container on workers.dev', () => {
    expect(config).toContain('"workers_dev": false');
    expect(config).not.toContain('"workers_dev": true');
  });

  it('keeps both public hostnames attached as custom domains', () => {
    expect(config).toContain('{ "pattern": "truckfull.food", "custom_domain": true }');
    expect(config).toContain('{ "pattern": "www.truckfull.food", "custom_domain": true }');
  });
});
