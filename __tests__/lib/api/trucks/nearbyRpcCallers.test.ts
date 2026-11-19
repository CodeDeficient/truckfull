/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_DIRS = ['app', 'lib', 'components', 'hooks', 'worker'];
const SERVICE_ROLE_CALLERS = [
  'lib/api/trucks/fetchNearbyTrucks.ts',
  'lib/supabase/services/featuredContentService.ts',
];

function listSources(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSources(relative);
    return /\.(ts|tsx|mjs)$/.test(entry.name) ? [relative] : [];
  });
}

describe('find_trucks_within_radius callers', () => {
  it('only calls the radius RPC from service-role server modules', () => {
    const callers = SOURCE_DIRS.flatMap(listSources)
      .filter((file) => !/database(\.[a-z]+)?\.types/.test(file))
      .filter((file) =>
        readFileSync(path.join(ROOT, file), 'utf8').includes('find_trucks_within_radius'),
      )
      .sort();
    expect(callers).toEqual(SERVICE_ROLE_CALLERS);
  });

  it('keeps the shared nearby helper server-only', () => {
    const source = readFileSync(path.join(ROOT, SERVICE_ROLE_CALLERS[0]), 'utf8');
    expect(source.startsWith("import 'server-only';")).toBe(true);
  });
});
