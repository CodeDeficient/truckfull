import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Event Documents Signed URL Expiry', () => {
  const routePath = path.join(process.cwd(), 'app/api/organizer/events/[id]/documents/route.ts');
  const content = fs.readFileSync(routePath, 'utf-8');

  it('POST handler should store file path (fileName) instead of signed URL', () => {
    const postHandler = content.match(/export\s+async\s+function\s+POST[\s\S]*?^\}/m);
    expect(postHandler).toBeTruthy();

    if (postHandler) {
      const handlerContent = postHandler[0];
      const storesFilePath = /file_url:\s*fileName/.test(handlerContent);
      const storesSignedUrl = /file_url:\s*urlData\.signedUrl/.test(handlerContent);

      expect(storesFilePath).toBe(true);
      expect(storesSignedUrl).toBe(false);
    }
  });

  it('GET handler should generate fresh signed URLs for each document', () => {
    const getHandler = content.match(/export\s+async\s+function\s+GET[\s\S]*?^\}/m);
    expect(getHandler).toBeTruthy();

    if (getHandler) {
      const handlerContent = getHandler[0];
      const generatesSignedUrls = /createSignedUrl\(\s*doc\.file_url\s*,\s*60\s*\*\s*60\s*\)/.test(
        handlerContent,
      );

      expect(generatesSignedUrls).toBe(true);
    }
  });

  it('GET handler should use 1 hour expiry for signed URLs', () => {
    const getHandler = content.match(/export\s+async\s+function\s+GET[\s\S]*?^\}/m);
    expect(getHandler).toBeTruthy();

    if (getHandler) {
      const handlerContent = getHandler[0];
      const usesOneHour = /60\s*\*\s*60/.test(handlerContent);

      expect(usesOneHour).toBe(true);
    }
  });

  it('POST handler should NOT use 1 year expiry for signed URL storage', () => {
    const postHandler = content.match(/export\s+async\s+function\s+POST[\s\S]*?^\}/m);
    expect(postHandler).toBeTruthy();

    if (postHandler) {
      const handlerContent = postHandler[0];
      const usesOneYear = /60\s*\*\s*60\s*\*\s*24\s*\*\s*365/.test(handlerContent);

      expect(usesOneYear).toBe(false);
    }
  });
});
