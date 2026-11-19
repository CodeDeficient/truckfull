import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Sitemap Error Handling', () => {
  const sitemapPath = path.join(process.cwd(), 'app/sitemap.xml/route.ts');
  const content = fs.readFileSync(sitemapPath, 'utf-8');

  it('should return 500 status on database error', () => {
    const has500ErrorReturn =
      /if\s*\(\s*error\s*\)\s*\{[\s\S]*?return\s+new\s+Response\([^)]*status:\s*500/.test(content);

    expect(has500ErrorReturn).toBe(true);
  });

  it('should log error when database query fails', () => {
    const hasErrorLog = /if\s*\(\s*error\s*\)\s*\{[\s\S]*?logError/.test(content);

    expect(hasErrorLog).toBe(true);
  });

  it('should NOT continue to return 200 after error', () => {
    const errorBlockMatch = content.match(/if\s*\(\s*error\s*\)\s*\{([\s\S]*?)\}/);
    expect(errorBlockMatch).toBeTruthy();

    if (errorBlockMatch) {
      const errorBlock = errorBlockMatch[1];
      const returnsAfterError = /return\s+new\s+Response/.test(errorBlock);
      expect(returnsAfterError).toBe(true);
    }
  });
});
