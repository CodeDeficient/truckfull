import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isMobileMirrorRoute, MOBILE_MIRROR_GROUP } from '@/lib/utils/mobileSlotRouting';

const MOBILE_ROOT = join(process.cwd(), 'app', '@mobile');
const MIRROR_ROOT = join(MOBILE_ROOT, MOBILE_MIRROR_GROUP);
const DESKTOP_PAGE_REEXPORT = /export \{[^}]*\bdefault\b[^}]*\} from ['"](?:\.\.\/|@\/app\/)(?!@mobile)/;

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pageFiles(path);
    return name === 'page.tsx' ? [path] : [];
  });
}

describe('mobile mirror routes', () => {
  it('renders nothing of their own in the mobile slot', () => {
    const mirrors = pageFiles(MIRROR_ROOT);
    expect(mirrors.length).toBeGreaterThan(0);
    for (const file of mirrors) {
      expect(readFileSync(file, 'utf8')).toContain(
        "export { default } from '@/components/layout/MobileMirror';",
      );
    }
  });

  it('keeps every desktop re-export inside the mirror group', () => {
    const outside = pageFiles(MOBILE_ROOT)
      .filter((file) => !file.startsWith(MIRROR_ROOT))
      .filter((file) => DESKTOP_PAGE_REEXPORT.test(readFileSync(file, 'utf8')))
      .map((file) => relative(process.cwd(), file));
    expect(outside).toEqual([]);
  });

  it('detects the mirror group in the selected mobile segments', () => {
    expect(isMobileMirrorRoute(['(mirror)', 'trucks'])).toBe(true);
    expect(isMobileMirrorRoute(['(home)'])).toBe(false);
    expect(isMobileMirrorRoute(['favorites'])).toBe(false);
    expect(isMobileMirrorRoute([])).toBe(false);
    expect(isMobileMirrorRoute(null)).toBe(false);
  });
});
