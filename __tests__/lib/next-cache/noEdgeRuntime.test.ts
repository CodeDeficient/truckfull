import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SOURCE_PATTERN = /\.(ts|tsx|js|jsx|mjs)$/;
const EDGE_RUNTIME_PATTERN = /export\s+const\s+runtime\s*=\s*['"]edge['"]/;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return SOURCE_PATTERN.test(entry.name) ? [fullPath] : [];
  });
}

describe('edge runtime and the R2 cache handler', () => {
  it('keeps every app route on the Node runtime the cache handler requires', () => {
    const appDir = join(process.cwd(), 'app');
    const edgeFiles = listSourceFiles(appDir)
      .filter((file) => EDGE_RUNTIME_PATTERN.test(readFileSync(file, 'utf8')))
      .map((file) => relative(process.cwd(), file));

    expect(edgeFiles).toEqual([]);
  });
});
