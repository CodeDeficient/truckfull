import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Supabase Server Client Cookie Refresh', () => {
  const serverUtilsPath = path.join(process.cwd(), 'lib/supabase/utils/server.ts');
  const content = fs.readFileSync(serverUtilsPath, 'utf-8');

  describe('createClient function signature', () => {
    it('should accept optional response parameter', () => {
      const hasResponseParam =
        /export\s+function\s+createClient\s*\(\s*response\s*\?\s*:\s*NextResponse\s*\)/.test(
          content,
        );

      expect(hasResponseParam).toBe(true);
    });

    it('should import NextResponse type', () => {
      const hasNextResponseImport =
        /import\s+type\s+\{\s*[^}]*NextResponse[^}]*\}\s+from\s+['"]next\/server['"]/.test(
          content,
        ) || /import\s+\{\s*[^}]*NextResponse[^}]*\}\s+from\s+['"]next\/server['"]/.test(content);

      expect(hasNextResponseImport).toBe(true);
    });
  });

  describe('cookie handling behavior', () => {
    it('should check for response before setting cookies', () => {
      const hasResponseCheck = /if\s*\(\s*response\s*\)/.test(content);

      expect(hasResponseCheck).toBe(true);
    });

    it('should use response.cookies.set when response is provided', () => {
      const usesResponseCookies = /response\.cookies\.set\s*\(/.test(content);

      expect(usesResponseCookies).toBe(true);
    });

    it('should have fallback to cookies() when response is not provided', () => {
      const hasCookiesFallback =
        /store\s*=\s*await\s+cookies\(\)/.test(content) && /store\.set\s*\(/.test(content);

      expect(hasCookiesFallback).toBe(true);
    });
  });

  describe('API route usage pattern', () => {
    it('should be usable without response (Server Components)', () => {
      const hasOptionalParam =
        /export\s+function\s+createClient\s*\(\s*response\s*\?\s*:\s*NextResponse\s*\)/.test(
          content,
        );

      expect(hasOptionalParam).toBe(true);
    });

    it('should be usable with response (API routes)', () => {
      const responseParamExists = /response\s*\?\s*:\s*NextResponse/.test(content);

      expect(responseParamExists).toBe(true);
    });
  });
});
