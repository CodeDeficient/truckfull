import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

describe('pipeline container image', () => {
  it('copies every application source file imported by the container entrypoint', async () => {
    const dockerfile = readFileSync('containers/pipeline/Dockerfile', 'utf8');
    const copied = [...dockerfile.matchAll(/^COPY (\S+) \S+$/gm)].map((match) => match[1]);
    const result = await build({
      entryPoints: ['containers/pipeline/server.ts'],
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

  it('runs a bundled application entrypoint in the container', () => {
    const dockerfile = readFileSync('containers/pipeline/Dockerfile', 'utf8');
    expect(dockerfile).toContain('--bundle --platform=node --format=esm --packages=external');
    expect(dockerfile).toContain('CMD ["node", "--import", "tsx", "server.mjs"]');
  });
});
