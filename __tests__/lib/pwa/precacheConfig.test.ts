import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { getFileManifestEntries } from '@serwist/build';
import { PRECACHE_GLOB_PATTERNS } from '@/lib/pwa/precacheConfig';

const FIXTURE_FILES = [
  '.next/static/css/app.css',
  '.next/static/chunks/route-a.js',
  '.next/static/media/hero.webp',
  'public/field-guide-demo.mp4',
  'public/heroes/holo/clips/city.webm',
  'public/pins/README.md',
  'public/0123456789abcdef.txt',
  'public/pwa-icon-512.png',
];

describe('service worker precache list', () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'precache-'));
    for (const file of FIXTURE_FILES) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), 'x');
    }
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('precaches only stylesheets from the build output', async () => {
    const { manifestEntries } = await getFileManifestEntries({
      globDirectory: root,
      globPatterns: [...PRECACHE_GLOB_PATTERNS],
    });

    const urls = (manifestEntries ?? []).map((entry) => (typeof entry === 'string' ? entry : entry.url));
    expect(urls).toEqual(['.next/static/css/app.css']);
  });
});
