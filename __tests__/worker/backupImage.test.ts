import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

describe('backup container image', () => {
  it('copies every application source file imported by the container entrypoint', async () => {
    const dockerfile = readFileSync('containers/backup/Dockerfile', 'utf8');
    const copied = [...dockerfile.matchAll(/^COPY (\S+) \S+$/gm)].map((match) => match[1]);
    const result = await build({
      entryPoints: ['containers/backup/server.ts'],
      bundle: true,
      packages: 'external',
      platform: 'node',
      format: 'esm',
      metafile: true,
      write: false,
    });

    const omitted = Object.keys(result.metafile!.inputs).filter(
      (source) => !copied.some((path) => source === path || source.startsWith(`${path}/`)),
    );
    expect(omitted).toEqual([]);
  });

  it('installs the PostgreSQL 17 client used to dump the production database', () => {
    const dockerfile = readFileSync('containers/backup/Dockerfile', 'utf8');
    expect(dockerfile).toContain('postgresql-client-17');
    expect(dockerfile).toContain('apt.postgresql.org');
  });

  it('runs a bundled application entrypoint in the container', () => {
    const dockerfile = readFileSync('containers/backup/Dockerfile', 'utf8');
    expect(dockerfile).toContain('--bundle --platform=node --format=esm --packages=external');
    expect(dockerfile).toContain('CMD ["node", "--import", "tsx", "server.mjs"]');
  });

  it('keeps the weekly schedule behind the existing GitHub backup cadence', () => {
    const config = readFileSync('wrangler.backup-production.jsonc', 'utf8');
    expect(config).toContain('"0 1 * * SUN"');
    expect(config).not.toContain('"0 1 * * 0"');
    expect(config).toContain('"BACKUP_ENABLED": "false"');
    expect(config).toContain('"bucket_name": "example-backups"');
  });
});
