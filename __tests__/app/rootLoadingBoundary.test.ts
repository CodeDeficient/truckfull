import { describe, expect, it } from '@jest/globals';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_LOADING_BOUNDARY_FILES = [
  'app/loading.js',
  'app/loading.jsx',
  'app/loading.ts',
  'app/loading.tsx',
] as const;

describe('root loading boundary', () => {
  it('does not define a root App Router loading boundary in any supported extension', () => {
    const existingBoundaries = ROOT_LOADING_BOUNDARY_FILES.filter((filePath) =>
      existsSync(resolve(process.cwd(), filePath)),
    );

    expect(existingBoundaries).toEqual([]);
  });
});
