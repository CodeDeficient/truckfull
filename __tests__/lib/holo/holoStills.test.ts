import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { HOLO_SCENE_SLUGS, holoStillPath } from '@/lib/holo/holoCities';

describe('holoStillPath', () => {
  it('points every holo city at a still image that exists', () => {
    const missing = HOLO_SCENE_SLUGS.filter((slug) => {
      const path = holoStillPath(slug);
      return !existsSync(join(process.cwd(), 'public', path));
    });
    expect(missing).toEqual([]);
  });

  it('falls back to the generic scene for cities without their own', () => {
    const path = holoStillPath('nowhere-zz');
    expect(path).toBe('/heroes/holo/generic.webp');
    expect(existsSync(join(process.cwd(), 'public', path))).toBe(true);
  });
});
