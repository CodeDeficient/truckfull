import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { HOLO_SCENE_SLUGS, holoClipPath } from '@/lib/holo/holoCities';

describe('holoClipPath', () => {
  it('points every holo city at a hover clip that exists', () => {
    const missing = HOLO_SCENE_SLUGS.filter((slug) => {
      const path = holoClipPath(slug);
      return !existsSync(join(process.cwd(), 'public', path));
    });
    expect(missing).toEqual([]);
  });

  it('falls back to the generic scene for cities without their own', () => {
    const path = holoClipPath('nowhere-zz');
    expect(path).toBe('/heroes/holo/clips/generic.webm');
    expect(existsSync(join(process.cwd(), 'public', path))).toBe(true);
  });
});
